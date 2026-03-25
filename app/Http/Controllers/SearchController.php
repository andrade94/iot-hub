<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Site;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
        ]);

        $query = $request->input('q');
        $user = $request->user();
        $siteIds = $user->accessibleSites()->pluck('id');

        $results = [];

        // Sites: name matches (scoped to user's accessible sites)
        $sites = Site::whereIn('id', $siteIds)
            ->where('name', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'name', 'status'])
            ->map(fn (Site $site) => [
                'id' => $site->id,
                'name' => $site->name,
                'subtitle' => ucfirst($site->status),
                'url' => route('sites.show', $site->id),
            ]);

        if ($sites->isNotEmpty()) {
            $results['sites'] = $sites->toArray();
        }

        // Devices: name or dev_eui matches (scoped to accessible sites)
        $devices = Device::whereIn('site_id', $siteIds)
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('dev_eui', 'like', "%{$query}%");
            })
            ->with('site:id,name')
            ->limit(5)
            ->get(['id', 'name', 'dev_eui', 'site_id', 'status'])
            ->map(fn (Device $device) => [
                'id' => $device->id,
                'name' => $device->name,
                'subtitle' => $device->site?->name ?? $device->dev_eui,
                'url' => route('devices.show', ['site' => $device->site_id, 'device' => $device->id]),
            ]);

        if ($devices->isNotEmpty()) {
            $results['devices'] = $devices->toArray();
        }

        // Alerts: rule_name in data JSON matches (recent, scoped)
        $alerts = Alert::whereIn('site_id', $siteIds)
            ->where(function ($q) use ($query) {
                $q->where('data->rule_name', 'like', "%{$query}%")
                    ->orWhere('data->device_name', 'like', "%{$query}%");
            })
            ->orderByDesc('triggered_at')
            ->with('site:id,name')
            ->limit(5)
            ->get(['id', 'site_id', 'severity', 'status', 'data', 'triggered_at'])
            ->map(fn (Alert $alert) => [
                'id' => $alert->id,
                'name' => $alert->data['rule_name'] ?? "Alert #{$alert->id}",
                'subtitle' => ucfirst($alert->severity).' - '.ucfirst($alert->status),
                'url' => route('alerts.show', $alert->id),
            ]);

        if ($alerts->isNotEmpty()) {
            $results['alerts'] = $alerts->toArray();
        }

        // Work Orders: title matches (scoped)
        $workOrders = WorkOrder::whereIn('site_id', $siteIds)
            ->where('title', 'like', "%{$query}%")
            ->orderByDesc('created_at')
            ->with('site:id,name')
            ->limit(5)
            ->get(['id', 'title', 'site_id', 'status', 'priority'])
            ->map(fn (WorkOrder $wo) => [
                'id' => $wo->id,
                'name' => $wo->title,
                'subtitle' => ucfirst($wo->status).' - '.ucfirst($wo->priority),
                'url' => route('work-orders.show', $wo->id),
            ]);

        if ($workOrders->isNotEmpty()) {
            $results['work_orders'] = $workOrders->toArray();
        }

        return response()->json($results);
    }
}
