<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $sites = $user->accessibleSites();

        $data = $sites->map(fn (Site $site) => $this->formatSiteWithKpis($site));

        return response()->json(['data' => $data]);
    }

    public function show(Request $request, Site $site): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccessSite($site->id)) {
            abort(403, 'You do not have access to this site.');
        }

        $zones = $site->devices()
            ->whereNotNull('zone')
            ->get()
            ->groupBy('zone')
            ->map(function ($devices, $zoneName) {
                $deviceCount = $devices->count();
                $onlineCount = $devices->filter(fn (Device $d) => $d->isOnline())->count();

                return [
                    'name' => $zoneName,
                    'device_count' => $deviceCount,
                    'online_count' => $onlineCount,
                    'devices' => $devices->map(fn (Device $d) => [
                        'id' => $d->id,
                        'name' => $d->name,
                        'model' => $d->model,
                        'status' => $d->status,
                        'battery_pct' => $d->battery_pct,
                        'rssi' => $d->rssi,
                        'last_reading_at' => $d->last_reading_at?->toIso8601String(),
                        'online' => $d->isOnline(),
                    ])->values(),
                ];
            })
            ->values();

        $siteData = $this->formatSiteWithKpis($site);
        $siteData['zones'] = $zones;
        $siteData['active_alerts'] = $site->alerts()
            ->active()
            ->with('device')
            ->latest('triggered_at')
            ->limit(20)
            ->get()
            ->map(fn ($alert) => [
                'id' => $alert->id,
                'severity' => $alert->severity,
                'status' => $alert->status,
                'triggered_at' => $alert->triggered_at?->toIso8601String(),
                'device_name' => $alert->device?->name,
            ]);

        return response()->json(['data' => $siteData]);
    }

    public function zone(Request $request, Site $site, string $zone): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccessSite($site->id)) {
            abort(403, 'You do not have access to this site.');
        }

        $devices = $site->devices()
            ->where('zone', $zone)
            ->with(['gateway', 'recipe'])
            ->get();

        if ($devices->isEmpty()) {
            abort(404, 'Zone not found.');
        }

        $onlineDevices = $devices->filter(fn (Device $d) => $d->isOnline());

        return response()->json([
            'data' => [
                'zone' => $zone,
                'site' => [
                    'id' => $site->id,
                    'name' => $site->name,
                ],
                'device_count' => $devices->count(),
                'online_count' => $onlineDevices->count(),
                'devices' => $devices->map(fn (Device $d) => [
                    'id' => $d->id,
                    'name' => $d->name,
                    'model' => $d->model,
                    'dev_eui' => $d->dev_eui,
                    'status' => $d->status,
                    'battery_pct' => $d->battery_pct,
                    'rssi' => $d->rssi,
                    'last_reading_at' => $d->last_reading_at?->toIso8601String(),
                    'online' => $d->isOnline(),
                    'gateway' => $d->gateway ? [
                        'id' => $d->gateway->id,
                        'name' => $d->gateway->model,
                        'status' => $d->gateway->status,
                    ] : null,
                    'recipe' => $d->recipe ? [
                        'id' => $d->recipe->id,
                        'name' => $d->recipe->name,
                    ] : null,
                ])->values(),
            ],
        ]);
    }

    private function formatSiteWithKpis(Site $site): array
    {
        $deviceCount = $site->devices()->count();
        $onlineCount = $site->devices()->online()->count();

        return [
            'id' => $site->id,
            'name' => $site->name,
            'address' => $site->address,
            'timezone' => $site->timezone,
            'status' => $site->status,
            'kpis' => [
                'total_devices' => $deviceCount,
                'online_devices' => $onlineCount,
                'online_pct' => $deviceCount > 0 ? round(($onlineCount / $deviceCount) * 100) : 0,
                'active_alerts' => $site->alerts()->active()->count(),
                'open_work_orders' => $site->workOrders()->whereIn('status', ['open', 'assigned', 'in_progress'])->count(),
            ],
        ];
    }
}
