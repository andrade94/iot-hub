<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\AlertNotification;
use App\Models\Device;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\OutageDeclaration;
use App\Models\Site;
use App\Models\Subscription;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Activitylog\Models\Activity;

class CommandCenterController extends Controller
{
    public function index()
    {
        $organizations = Organization::withCount('sites')->get();

        // Preload per-org metrics via efficient queries
        $orgIds = $organizations->pluck('id');
        $sitesByOrg = Site::whereIn('org_id', $orgIds)->get()->groupBy('org_id');

        $deviceCountsByOrg = [];
        $onlineCountsByOrg = [];
        $alertCountsByOrg = [];

        foreach ($sitesByOrg as $orgId => $sites) {
            $siteIds = $sites->pluck('id');
            $deviceCountsByOrg[$orgId] = Device::whereIn('site_id', $siteIds)->count();
            $onlineCountsByOrg[$orgId] = Device::whereIn('site_id', $siteIds)->online()->count();
            $alertCountsByOrg[$orgId] = Alert::whereIn('site_id', $siteIds)->unresolved()->count();
        }

        $totalSites = Site::count();
        $totalDevices = Device::count();
        $onlineDevices = Device::online()->count();
        $offlineDevices = Device::offline()->count();
        $activeAlerts = Alert::unresolved()->count();
        $openWorkOrders = WorkOrder::open()->count();

        return Inertia::render('command-center/index', [
            'organizations' => $organizations->map(fn ($org) => [
                'id' => $org->id,
                'name' => $org->name,
                'slug' => $org->slug,
                'segment' => $org->segment,
                'plan' => $org->plan ?? 'standard',
                'site_count' => $org->sites_count,
                'device_count' => $deviceCountsByOrg[$org->id] ?? 0,
                'online_count' => $onlineCountsByOrg[$org->id] ?? 0,
                'active_alerts' => $alertCountsByOrg[$org->id] ?? 0,
            ]),
            'kpis' => [
                'total_organizations' => $organizations->count(),
                'total_sites' => $totalSites,
                'total_devices' => $totalDevices,
                'online_devices' => $onlineDevices,
                'active_alerts' => $activeAlerts,
                'open_work_orders' => $openWorkOrders,
            ],
            'deliveryHealth' => $this->getDeliveryHealth(),
        ]);
    }

    /**
     * Get alert delivery health metrics (24h) for Command Center (BR-094-095).
     */
    private function getDeliveryHealth(): array
    {
        $since = now()->subDay();

        $channels = ['whatsapp', 'push', 'email'];
        $health = [];

        foreach ($channels as $channel) {
            $query = AlertNotification::where('channel', $channel)->where('created_at', '>=', $since);
            $health[$channel] = [
                'sent' => (clone $query)->where('status', 'sent')->count(),
                'delivered' => (clone $query)->where('status', 'delivered')->count(),
                'failed' => (clone $query)->where('status', 'failed')->count(),
            ];
        }

        return $health;
    }

    public function alerts()
    {
        $alerts = Alert::with(['device', 'site', 'rule'])
            ->unresolved()
            ->latest('triggered_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('command-center/alerts', [
            'alerts' => $alerts,
        ]);
    }

    public function workOrders()
    {
        $workOrders = WorkOrder::with(['site', 'device', 'assignedTo', 'createdBy'])
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('command-center/work-orders', [
            'workOrders' => $workOrders,
        ]);
    }

    public function devices()
    {
        $devices = Device::with(['site', 'gateway'])
            ->latest('last_reading_at')
            ->paginate(20)
            ->withQueryString();

        $stats = [
            'total' => Device::count(),
            'online' => Device::online()->count(),
            'offline' => Device::offline()->count(),
            'low_battery' => Device::lowBattery()->count(),
        ];

        return Inertia::render('command-center/devices', [
            'devices' => $devices,
            'stats' => $stats,
        ]);
    }

    public function dispatch()
    {
        $sites = Site::withCount(['devices', 'workOrders' => fn ($q) => $q->whereIn('status', ['open', 'assigned', 'in_progress'])])
            ->get()
            ->map(fn ($site) => [
                'id' => $site->id,
                'name' => $site->name,
                'latitude' => $site->latitude,
                'longitude' => $site->longitude,
                'open_work_orders' => $site->work_orders_count,
            ]);

        $workOrders = WorkOrder::with('site:id,name')
            ->whereIn('status', ['open', 'assigned', 'in_progress'])
            ->latest()
            ->get()
            ->map(fn ($wo) => [
                'id' => $wo->id,
                'title' => $wo->title,
                'priority' => $wo->priority,
                'site_id' => $wo->site_id,
                'assigned_to' => $wo->assigned_to,
                'type' => $wo->type,
                'site' => $wo->site ? ['name' => $wo->site->name] : null,
            ]);

        $technicians = User::role('technician')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('command-center/dispatch', [
            'sites' => $sites,
            'workOrders' => $workOrders,
            'technicians' => $technicians,
        ]);
    }

    public function revenue()
    {
        // 1. MRR by segment
        $orgsBySegment = Organization::withCount('sites')
            ->with(['subscriptions' => fn ($q) => $q->where('status', 'active')])
            ->get()
            ->groupBy('segment');

        $mrrBySegment = $orgsBySegment->map(function ($orgs, $segment) {
            $totalMrr = $orgs->sum(fn ($org) => $org->subscriptions->sum(fn ($sub) => $sub->calculateMonthlyTotal())
            );

            return [
                'segment' => $segment,
                'org_count' => $orgs->count(),
                'mrr' => round($totalMrr, 2),
            ];
        })->values();

        // 2. MRR by org (top 10)
        $mrrByOrg = Organization::with(['subscriptions' => fn ($q) => $q->where('status', 'active')])
            ->get()
            ->map(fn ($org) => [
                'id' => $org->id,
                'name' => $org->name,
                'segment' => $org->segment,
                'mrr' => round($org->subscriptions->sum(fn ($sub) => $sub->calculateMonthlyTotal()), 2),
            ])
            ->sortByDesc('mrr')
            ->take(10)
            ->values();

        // 3. Invoice history (last 12 months for growth chart)
        $invoiceHistory = Invoice::where('status', '!=', 'cancelled')
            ->where('created_at', '>=', now()->subMonths(12))
            ->selectRaw("strftime('%Y-%m', created_at) as month, SUM(total) as total, COUNT(*) as count")
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // 4. Total MRR
        $totalMrr = Subscription::where('status', 'active')
            ->get()
            ->sum(fn ($sub) => $sub->calculateMonthlyTotal());

        // 5. Collection rate (paid invoices / total invoices for current period)
        $currentPeriod = now()->format('Y-m');
        $totalInvoices = Invoice::where('period', $currentPeriod)->count();
        $paidInvoices = Invoice::where('period', $currentPeriod)->where('status', 'paid')->count();
        $collectionRate = $totalInvoices > 0 ? round(($paidInvoices / $totalInvoices) * 100) : 0;

        // 6. Overdue invoices
        $overdueCount = Invoice::where('status', 'overdue')->count();

        return Inertia::render('command-center/revenue', [
            'mrrBySegment' => $mrrBySegment,
            'mrrByOrg' => $mrrByOrg,
            'invoiceHistory' => $invoiceHistory,
            'kpis' => [
                'total_mrr' => round($totalMrr, 2),
                'active_subscriptions' => Subscription::where('status', 'active')->count(),
                'collection_rate' => $collectionRate,
                'overdue_invoices' => $overdueCount,
            ],
        ]);
    }

    public function show(Organization $organization)
    {
        $organization->load(['sites.devices', 'users']);

        $sites = $organization->sites->map(fn ($site) => [
            'id' => $site->id,
            'name' => $site->name,
            'status' => $site->status,
            'device_count' => $site->devices->count(),
            'online_count' => $site->devices->filter(fn ($d) => $d->isOnline())->count(),
            'active_alerts' => $site->alerts()->unresolved()->count(),
        ]);

        $recentAlerts = Alert::whereIn('site_id', $organization->sites->pluck('id'))
            ->with(['device', 'site'])
            ->latest('triggered_at')
            ->take(20)
            ->get();

        $recentActivity = Activity::where('properties->org_id', $organization->id)
            ->latest()
            ->take(20)
            ->get();

        // MRR for this org
        $mrr = Subscription::where('org_id', $organization->id)
            ->where('status', 'active')
            ->get()
            ->sum(fn ($sub) => $sub->calculateMonthlyTotal());

        return Inertia::render('command-center/show', [
            'organization' => $organization,
            'sites' => $sites,
            'recentAlerts' => $recentAlerts,
            'recentActivity' => $recentActivity,
            'mrr' => round($mrr, 2),
        ]);
    }

    /**
     * Declare upstream outage — suppresses all offline alerts platform-wide (BR-080).
     */
    public function declareOutage(Request $request)
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:5|max:500',
            'affected_services' => 'required|array|min:1',
            'affected_services.*' => 'string|in:chirpstack,twilio,mqtt,redis,database,other',
        ]);

        OutageDeclaration::create([
            ...$validated,
            'status' => 'active',
            'declared_by' => $request->user()->id,
            'declared_at' => now(),
        ]);

        return back()->with('success', 'Outage declared. All offline alerts suppressed platform-wide.');
    }

    /**
     * Resolve active outage — resume normal monitoring (BR-081).
     */
    public function resolveOutage(Request $request)
    {
        $outage = OutageDeclaration::where('status', 'active')->firstOrFail();
        $outage->resolve($request->user()->id);

        return back()->with('success', 'Outage resolved. Normal monitoring resumed.');
    }
}
