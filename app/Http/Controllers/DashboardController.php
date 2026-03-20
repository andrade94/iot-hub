<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Site;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;

        // Get accessible site IDs for this user
        $siteIds = $user->accessibleSites()->pluck('id');

        // KPIs scoped to user's accessible sites
        $totalDevices = Device::whereIn('site_id', $siteIds)->count();
        $onlineDevices = Device::whereIn('site_id', $siteIds)->online()->count();
        $activeAlerts = Alert::whereIn('site_id', $siteIds)->unresolved()->count();
        $openWorkOrders = WorkOrder::whereIn('site_id', $siteIds)->open()->count();

        // Per-site stats
        $siteStats = Site::whereIn('id', $siteIds)
            ->withCount([
                'devices',
                'devices as online_devices_count' => fn ($q) => $q->online(),
            ])
            ->get()
            ->map(fn ($site) => [
                'id' => $site->id,
                'name' => $site->name,
                'status' => $site->status,
                'device_count' => $site->devices_count,
                'online_count' => $site->online_devices_count,
            ]);

        // Action cards: counts for items needing attention (BR-099, BR-100)
        $actionCards = [
            'unacknowledged_alerts' => Alert::whereIn('site_id', $siteIds)->active()->count(),
            'overdue_work_orders' => WorkOrder::whereIn('site_id', $siteIds)
                ->where('status', 'open')
                ->where('created_at', '<', now()->subDays(3))
                ->count(),
            'critical_battery' => Device::whereIn('site_id', $siteIds)
                ->where('status', 'active')
                ->whereNotNull('battery_pct')
                ->where('battery_pct', '<', 20)
                ->count(),
        ];

        return Inertia::render('dashboard', [
            'kpis' => [
                'total_devices' => $totalDevices,
                'online_devices' => $onlineDevices,
                'active_alerts' => $activeAlerts,
                'open_work_orders' => $openWorkOrders,
            ],
            'siteStats' => $siteStats,
            'actionCards' => $actionCards,
        ]);
    }
}
