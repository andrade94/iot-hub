<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Services\Readings\ChartDataService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SiteDetailController extends Controller
{
    public function show(Request $request, Site $site, ChartDataService $chartService)
    {
        $site->load(['gateways', 'devices.recipe', 'floorPlans', 'modules']);

        $kpis = $chartService->getSiteKPIs($site->id);

        // Group devices by zone
        $zones = $site->devices
            ->groupBy(fn ($d) => $d->zone ?? 'Unassigned')
            ->map(function ($devices, $zone) use ($chartService, $site) {
                $summary = $chartService->getZoneSummary($site->id, $zone === 'Unassigned' ? null : $zone);

                return [
                    'name' => $zone,
                    'devices' => $devices,
                    'summary' => $summary,
                    'device_count' => $devices->count(),
                    'online_count' => $devices->filter(fn ($d) => $d->isOnline())->count(),
                ];
            })
            ->values();

        $activeAlerts = $site->alerts()
            ->whereIn('status', ['active', 'acknowledged'])
            ->with('device')
            ->latest('triggered_at')
            ->limit(10)
            ->get();

        // Floor plans with placed devices
        $floorPlans = $site->floorPlans->map(function ($fp) use ($site) {
            $placedDevices = $site->devices
                ->filter(fn ($d) => $d->floor_x !== null && $d->floor_y !== null)
                ->values();

            return array_merge($fp->toArray(), [
                'devices' => $placedDevices,
            ]);
        });

        return Inertia::render('sites/show', [
            'site' => $site,
            'kpis' => $kpis,
            'zones' => $zones,
            'activeAlerts' => $activeAlerts,
            'floorPlans' => $floorPlans,
        ]);
    }

    public function zone(Request $request, Site $site, string $zone, ChartDataService $chartService)
    {
        $devices = $site->devices()
            ->where('zone', $zone)
            ->with(['recipe', 'gateway'])
            ->get();

        $summary = $chartService->getZoneSummary($site->id, $zone);

        $alerts = $site->alerts()
            ->whereHas('device', fn ($q) => $q->where('zone', $zone))
            ->latest('triggered_at')
            ->limit(20)
            ->get();

        return Inertia::render('sites/zone', [
            'site' => $site,
            'zone' => $zone,
            'devices' => $devices,
            'summary' => $summary,
            'alerts' => $alerts,
        ]);
    }
}
