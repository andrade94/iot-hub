<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardApiController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $sites = $user->accessibleSites();
        $siteIds = $sites->pluck('id');

        $totalDevices = \App\Models\Device::whereIn('site_id', $siteIds)->count();
        $onlineDevices = \App\Models\Device::whereIn('site_id', $siteIds)->online()->count();
        $activeAlerts = \App\Models\Alert::whereIn('site_id', $siteIds)->active()->count();
        $openWorkOrders = \App\Models\WorkOrder::whereIn('site_id', $siteIds)
            ->whereIn('status', ['open', 'assigned', 'in_progress'])
            ->count();

        $siteSummaries = $sites->map(function (Site $site) {
            $deviceCount = $site->devices()->count();
            $onlineCount = $site->devices()->online()->count();

            return [
                'id' => $site->id,
                'name' => $site->name,
                'address' => $site->address,
                'total_devices' => $deviceCount,
                'online_devices' => $onlineCount,
                'online_pct' => $deviceCount > 0 ? round(($onlineCount / $deviceCount) * 100) : 0,
                'active_alerts' => $site->alerts()->active()->count(),
                'open_work_orders' => $site->workOrders()->whereIn('status', ['open', 'assigned', 'in_progress'])->count(),
            ];
        });

        return response()->json([
            'data' => [
                'kpis' => [
                    'total_devices' => $totalDevices,
                    'online_devices' => $onlineDevices,
                    'online_pct' => $totalDevices > 0 ? round(($onlineDevices / $totalDevices) * 100) : 0,
                    'active_alerts' => $activeAlerts,
                    'open_work_orders' => $openWorkOrders,
                ],
                'sites' => $siteSummaries,
            ],
        ]);
    }
}
