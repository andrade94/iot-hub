<?php

namespace App\Services\RulesEngine;

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\MaintenanceWindow;
use App\Models\OutageDeclaration;
use App\Services\Alerts\AlertRouter;
use App\Services\RulesEngine\DefrostDetector;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class RuleEvaluator
{
    public function __construct(
        protected AlertRouter $alertRouter,
        protected DefrostDetector $defrostDetector,
    ) {}

    /**
     * Evaluate all active rules for a device reading.
     *
     * @param  array<string, array{value: float, unit: string}>  $readings
     */
    public function evaluate(Device $device, array $readings): void
    {
        // Upstream outage suppression (BR-080): suppress ALL alert evaluation platform-wide
        if (OutageDeclaration::isActive()) {
            return;
        }

        // Maintenance window suppression (BR-073): check once per device, not per rule
        if (MaintenanceWindow::isActiveForZone($device->site_id, $device->zone, $device->site?->timezone)) {
            return;
        }

        $rules = AlertRule::active()
            ->where(function ($q) use ($device) {
                $q->where('site_id', $device->site_id)
                    ->where(function ($q2) use ($device) {
                        $q2->whereNull('device_id')
                            ->orWhere('device_id', $device->id);
                    });
            })
            ->get();

        foreach ($rules as $rule) {
            $this->evaluateRule($rule, $device, $readings);
        }
    }

    /**
     * Evaluate a single rule against new readings.
     */
    protected function evaluateRule(AlertRule $rule, Device $device, array $readings): void
    {
        $conditions = $rule->conditions;
        if (! is_array($conditions) || empty($conditions)) {
            return;
        }

        foreach ($conditions as $condition) {
            $metric = $condition['metric'] ?? null;
            if (! $metric || ! isset($readings[$metric])) {
                continue;
            }

            $value = $readings[$metric]['value'];
            $threshold = $condition['threshold'] ?? null;
            $conditionType = $condition['condition'] ?? 'above';
            $durationMinutes = $condition['duration_minutes'] ?? 0;
            $severity = $condition['severity'] ?? $rule->severity;

            $breached = $this->checkCondition($value, $conditionType, $threshold);

            // Suppress alerts during known defrost windows (cold chain)
            if ($breached && $this->defrostDetector->shouldSuppressAlert($device, $metric)) {
                Log::debug('Alert suppressed during defrost window', [
                    'device' => $device->name,
                    'metric' => $metric,
                    'value' => $value,
                ]);

                continue;
            }

            if ($breached) {
                $this->handleBreach($rule, $device, $metric, $value, $threshold, $conditionType, $durationMinutes, $severity);
            } else {
                $this->handleNormal($rule, $device, $metric);
            }
        }
    }

    /**
     * Check if a value breaches a condition.
     */
    protected function checkCondition(float $value, string $condition, ?float $threshold): bool
    {
        if ($threshold === null) {
            return false;
        }

        return match ($condition) {
            'above' => $value > $threshold,
            'below' => $value < $threshold,
            'equals' => abs($value - $threshold) < 0.001,
            default => false,
        };
    }

    /**
     * Handle a threshold breach — track duration, create alert if sustained.
     */
    protected function handleBreach(
        AlertRule $rule,
        Device $device,
        string $metric,
        float $value,
        ?float $threshold,
        string $condition,
        int $durationMinutes,
        string $severity,
    ): void {
        $stateKey = "alert_rule_state:{$rule->id}:{$device->id}:{$metric}";

        $state = $this->getState($stateKey);

        if (! $state) {
            // First breach — start tracking
            $this->setState($stateKey, [
                'first_breach_at' => now()->toIso8601String(),
                'reading_count' => 1,
                'last_value' => $value,
            ]);

            // If duration is 0, trigger immediately
            if ($durationMinutes <= 0) {
                $this->triggerAlert($rule, $device, $metric, $value, $threshold, $condition, $severity);
                $this->clearState($stateKey);
            }

            return;
        }

        // Already tracking — increment
        $state['reading_count'] = ($state['reading_count'] ?? 0) + 1;
        $state['last_value'] = $value;
        $this->setState($stateKey, $state);

        // Check if duration threshold met
        $firstBreachAt = \Carbon\Carbon::parse($state['first_breach_at']);
        $elapsed = now()->diffInMinutes($firstBreachAt);

        if ($elapsed >= $durationMinutes) {
            // Check cooldown
            if ($this->isInCooldown($rule, $device)) {
                return;
            }

            $this->triggerAlert($rule, $device, $metric, $value, $threshold, $condition, $severity);
            $this->clearState($stateKey);
            $this->setCooldown($rule, $device);
        }
    }

    /**
     * Handle a normal (non-breach) reading — may auto-resolve alerts.
     */
    protected function handleNormal(AlertRule $rule, Device $device, string $metric): void
    {
        $stateKey = "alert_rule_state:{$rule->id}:{$device->id}:{$metric}";
        $normalKey = "alert_normal_count:{$rule->id}:{$device->id}:{$metric}";

        // Clear breach tracking
        $this->clearState($stateKey);

        // Track consecutive normal readings for auto-resolve
        $normalCount = $this->incrementNormalCount($normalKey);

        if ($normalCount >= 2) {
            // Auto-resolve active alerts for this rule+device
            $activeAlerts = Alert::where('rule_id', $rule->id)
                ->where('device_id', $device->id)
                ->where('status', 'active')
                ->get();

            foreach ($activeAlerts as $alert) {
                $alert->resolve(null, 'auto');

                Log::info('Alert auto-resolved', [
                    'alert_id' => $alert->id,
                    'rule_id' => $rule->id,
                    'device_id' => $device->id,
                ]);
            }

            $this->clearState($normalKey);
        }
    }

    /**
     * Create an alert and route notifications.
     */
    protected function triggerAlert(
        AlertRule $rule,
        Device $device,
        string $metric,
        float $value,
        ?float $threshold,
        string $condition,
        string $severity,
    ): void {
        $alert = Alert::create([
            'rule_id' => $rule->id,
            'site_id' => $device->site_id,
            'device_id' => $device->id,
            'severity' => $severity,
            'status' => 'active',
            'triggered_at' => now(),
            'data' => [
                'metric' => $metric,
                'value' => $value,
                'threshold' => $threshold,
                'condition' => $condition,
                'rule_name' => $rule->name,
                'device_name' => $device->name,
                'device_model' => $device->model,
                'zone' => $device->zone,
            ],
        ]);

        Log::info('Alert triggered', [
            'alert_id' => $alert->id,
            'rule' => $rule->name,
            'device' => $device->name,
            'metric' => $metric,
            'value' => $value,
            'threshold' => $threshold,
            'severity' => $severity,
        ]);

        // Route the alert for notifications
        $this->alertRouter->route($alert);
    }

    /**
     * Check if a rule+device is in cooldown period.
     */
    protected function isInCooldown(AlertRule $rule, Device $device): bool
    {
        $key = "alert_cooldown:{$rule->id}:{$device->id}";

        try {
            return (bool) Redis::exists($key);
        } catch (\Exception $e) {
            // Fallback: check DB for recent alert
            return Alert::where('rule_id', $rule->id)
                ->where('device_id', $device->id)
                ->where('triggered_at', '>=', now()->subMinutes($rule->cooldown_minutes))
                ->exists();
        }
    }

    /**
     * Set cooldown after alert trigger.
     */
    protected function setCooldown(AlertRule $rule, Device $device): void
    {
        $key = "alert_cooldown:{$rule->id}:{$device->id}";

        try {
            Redis::setex($key, $rule->cooldown_minutes * 60, '1');
        } catch (\Exception $e) {
            // Redis unavailable — cooldown check will fallback to DB
        }
    }

    protected function getState(string $key): ?array
    {
        try {
            $data = Redis::get($key);

            return $data ? json_decode($data, true) : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    protected function setState(string $key, array $data): void
    {
        try {
            Redis::setex($key, 3600, json_encode($data));
        } catch (\Exception $e) {
            // Redis unavailable
        }
    }

    protected function clearState(string $key): void
    {
        try {
            Redis::del($key);
        } catch (\Exception $e) {
            // Redis unavailable
        }
    }

    protected function incrementNormalCount(string $key): int
    {
        try {
            $count = Redis::incr($key);
            Redis::expire($key, 3600);

            return (int) $count;
        } catch (\Exception $e) {
            return 0;
        }
    }
}
