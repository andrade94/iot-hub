<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Services\Readings\ChartDataService;
use App\Services\Readings\ReadingQueryService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeviceDetailController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $siteIds = $user->hasRole('super_admin')
            ? null
            : $user->accessibleSites()->pluck('id');

        $query = Device::with(['site', 'gateway'])
            ->when($siteIds, fn ($q) => $q->whereIn('site_id', $siteIds));

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('site_id')) {
            $query->where('site_id', $request->input('site_id'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('dev_eui', 'like', "%{$search}%")->orWhere('model', 'like', "%{$search}%"));
        }

        $devices = $query->latest()->paginate(25)->withQueryString();

        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        return Inertia::render('devices/index', [
            'devices' => $devices,
            'sites' => $sites,
            'filters' => $request->only(['status', 'site_id', 'search']),
        ]);
    }

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
