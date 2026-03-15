<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Site;
use App\Models\WorkOrder;
use Inertia\Inertia;

class CommandCenterController extends Controller
{
    public function index()
    {
        $organizations = Organization::withCount('sites')->get();

        $totalSites = Site::count();
        $totalDevices = Device::count();
        $onlineDevices = Device::online()->count();
        $offlineDevices = Device::offline()->count();
        $activeAlerts = Alert::unresolved()->count();
        $openWorkOrders = WorkOrder::open()->count();

        return Inertia::render('command-center/index', [
            'organizations' => $organizations,
            'stats' => [
                'total_sites' => $totalSites,
                'total_devices' => $totalDevices,
                'online_devices' => $onlineDevices,
                'offline_devices' => $offlineDevices,
                'active_alerts' => $activeAlerts,
                'open_work_orders' => $openWorkOrders,
            ],
        ]);
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
}
