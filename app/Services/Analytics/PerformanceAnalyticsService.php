<?php

namespace App\Services\Analytics;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Site;
use Illuminate\Support\Collection;

class PerformanceAnalyticsService
{
    public function __construct(
        private ?int $orgId = null,
        private int $days = 30,
    ) {}

    public function getSummary(): array
    {
        $since = now()->subDays($this->days);
        $alertQuery = Alert::where('triggered_at', '>=', $since);

        if ($this->orgId) {
            $siteIds = Site::where('org_id', $this->orgId)->pluck('id');
            $alertQuery->whereIn('site_id', $siteIds);
        }

        $total = $alertQuery->count();
        $resolved = (clone $alertQuery)->where('status', 'resolved')->count();
        $avgResponse = (clone $alertQuery)
            ->whereNotNull('acknowledged_at')
            ->selectRaw('AVG(JULIANDAY(acknowledged_at) - JULIANDAY(triggered_at)) * 1440 as avg_min')
            ->value('avg_min');

        $deviceQuery = Device::whereIn('status', ['active', 'offline']);
        if ($this->orgId) {
            $siteIds = $siteIds ?? Site::where('org_id', $this->orgId)->pluck('id');
            $deviceQuery->whereIn('site_id', $siteIds);
        }
        $totalDevices = $deviceQuery->count();
        $onlineDevices = (clone $deviceQuery)->where('status', 'active')->count();

        return [
            'total_alerts' => $total,
            'resolved_pct' => $total > 0 ? round(($resolved / $total) * 100, 1) : 100,
            'avg_response_minutes' => round((float) $avgResponse, 1),
            'device_uptime_pct' => $totalDevices > 0 ? round(($onlineDevices / $totalDevices) * 100, 1) : 100,
            'total_devices' => $totalDevices,
            'online_devices' => $onlineDevices,
        ];
    }

    public function getTrend(): array
    {
        $since = now()->subDays($this->days);
        $query = Alert::where('triggered_at', '>=', $since)
            ->selectRaw("DATE(triggered_at) as date, COUNT(*) as count");

        if ($this->orgId) {
            $siteIds = Site::where('org_id', $this->orgId)->pluck('id');
            $query->whereIn('site_id', $siteIds);
        }

        return $query->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date')
            ->toArray();
    }

    public function getSiteBreakdown(): array
    {
        $since = now()->subDays($this->days);

        $sites = $this->orgId
            ? Site::where('org_id', $this->orgId)->get()
            : Site::all();

        return $sites->map(function (Site $site) use ($since) {
            $total = Alert::where('site_id', $site->id)->where('triggered_at', '>=', $since)->count();
            $resolved = Alert::where('site_id', $site->id)->where('triggered_at', '>=', $since)->where('status', 'resolved')->count();
            $devices = Device::where('site_id', $site->id)->whereIn('status', ['active', 'offline'])->count();
            $online = Device::where('site_id', $site->id)->where('status', 'active')->count();

            return [
                'site_id' => $site->id,
                'site_name' => $site->name,
                'alert_count' => $total,
                'compliance_pct' => $total > 0 ? round(($resolved / $total) * 100, 1) : 100,
                'device_uptime_pct' => $devices > 0 ? round(($online / $devices) * 100, 1) : 100,
            ];
        })->toArray();
    }
}
