<?php

namespace App\Services\Reports;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Services\Readings\ReadingQueryService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class MorningSummaryService
{
    public function __construct(
        protected ReadingQueryService $readingQuery,
    ) {}

    /**
     * Generate a morning summary for a single site (for site_viewer users).
     *
     * @return array{site_name: string, generated_at: string, alert_count_24h: int, active_alerts: array, device_status: array{online: int, offline: int, low_battery: int, total: int}, temperature_by_zone: array}
     */
    public function generateStoreSummary(Site $site): array
    {
        $now = now();
        $since = $now->copy()->subHours(24);

        return [
            'site_name' => $site->name,
            'site_id' => $site->id,
            'generated_at' => $now->toIso8601String(),
            'alert_count_24h' => $this->getAlertCount($site->id, $since),
            'active_alerts' => $this->getActiveAlerts($site->id),
            'device_status' => $this->getDeviceStatusCounts($site->id),
            'temperature_by_zone' => $this->getTemperatureByZone($site->id, $since, $now),
        ];
    }

    /**
     * Generate a regional summary for a site_manager (aggregated across their sites).
     *
     * @return array{user_name: string, generated_at: string, site_count: int, total_alerts_24h: int, total_active_alerts: int, sites: array, device_totals: array{online: int, offline: int, low_battery: int, total: int}}
     */
    public function generateRegionalSummary(User $user): array
    {
        $sites = $user->accessibleSites();
        $now = now();
        $since = $now->copy()->subHours(24);

        $siteSummaries = [];
        $totals = ['online' => 0, 'offline' => 0, 'low_battery' => 0, 'total' => 0];
        $totalAlerts24h = 0;
        $totalActiveAlerts = 0;

        foreach ($sites as $site) {
            $storeSummary = $this->generateStoreSummary($site);

            $siteSummaries[] = [
                'site_id' => $site->id,
                'site_name' => $site->name,
                'alert_count_24h' => $storeSummary['alert_count_24h'],
                'active_alert_count' => count($storeSummary['active_alerts']),
                'device_status' => $storeSummary['device_status'],
            ];

            $totalAlerts24h += $storeSummary['alert_count_24h'];
            $totalActiveAlerts += count($storeSummary['active_alerts']);

            foreach (['online', 'offline', 'low_battery', 'total'] as $key) {
                $totals[$key] += $storeSummary['device_status'][$key];
            }
        }

        return [
            'user_name' => $user->name,
            'generated_at' => $now->toIso8601String(),
            'site_count' => $sites->count(),
            'total_alerts_24h' => $totalAlerts24h,
            'total_active_alerts' => $totalActiveAlerts,
            'sites' => $siteSummaries,
            'device_totals' => $totals,
        ];
    }

    /**
     * Generate a corporate summary for an org_admin (all sites in the organization).
     *
     * @return array{organization: string, generated_at: string, site_count: int, total_alerts_24h: int, total_active_alerts: int, sites: array, device_totals: array{online: int, offline: int, low_battery: int, total: int}}
     */
    public function generateCorporateSummary(Organization $org): array
    {
        $sites = $org->sites()->active()->get();
        $now = now();

        $siteSummaries = [];
        $totals = ['online' => 0, 'offline' => 0, 'low_battery' => 0, 'total' => 0];
        $totalAlerts24h = 0;
        $totalActiveAlerts = 0;

        foreach ($sites as $site) {
            $storeSummary = $this->generateStoreSummary($site);

            $siteSummaries[] = [
                'site_id' => $site->id,
                'site_name' => $site->name,
                'alert_count_24h' => $storeSummary['alert_count_24h'],
                'active_alert_count' => count($storeSummary['active_alerts']),
                'device_status' => $storeSummary['device_status'],
            ];

            $totalAlerts24h += $storeSummary['alert_count_24h'];
            $totalActiveAlerts += count($storeSummary['active_alerts']);

            foreach (['online', 'offline', 'low_battery', 'total'] as $key) {
                $totals[$key] += $storeSummary['device_status'][$key];
            }
        }

        return [
            'organization' => $org->name,
            'generated_at' => $now->toIso8601String(),
            'site_count' => $sites->count(),
            'total_alerts_24h' => $totalAlerts24h,
            'total_active_alerts' => $totalActiveAlerts,
            'sites' => $siteSummaries,
            'device_totals' => $totals,
        ];
    }

    /**
     * Count alerts triggered in the given time window for a site.
     */
    protected function getAlertCount(int $siteId, Carbon $since): int
    {
        return Alert::forSite($siteId)
            ->where('triggered_at', '>=', $since)
            ->count();
    }

    /**
     * Get active (unresolved) alerts for a site.
     *
     * @return array<int, array{id: int, severity: string, status: string, triggered_at: string, device_name: string|null}>
     */
    protected function getActiveAlerts(int $siteId): array
    {
        return Alert::forSite($siteId)
            ->unresolved()
            ->with('device:id,name')
            ->orderByDesc('triggered_at')
            ->get(['id', 'severity', 'status', 'triggered_at', 'device_id', 'data'])
            ->map(fn (Alert $alert) => [
                'id' => $alert->id,
                'severity' => $alert->severity,
                'status' => $alert->status,
                'triggered_at' => $alert->triggered_at?->toIso8601String(),
                'device_name' => $alert->device?->name,
                'data' => $alert->data,
            ])
            ->all();
    }

    /**
     * Get device status counts for a site: online, offline, and low battery.
     *
     * @return array{online: int, offline: int, low_battery: int, total: int}
     */
    protected function getDeviceStatusCounts(int $siteId): array
    {
        $devices = Device::forSite($siteId);

        $total = (clone $devices)->count();
        $online = (clone $devices)->online()->count();
        $lowBattery = (clone $devices)->lowBattery()->count();

        return [
            'online' => $online,
            'offline' => $total - $online,
            'low_battery' => $lowBattery,
            'total' => $total,
        ];
    }

    /**
     * Get temperature min/max/avg grouped by zone for a site.
     *
     * @return array<string, array{zone: string, min: float|null, max: float|null, avg: float|null}>
     */
    protected function getTemperatureByZone(int $siteId, Carbon $from, Carbon $to): array
    {
        $devicesByZone = Device::forSite($siteId)
            ->whereNotNull('zone')
            ->get(['id', 'zone'])
            ->groupBy('zone');

        $zones = [];

        foreach ($devicesByZone as $zone => $devices) {
            $deviceIds = $devices->pluck('id')->all();

            $stats = DB::selectOne("
                SELECT
                    AVG(value) AS avg_value,
                    MIN(value) AS min_value,
                    MAX(value) AS max_value
                FROM sensor_readings
                WHERE device_id IN (" . implode(',', array_fill(0, count($deviceIds), '?')) . ")
                  AND metric = ?
                  AND time BETWEEN ? AND ?
            ", [...$deviceIds, 'temperature', $from, $to]);

            $zones[$zone] = [
                'zone' => $zone,
                'min' => $stats?->min_value !== null ? round((float) $stats->min_value, 2) : null,
                'max' => $stats?->max_value !== null ? round((float) $stats->max_value, 2) : null,
                'avg' => $stats?->avg_value !== null ? round((float) $stats->avg_value, 2) : null,
            ];
        }

        return $zones;
    }
}
