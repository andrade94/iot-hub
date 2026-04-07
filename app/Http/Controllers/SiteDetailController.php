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
                'devices as online_count' => fn ($q) => $q->where('status', 'active')->where('last_reading_at', '>=', now()->subMinutes(15)),
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
            ->get();

        // Floor plans with devices filtered by floor_id
        $floorPlans = $site->floorPlans->map(function ($fp) use ($site) {
            $floorDevices = $site->devices
                ->filter(fn ($d) => $d->floor_id === $fp->id && $d->floor_x !== null && $d->floor_y !== null)
                ->values();

            return array_merge($fp->toArray(), [
                'devices' => $floorDevices,
            ]);
        });

        $user = $request->user();

        // Feature 3: Open work orders for this site
        $myRequests = WorkOrder::where('site_id', $site->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->latest()
            ->limit(5)
            ->get();

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

        $timezones = \DateTimeZone::listIdentifiers(\DateTimeZone::AMERICA);

        // Compliance summary — temperature excursions in last 24h
        $tempExcursions24h = $site->alerts()
            ->where('triggered_at', '>=', now()->subHours(24))
            ->whereJsonContains('data->metric', 'temperature')
            ->count();

        // Setup tab configuration counts
        $configCounts = [
            'alert_rules' => \App\Models\AlertRule::where('site_id', $site->id)->count(),
            'escalation_chains' => $site->escalationChains()->count(),
            'report_schedules' => \App\Models\ReportSchedule::where('site_id', $site->id)->count(),
            'maintenance_windows' => \App\Models\MaintenanceWindow::where('site_id', $site->id)->count(),
        ];

        return Inertia::render('sites/show', [
            'site' => $site,
            'kpis' => $kpis,
            'zones' => $zones,
            'activeAlerts' => $activeAlerts,
            'floorPlans' => $floorPlans,
            'myRequests' => $myRequests,
            'onboardingChecklist' => $onboardingChecklist,
            'timezones' => $timezones,
            'configCounts' => $configCounts,
            'tempExcursions24h' => $tempExcursions24h,
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

        // Devices not in this zone (for "assign to zone" feature)
        $availableDevices = $site->devices()
            ->where(function ($q) use ($zone) {
                $q->whereNull('zone')
                    ->orWhere('zone', '')
                    ->orWhere('zone', '!=', $zone);
            })
            ->select('id', 'name', 'model', 'zone')
            ->get();

        return Inertia::render('sites/zone', [
            'site' => $site,
            'zone' => $zone,
            'devices' => $devices,
            'summary' => $summary,
            'alerts' => $alerts,
            'availableDevices' => $availableDevices,
        ]);
    }
}
