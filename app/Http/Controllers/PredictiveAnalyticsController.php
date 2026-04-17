<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\DeviceAnomaly;
use App\Services\Analytics\PredictiveAnalyticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PredictiveAnalyticsController extends Controller
{
    public function __invoke(Request $request, PredictiveAnalyticsService $service)
    {
        $user = $request->user();
        $siteIds = $user->accessibleSites()->pluck('id');

        $siteFilter = $request->input('site_id');
        if ($siteFilter) {
            $siteIds = $siteIds->filter(fn ($id) => $id === (int) $siteFilter)->values();
        }

        $devices = Device::whereIn('site_id', $siteIds)
            ->where('status', 'active')
            ->with('site:id,name')
            ->get();

        // Battery predictions
        $batteryPredictions = [];
        foreach ($devices->whereNotNull('battery_pct') as $device) {
            $prediction = $service->predictBatteryLife($device);
            if (! $prediction) {
                continue;
            }

            $batteryPredictions[] = [
                'device_id' => $device->id,
                'device_name' => $device->name,
                'device_model' => $device->model,
                'site_id' => $device->site_id,
                'site_name' => $device->site?->name,
                'zone' => $device->zone,
                'current_pct' => $prediction['current_pct'],
                'estimated_days' => $prediction['estimated_days'],
                'estimated_date' => $prediction['estimated_date'],
                'confidence' => $prediction['confidence'],
                'drain_rate_per_day' => $prediction['drain_rate_per_day'],
                'urgency' => $this->classifyUrgency($prediction['estimated_days']),
            ];
        }

        usort($batteryPredictions, function ($a, $b) {
            $order = ['urgent' => 0, 'warning' => 1, 'healthy' => 2, 'unknown' => 3];
            $diff = ($order[$a['urgency']] ?? 3) - ($order[$b['urgency']] ?? 3);
            return $diff !== 0 ? $diff : (($a['estimated_days'] ?? 9999) - ($b['estimated_days'] ?? 9999));
        });

        // Degradation + drift insights
        $insights = [];

        foreach ($devices->where('model', 'CT101') as $device) {
            $result = $service->detectCompressorDegradation($device);
            if ($result && in_array($result['status'], ['degradation_detected', 'warning'])) {
                $currentAvg = collect($result['weekly_trend'])->whereNotNull('avg_amps')->last();
                $insights[] = [
                    'id' => "compressor-{$device->id}",
                    'type' => 'compressor_degradation',
                    'device_id' => $device->id,
                    'device_name' => $device->name,
                    'site_id' => $device->site_id,
                    'site_name' => $device->site?->name,
                    'severity' => $result['status'] === 'degradation_detected' ? 'high' : 'medium',
                    'title' => "Compressor degradation — {$device->name}",
                    'baseline' => $result['baseline_amps'],
                    'current' => $currentAvg['avg_amps'] ?? null,
                    'consecutive_weeks' => $result['consecutive_high_weeks'],
                    'description' => "Current draw increased above baseline ({$result['baseline_amps']}A) for {$result['consecutive_high_weeks']} consecutive weeks.",
                ];
            }
        }

        foreach ($devices->whereIn('model', ['EM300-TH', 'EM300-PT']) as $device) {
            $result = $service->detectTemperatureDrift($device);
            if ($result && in_array($result['status'], ['drift_detected', 'warning'])) {
                $latestWeek = collect($result['weekly_trend'])->whereNotNull('avg_temp')->last();
                $insights[] = [
                    'id' => "drift-{$device->id}",
                    'type' => 'temperature_drift',
                    'device_id' => $device->id,
                    'device_name' => $device->name,
                    'site_id' => $device->site_id,
                    'site_name' => $device->site?->name,
                    'severity' => $result['status'] === 'drift_detected' ? 'medium' : 'low',
                    'title' => "Temperature {$result['drift_direction']} drift — {$device->name}",
                    'baseline' => $result['baseline_temp'],
                    'current' => $latestWeek['avg_temp'] ?? null,
                    'consecutive_weeks' => $result['consecutive_drift_weeks'],
                    'drift_direction' => $result['drift_direction'] ?? 'unknown',
                    'description' => "Sensor drifting from baseline ({$result['baseline_temp']}°C) for {$result['consecutive_drift_weeks']} weeks.",
                ];
            }
        }

        // Anomalies
        $anomalies = DeviceAnomaly::whereIn('device_id', $devices->pluck('id'))
            ->with('device:id,name,model,site_id', 'device.site:id,name')
            ->orderByDesc('recorded_at')
            ->limit(20)
            ->get()
            ->map(fn (DeviceAnomaly $a) => [
                'id' => $a->id,
                'device_id' => $a->device_id,
                'device_name' => $a->device?->name,
                'site_name' => $a->device?->site?->name,
                'metric' => $a->metric,
                'value' => $a->value,
                'valid_min' => $a->valid_min,
                'valid_max' => $a->valid_max,
                'unit' => $a->unit,
                'recorded_at' => $a->recorded_at?->toIso8601String(),
            ]);

        // Stats
        $urgentCount = collect($batteryPredictions)->where('urgency', 'urgent')->count();
        $warningCount = collect($batteryPredictions)->where('urgency', 'warning')->count();
        $totalDevices = $devices->count();
        $issueDevices = min($totalDevices, $urgentCount + $warningCount + count($insights));
        $healthPct = $totalDevices > 0 ? round((($totalDevices - $issueDevices) / $totalDevices) * 100, 0) : 100;

        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        return Inertia::render('analytics/predictions', [
            'batteryPredictions' => $batteryPredictions,
            'insights' => $insights,
            'anomalies' => $anomalies,
            'stats' => [
                'urgent_count' => $urgentCount,
                'warning_count' => $warningCount,
                'degradation_count' => count($insights),
                'health_pct' => $healthPct,
                'total_devices' => $totalDevices,
                'healthy_devices' => $totalDevices - $issueDevices,
            ],
            'sites' => $sites,
            'filters' => ['site_id' => $siteFilter],
        ]);
    }

    private function classifyUrgency(?int $days): string
    {
        if ($days === null) return 'unknown';
        if ($days <= 7) return 'urgent';
        if ($days <= 30) return 'warning';
        return 'healthy';
    }
}
