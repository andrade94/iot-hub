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
        if ($request->filled('model')) {
            $query->where('model', $request->input('model'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('dev_eui', 'like', "%{$search}%")->orWhere('model', 'like', "%{$search}%"));
        }

        // Sort
        $sortBy = $request->input('sort', 'name');
        if ($sortBy === 'battery') {
            $query->orderBy('battery_pct');
        } elseif ($sortBy === 'status') {
            $query->orderByRaw("CASE WHEN last_reading_at > NOW() - INTERVAL '15 minutes' THEN 0 ELSE 1 END");
        } else {
            $query->orderBy('name');
        }

        $devices = $query->paginate(25)->withQueryString();

        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);
        $models = \App\Models\SensorModel::active()->orderBy('name')->pluck('name');

        return Inertia::render('devices/index', [
            'devices' => $devices,
            'sites' => $sites,
            'models' => $models,
            'filters' => $request->only(['status', 'site_id', 'model', 'search', 'sort']),
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

        // Alert rules that affect this device
        $alertRules = \App\Models\AlertRule::where('site_id', $device->site_id)
            ->where(fn ($q) => $q->whereNull('device_id')->orWhere('device_id', $device->id))
            ->active()
            ->get(['id', 'name', 'severity', 'active', 'conditions']);

        // Work orders linked to this device
        $workOrders = \App\Models\WorkOrder::where('device_id', $device->id)
            ->latest()
            ->limit(5)
            ->get(['id', 'title', 'status', 'priority', 'created_at']);

        // Metric units
        $metricUnits = [
            'temperature' => '°C', 'humidity' => '%', 'co2' => 'ppm', 'current' => 'A',
            'door_status' => '', 'battery_pct' => '%', 'gas_level' => '', 'distance' => 'mm',
            'pressure' => 'bar', 'people_count' => '', 'pm2_5' => 'µg/m³', 'power' => 'W',
        ];

        // Gateways and recipes for edit dialog
        $gateways = $device->site->gateways()->select('id', 'model', 'serial')->get();
        $recipes = \App\Models\Recipe::where('sensor_model', $device->model)->get(['id', 'name']);
        $zones = $device->site->devices()->distinct()->whereNotNull('zone')->where('zone', '!=', '')->pluck('zone');

        return Inertia::render('devices/show', [
            'device' => $device,
            'chartData' => $chartData,
            'latestReadings' => $latestReadings,
            'alerts' => $alerts,
            'alertRules' => $alertRules,
            'workOrders' => $workOrders,
            'availableMetrics' => $availableMetrics,
            'metricUnits' => $metricUnits,
            'period' => $period,
            'metric' => $metric,
            'gateways' => $gateways,
            'recipes' => $recipes,
            'zones' => $zones,
        ]);
    }
}
