<?php

namespace App\Http\Controllers;

use App\Models\CompressorBaseline;
use App\Models\Device;
use App\Models\IaqZoneScore;
use App\Models\SensorReading;
use App\Models\Site;
use App\Services\Readings\ChartDataService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ModuleDashboardController extends Controller
{
    public function iaq(Request $request, Site $site, ChartDataService $chartService)
    {
        $zones = IaqZoneScore::where('site_id', $site->id)
            ->latest('calculated_at')
            ->get()
            ->unique('zone')
            ->map(fn ($z) => [
                'zone' => $z->zone,
                'score' => $z->score,
                'co2' => $z->components['co2'] ?? 0,
                'temperature' => $z->components['temperature'] ?? 0,
                'humidity' => $z->components['humidity'] ?? 0,
                'tvoc' => $z->components['tvoc'] ?? 0,
            ])
            ->values();

        $chartData = $chartService->getIaqChartData($site->id, $request->input('period', '24h'));

        return Inertia::render('modules/iaq', [
            'site' => ['id' => $site->id, 'name' => $site->name],
            'zones' => $zones,
            'chartData' => $chartData ?? [],
        ]);
    }

    public function industrial(Request $request, Site $site, ChartDataService $chartService)
    {
        $devices = Device::where('site_id', $site->id)
            ->whereIn('model', ['CT101', 'EM310-UDL', 'DS3604'])
            ->get()
            ->map(function ($device) {
                $latestReadings = SensorReading::where('device_id', $device->id)
                    ->where('time', '>=', now()->subHours(1))
                    ->get()
                    ->groupBy('metric')
                    ->map(fn ($readings) => $readings->sortByDesc('time')->first());

                $metrics = [];
                foreach ($latestReadings as $metric => $reading) {
                    $metrics[$metric] = [
                        'value' => round($reading->value, 2),
                        'unit' => $reading->unit ?? $metric,
                    ];
                }

                if (isset($metrics['vibration'])) {
                    $v = $metrics['vibration']['value'];
                    $metrics['vibration']['status'] = $v > 10 ? 'critical' : ($v > 5 ? 'warning' : 'normal');
                }

                $baseline = CompressorBaseline::where('device_id', $device->id)->latest()->first();

                return [
                    'id' => $device->id,
                    'name' => $device->name,
                    'zone' => $device->zone,
                    'model' => $device->model,
                    'metrics' => $metrics,
                    'duty_cycle' => $baseline?->baseline_value ? round($baseline->baseline_value) : null,
                    'last_reading_at' => $device->last_reading_at?->toIso8601String(),
                ];
            });

        $compressorHealth = CompressorBaseline::whereIn('device_id', $devices->pluck('id'))
            ->with('device:id,name')
            ->latest('calculated_at')
            ->get()
            ->unique('device_id')
            ->map(fn ($b) => [
                'device_name' => $b->device?->name ?? 'Unknown',
                'duty_cycle' => round($b->baseline_value ?? 0),
                'degradation_score' => round(($b->degradation_score ?? 0) * 100),
                'status' => ($b->degradation_score ?? 0) > 0.5 ? 'critical' : (($b->degradation_score ?? 0) > 0.25 ? 'degraded' : 'healthy'),
            ])
            ->values();

        $chartData = $chartService->getIndustrialChartData($site->id, $request->input('period', '24h'));

        return Inertia::render('modules/industrial', [
            'site' => ['id' => $site->id, 'name' => $site->name],
            'devices' => $devices,
            'chartData' => $chartData ?? [],
            'compressorHealth' => $compressorHealth,
        ]);
    }
}
