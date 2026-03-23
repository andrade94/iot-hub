<?php

namespace App\Services\Alerts;

use App\Jobs\EscalateAlert;
use App\Jobs\SendAlertNotification;
use App\Jobs\SendBatchAlertSummary;
use App\Models\Alert;
use App\Models\EscalationChain;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class AlertRouter
{
    /**
     * Route an alert to the appropriate channels based on severity.
     */
    public function route(Alert $alert): void
    {
        // Check if we should batch this alert due to high volume
        if ($this->shouldBatchAlert($alert)) {
            $this->batchAlert($alert);

            return;
        }

        $siteId = $alert->site_id;

        // Get escalation chain for this site (new grouped model with JSON levels)
        $chain = EscalationChain::where('site_id', $siteId)->first();

        if (! $chain || empty($chain->levels)) {
            Log::warning('No escalation chain configured for site', [
                'site_id' => $siteId,
                'alert_id' => $alert->id,
            ]);

            $this->broadcastAlert($alert);

            return;
        }

        $levels = collect($chain->levels)->sortBy('level');
        $maxLevel = $levels->max('level') ?? 1;
        $targetLevels = $this->getLevelsForSeverity($alert->severity, $maxLevel);

        foreach ($levels as $level) {
            if ($level['level'] > max($targetLevels)) {
                continue;
            }

            $userIds = $level['user_ids'] ?? [];
            $channels = $level['channels'] ?? ['push'];
            $delayMinutes = $level['delay_minutes'] ?? 0;

            // Level 1 (immediate): dispatch SendAlertNotification directly
            // Higher levels (delayed): dispatch EscalateAlert job with delay
            if ($level['level'] === min($targetLevels) && $delayMinutes <= 0) {
                foreach ($userIds as $userId) {
                    if (! $this->shouldNotifyUser($userId, $alert)) {
                        continue;
                    }
                    foreach ($channels as $channel) {
                        SendAlertNotification::dispatch($alert, $userId, $channel);
                    }
                }
            } else {
                EscalateAlert::dispatch($alert, $chain, $level['level'])
                    ->delay(now()->addMinutes($delayMinutes));
            }
        }

        // Always broadcast via Reverb for live dashboard
        $this->broadcastAlert($alert);
    }

    /**
     * Determine if this alert should be batched due to high alert volume.
     *
     * Uses a 10-minute sliding window. If more than 5 alerts arrive for
     * the same organization within the window, subsequent alerts are batched.
     */
    protected function shouldBatchAlert(Alert $alert): bool
    {
        $key = "alert_batch:{$alert->site->org_id}";

        try {
            $count = Redis::incr($key);

            if ($count === 1) {
                Redis::expire($key, 600); // 10-minute window
            }

            return $count > 5;
        } catch (\Exception $e) {
            Log::debug('Redis unavailable for alert batching', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Add the alert to the batch and schedule a summary job if not already scheduled.
     */
    protected function batchAlert(Alert $alert): void
    {
        $orgId = $alert->site->org_id;
        $setKey = "alert_batch_ids:{$orgId}";
        $scheduledKey = "alert_batch_scheduled:{$orgId}";

        try {
            Redis::sadd($setKey, $alert->id);
            Redis::expire($setKey, 660); // slightly longer than the 10-minute window

            // Only schedule the summary job once per batch window
            $alreadyScheduled = Redis::set($scheduledKey, 1, 'EX', 600, 'NX');

            if ($alreadyScheduled) {
                SendBatchAlertSummary::dispatch($orgId)->delay(now()->addMinutes(10));
            }

            Log::info('Alert batched for mass event summary', [
                'alert_id' => $alert->id,
                'org_id' => $orgId,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to batch alert — falling back to individual routing', [
                'alert_id' => $alert->id,
                'error' => $e->getMessage(),
            ]);

            // Fall back to broadcasting only
            $this->broadcastAlert($alert);
        }
    }

    /**
     * Determine which escalation levels to trigger based on severity.
     */
    protected function getLevelsForSeverity(string $severity, int $maxLevel): array
    {
        return match ($severity) {
            'critical' => range(1, min($maxLevel, 3)), // All levels up to 3
            'high' => range(1, min($maxLevel, 2)),     // Levels 1-2
            'medium' => [1],                            // Level 1 only
            'low' => [1],                               // Level 1 only
            default => [1],
        };
    }

    /**
     * BR-101/BR-102: Check if a user should receive notifications for this alert.
     * Checks snooze status and quiet hours. Escalation overrides are handled by
     * EscalationService which bypasses this check.
     */
    public function shouldNotifyUser(int $userId, Alert $alert): bool
    {
        $user = User::find($userId);

        if (! $user) {
            return false;
        }

        // BR-102: Check if user has snoozed this alert
        if ($alert->isSnoozedFor($userId)) {
            return false;
        }

        // BR-101: Check quiet hours — only suppress LOW/MEDIUM
        if ($user->isInQuietHours() && in_array($alert->severity, ['low', 'medium'])) {
            return false;
        }

        return true;
    }

    /**
     * Broadcast alert via Reverb for real-time dashboard updates.
     */
    protected function broadcastAlert(Alert $alert): void
    {
        try {
            broadcast(new \App\Events\AlertTriggered($alert))->toOthers();
        } catch (\Exception $e) {
            Log::debug('Alert broadcast failed', ['error' => $e->getMessage()]);
        }
    }
}
