<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Services\Readings\ChartDataService;
use App\Services\Readings\ReadingQueryService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeviceDetailController extends Controller
{
    public function show(
        Request $request,
        Device $device,
        ChartDataService $chartService,
        ReadingQueryService $queryService,
    ) {
        $device->load(['site', 'gateway', 'recipe', 'floorPlan']);

        $period = $request->input('period', '24h');
        $metric = $request->input('metric', 'temperature');

        $chartData = $chartService->getTimeSeriesData($device->id, $metric, $period);
        $latestReadings = $queryService->getLatestReadings($device->id);

        $alerts = $device->alerts()
            ->latest('triggered_at')
            ->limit(10)
            ->get();

        // Available metrics for this device (from latest readings)
        $availableMetrics = $latestReadings->pluck('metric')->unique()->values();

        return Inertia::render('devices/show', [
            'device' => $device,
            'chartData' => $chartData,
            'latestReadings' => $latestReadings,
            'alerts' => $alerts,
            'availableMetrics' => $availableMetrics,
            'period' => $period,
            'metric' => $metric,
        ]);
    }
}
