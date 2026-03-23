<?php

namespace App\Services\Sites;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Site;
use Illuminate\Support\Collection;

class SiteComparisonService
{
    public function rank(Collection $sites, string $metric = 'compliance', int $days = 30): array
    {
        $since = now()->subDays($days);

        return $sites->map(function (Site $site) use ($metric, $since) {
            return [
                'site_id' => $site->id,
                'site_name' => $site->name,
                'value' => $this->computeMetric($site, $metric, $since),
            ];
        })
            ->sortByDesc('value')
            ->values()
            ->toArray();
    }

    private function computeMetric(Site $site, string $metric, $since): float
    {
        return match ($metric) {
            'compliance' => $this->compliancePercent($site, $since),
            'alert_count' => $this->alertCount($site, $since),
            'response_time' => $this->avgResponseTime($site, $since),
            'device_uptime' => $this->deviceUptime($site),
            default => 0,
        };
    }

    private function compliancePercent(Site $site, $since): float
    {
        $total = Alert::where('site_id', $site->id)->where('triggered_at', '>=', $since)->count();
        if ($total === 0) {
            return 100.0;
        }
        $resolved = Alert::where('site_id', $site->id)
            ->where('triggered_at', '>=', $since)
            ->whereIn('status', ['resolved'])
            ->count();

        return round(($resolved / $total) * 100, 1);
    }

    private function alertCount(Site $site, $since): float
    {
        return (float) Alert::where('site_id', $site->id)->where('triggered_at', '>=', $since)->count();
    }

    private function avgResponseTime(Site $site, $since): float
    {
        $avg = Alert::where('site_id', $site->id)
            ->where('triggered_at', '>=', $since)
            ->whereNotNull('acknowledged_at')
            ->selectRaw('AVG(JULIANDAY(acknowledged_at) - JULIANDAY(triggered_at)) * 1440 as avg_minutes')
            ->value('avg_minutes');

        return round((float) $avg, 1);
    }

    private function deviceUptime(Site $site): float
    {
        $total = Device::where('site_id', $site->id)->whereIn('status', ['active', 'offline'])->count();
        if ($total === 0) {
            return 100.0;
        }
        $online = Device::where('site_id', $site->id)->where('status', 'active')->count();

        return round(($online / $total) * 100, 1);
    }
}
