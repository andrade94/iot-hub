<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Models\WorkOrder;
use App\Services\Readings\ChartDataService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SiteDetailController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $siteIds = $user->accessibleSites()->pluck('id');

        $sites = Site::whereIn('id', $siteIds)
            ->withCount([
                'devices',
                'devices as online_count' => fn ($q) => $q->where('status', 'active')->where('last_seen_at', '>=', now()->subMinutes(15)),
                'alerts as active_alerts_count' => fn ($q) => $q->whereIn('status', ['active', 'acknowledged']),
                'workOrders as open_work_orders_count' => fn ($q) => $q->whereNotIn('status', ['completed', 'cancelled']),
                'gateways as gateways_count',
            ])
            ->with('organization:id,name')
            ->get()
            ->map(fn ($site) => [
                'id' => $site->id,
                'name' => $site->name,
                'status' => $site->status,
                'timezone' => $site->timezone,
                'organization_name' => $site->organization?->name,
                'device_count' => $site->devices_count,
                'online_count' => $site->online_count,
                'gateway_count' => $site->gateways_count,
                'active_alerts' => $site->active_alerts_count,
                'open_work_orders' => $site->open_work_orders_count,
                'created_at' => $site->created_at?->toISOString(),
            ]);

        $timezones = \DateTimeZone::listIdentifiers(\DateTimeZone::AMERICA);

        return Inertia::render('sites/index', [
            'sites' => $sites,
            'timezones' => $timezones,
        ]);
    }

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

        $user = $request->user();

        // Feature 3: Viewer's own maintenance requests
        $myRequests = $user->hasRole('client_site_viewer')
            ? WorkOrder::where('site_id', $site->id)
                ->where('created_by', $user->id)
                ->latest()
                ->limit(5)
                ->get()
            : [];

        // Feature 4: Onboarding checklist data
        $onboardingChecklist = null;
        if ($site->status === 'active') {
            $onboardingChecklist = [
                'gateway_registered' => $site->gateways->isNotEmpty(),
                'devices_provisioned' => $site->devices->isNotEmpty(),
                'modules_activated' => $site->modules->isNotEmpty(),
                'escalation_chain_configured' => $site->escalationChains()->exists(),
                'report_schedule_configured' => \App\Models\ReportSchedule::where('site_id', $site->id)->exists(),
            ];
        }

        return Inertia::render('sites/show', [
            'site' => $site,
            'kpis' => $kpis,
            'zones' => $zones,
            'activeAlerts' => $activeAlerts,
            'floorPlans' => $floorPlans,
            'myRequests' => $myRequests,
            'onboardingChecklist' => $onboardingChecklist,
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
