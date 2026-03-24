<?php

namespace App\Jobs;

use App\Models\Alert;
use App\Models\Device;
use App\Services\Analytics\PredictiveAnalyticsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class RunPredictiveAnalytics implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $service = new PredictiveAnalyticsService;
        $alerts = 0;

        // Battery predictions for all active devices
        Device::where('status', 'active')
            ->whereNotNull('battery_pct')
            ->chunk(100, function ($devices) use ($service, &$alerts) {
                foreach ($devices as $device) {
                    $prediction = $service->predictBatteryLife($device);
                    if ($prediction && $prediction['estimated_days'] !== null && $prediction['estimated_days'] <= 30) {
                        $this->createPredictiveAlert($device, 'battery_prediction', $prediction['estimated_days'] <= 7 ? 'high' : 'medium', "Battery replacement needed in ~{$prediction['estimated_days']} days (currently {$prediction['current_pct']}%, draining {$prediction['drain_rate_per_day']}%/day)");
                        $alerts++;
                    }
                }
            });

        // Compressor degradation for CT101 devices
        Device::where('status', 'active')
            ->where('model', 'CT101')
            ->chunk(50, function ($devices) use ($service, &$alerts) {
                foreach ($devices as $device) {
                    $result = $service->detectCompressorDegradation($device);
                    if ($result && $result['status'] === 'degradation_detected') {
                        $this->createPredictiveAlert($device, 'compressor_degradation', 'high', "Compressor showing degradation — current draw increased >{$result['consecutive_high_weeks']} consecutive weeks above baseline ({$result['baseline_amps']}A). Schedule inspection.");
                        $alerts++;
                    }
                }
            });

        // Temperature drift for temp sensors
        Device::where('status', 'active')
            ->whereIn('model', ['EM300-TH', 'EM300-PT'])
            ->chunk(100, function ($devices) use ($service, &$alerts) {
                foreach ($devices as $device) {
                    $result = $service->detectTemperatureDrift($device);
                    if ($result && $result['status'] === 'drift_detected') {
                        $direction = $result['drift_direction'] === 'warming' ? 'warming' : 'cooling';
                        $this->createPredictiveAlert($device, 'temperature_drift', 'medium', "Temperature {$direction} drift detected — baseline {$result['baseline_temp']}°C, sustained drift over {$result['consecutive_drift_weeks']} weeks. Check seals/refrigerant.");
                        $alerts++;
                    }
                }
            });

        if ($alerts > 0) {
            Log::info("RunPredictiveAnalytics: created {$alerts} predictive alert(s)");
        }
    }

    private function createPredictiveAlert(Device $device, string $type, string $severity, string $message): void
    {
        // Dedup: don't create if same type alert exists from last 24 hours
        $exists = Alert::where('device_id', $device->id)
            ->where('status', 'active')
            ->whereJsonContains('data->type', $type)
            ->where('triggered_at', '>=', now()->subDay())
            ->exists();

        if ($exists) {
            return;
        }

        Alert::create([
            'site_id' => $device->site_id,
            'device_id' => $device->id,
            'rule_id' => null,
            'severity' => $severity,
            'status' => 'active',
            'triggered_at' => now(),
            'data' => [
                'type' => $type,
                'rule_name' => "Predictive: {$message}",
                'device_name' => $device->name,
                'zone' => $device->zone,
                'metric' => $type,
            ],
        ]);
    }
}
