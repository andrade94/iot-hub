<?php

namespace App\Services\Analytics;

use App\Models\Alert;
use App\Models\Device;
use App\Models\SensorReading;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class PredictiveAnalyticsService
{
    /**
     * Battery Life Prediction
     *
     * Linear regression on battery_pct history to predict when device hits 20%.
     * Returns estimated days until replacement needed, or null if insufficient data.
     */
    public function predictBatteryLife(Device $device): ?array
    {
        if (! $device->battery_pct) {
            return null;
        }

        // Get battery readings over last 90 days
        $readings = SensorReading::where('device_id', $device->id)
            ->where('metric', 'battery')
            ->where('time', '>=', now()->subDays(90))
            ->orderBy('time')
            ->get(['time', 'value']);

        // Need at least 7 days of data
        if ($readings->count() < 7) {
            return [
                'current_pct' => $device->battery_pct,
                'estimated_days' => null,
                'estimated_date' => null,
                'confidence' => 'insufficient_data',
                'drain_rate_per_day' => null,
            ];
        }

        // Simple linear regression: y = battery_pct, x = days since first reading
        $firstTime = Carbon::parse($readings->first()->time);
        $points = $readings->map(fn ($r) => [
            'x' => $firstTime->diffInHours(Carbon::parse($r->time)) / 24.0,
            'y' => (float) $r->value,
        ]);

        $regression = $this->linearRegression($points);

        if ($regression['slope'] >= 0) {
            // Battery not draining (charging or stable) — no prediction needed
            return [
                'current_pct' => $device->battery_pct,
                'estimated_days' => null,
                'estimated_date' => null,
                'confidence' => 'stable',
                'drain_rate_per_day' => 0,
            ];
        }

        // Project: when does y = 20 (replacement threshold)?
        $currentDay = $firstTime->diffInHours(now()) / 24.0;
        $currentProjected = $regression['slope'] * $currentDay + $regression['intercept'];
        $daysToThreshold = $regression['slope'] != 0
            ? ($currentProjected - 20) / abs($regression['slope'])
            : null;

        $daysToThreshold = $daysToThreshold !== null ? max(0, (int) round($daysToThreshold)) : null;

        return [
            'current_pct' => $device->battery_pct,
            'estimated_days' => $daysToThreshold,
            'estimated_date' => $daysToThreshold ? now()->addDays($daysToThreshold)->toDateString() : null,
            'confidence' => $regression['r_squared'] > 0.7 ? 'high' : ($regression['r_squared'] > 0.4 ? 'medium' : 'low'),
            'drain_rate_per_day' => round(abs($regression['slope']), 3),
        ];
    }

    /**
     * Compressor Degradation Detection
     *
     * Compares weekly average current (CT101) against 30-day baseline.
     * If weekly avg increases >15% for 3+ weeks → degradation alert.
     */
    public function detectCompressorDegradation(Device $device): ?array
    {
        if ($device->model !== 'CT101') {
            return null;
        }

        // Get 30-day baseline average
        $baseline = SensorReading::where('device_id', $device->id)
            ->where('metric', 'current')
            ->where('time', '>=', now()->subDays(60))
            ->where('time', '<', now()->subDays(30))
            ->avg('value');

        if (! $baseline || $baseline < 0.5) {
            return ['status' => 'insufficient_data', 'baseline_amps' => null];
        }

        // Get weekly averages for last 4 weeks
        $weeks = [];
        for ($w = 3; $w >= 0; $w--) {
            $weekStart = now()->subWeeks($w + 1);
            $weekEnd = now()->subWeeks($w);

            $avg = SensorReading::where('device_id', $device->id)
                ->where('metric', 'current')
                ->whereBetween('time', [$weekStart, $weekEnd])
                ->avg('value');

            $weeks[] = [
                'week' => 4 - $w,
                'avg_amps' => $avg ? round((float) $avg, 2) : null,
                'deviation_pct' => $avg ? round((($avg - $baseline) / $baseline) * 100, 1) : null,
            ];
        }

        // Count consecutive weeks with >15% increase
        $consecutiveHigh = 0;
        foreach ($weeks as $week) {
            if ($week['deviation_pct'] !== null && $week['deviation_pct'] > 15) {
                $consecutiveHigh++;
            } else {
                $consecutiveHigh = 0;
            }
        }

        $status = match (true) {
            $consecutiveHigh >= 3 => 'degradation_detected',
            $consecutiveHigh >= 2 => 'warning',
            default => 'normal',
        };

        return [
            'status' => $status,
            'baseline_amps' => round((float) $baseline, 2),
            'weekly_trend' => $weeks,
            'consecutive_high_weeks' => $consecutiveHigh,
        ];
    }

    /**
     * Temperature Drift Detection
     *
     * Compares 7-day rolling average against 30-day baseline.
     * If drift >0.5°C sustained over 2+ weeks → drift alert.
     */
    public function detectTemperatureDrift(Device $device): ?array
    {
        if (! in_array($device->model, ['EM300-TH', 'EM300-PT'])) {
            return null;
        }

        // 30-day baseline average
        $baseline = SensorReading::where('device_id', $device->id)
            ->where('metric', 'temperature')
            ->where('time', '>=', now()->subDays(45))
            ->where('time', '<', now()->subDays(15))
            ->avg('value');

        if ($baseline === null) {
            return ['status' => 'insufficient_data', 'baseline_temp' => null];
        }

        // Weekly averages for last 3 weeks
        $weeks = [];
        for ($w = 2; $w >= 0; $w--) {
            $weekStart = now()->subWeeks($w + 1);
            $weekEnd = now()->subWeeks($w);

            $avg = SensorReading::where('device_id', $device->id)
                ->where('metric', 'temperature')
                ->whereBetween('time', [$weekStart, $weekEnd])
                ->avg('value');

            $drift = $avg !== null ? round((float) $avg - (float) $baseline, 2) : null;
            $weeks[] = [
                'week' => 3 - $w,
                'avg_temp' => $avg ? round((float) $avg, 2) : null,
                'drift' => $drift,
            ];
        }

        // Count consecutive weeks with drift > 0.5°C
        $consecutiveDrift = 0;
        foreach ($weeks as $week) {
            if ($week['drift'] !== null && abs($week['drift']) > 0.5) {
                $consecutiveDrift++;
            } else {
                $consecutiveDrift = 0;
            }
        }

        $status = match (true) {
            $consecutiveDrift >= 2 => 'drift_detected',
            $consecutiveDrift >= 1 => 'warning',
            default => 'normal',
        };

        return [
            'status' => $status,
            'baseline_temp' => round((float) $baseline, 2),
            'weekly_trend' => $weeks,
            'consecutive_drift_weeks' => $consecutiveDrift,
            'drift_direction' => $weeks[count($weeks) - 1]['drift'] > 0 ? 'warming' : 'cooling',
        ];
    }

    /**
     * Run all predictions for a device and return a combined report.
     */
    public function analyzeDevice(Device $device): array
    {
        return [
            'device_id' => $device->id,
            'device_name' => $device->name,
            'model' => $device->model,
            'battery' => $this->predictBatteryLife($device),
            'compressor' => $this->detectCompressorDegradation($device),
            'temperature_drift' => $this->detectTemperatureDrift($device),
        ];
    }

    /**
     * Simple linear regression: returns slope, intercept, r_squared.
     */
    private function linearRegression(Collection $points): array
    {
        $n = $points->count();
        if ($n < 2) {
            return ['slope' => 0, 'intercept' => 0, 'r_squared' => 0];
        }

        $sumX = $points->sum('x');
        $sumY = $points->sum('y');
        $sumXY = $points->sum(fn ($p) => $p['x'] * $p['y']);
        $sumX2 = $points->sum(fn ($p) => $p['x'] * $p['x']);
        $sumY2 = $points->sum(fn ($p) => $p['y'] * $p['y']);

        $denominator = ($n * $sumX2 - $sumX * $sumX);
        if ($denominator == 0) {
            return ['slope' => 0, 'intercept' => $sumY / $n, 'r_squared' => 0];
        }

        $slope = ($n * $sumXY - $sumX * $sumY) / $denominator;
        $intercept = ($sumY - $slope * $sumX) / $n;

        // R-squared
        $ssTot = $sumY2 - ($sumY * $sumY) / $n;
        $ssRes = $ssTot - $slope * ($sumXY - $sumX * $sumY / $n);
        $rSquared = $ssTot != 0 ? 1 - ($ssRes / $ssTot) : 0;

        return [
            'slope' => $slope,
            'intercept' => $intercept,
            'r_squared' => max(0, $rSquared),
        ];
    }
}
