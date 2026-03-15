<?php

namespace App\Services\Readings;

use App\Models\Alert;
use App\Models\Device;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ChartDataService
{
    public function __construct(
        protected ReadingQueryService $readingQuery,
    ) {}

    /**
     * Get time-series data for a device metric, formatted for Recharts.
     *
     * Returns a collection of {time, value, min, max, avg} objects.
     * Bucket size depends on period: 24h => 5min, 7d => 1h, 30d => 6h.
     *
     * @return Collection<int, array{time: string, value: float|null, min: float|null, max: float|null, avg: float|null}>
     */
    public function getTimeSeriesData(int $deviceId, string $metric, string $period): Collection
    {
        [$from, $resolution] = $this->resolvePeriod($period);
        $to = now();

        $readings = $this->readingQuery->getReadings(
            $deviceId,
            $metric,
            $from,
            $to,
            $resolution,
        );

        return $readings->map(fn (object $row) => [
            'time' => $row->bucket,
            'value' => $row->avg_value !== null ? round((float) $row->avg_value, 2) : null,
            'min' => $row->min_value !== null ? round((float) $row->min_value, 2) : null,
            'max' => $row->max_value !== null ? round((float) $row->max_value, 2) : null,
            'avg' => $row->avg_value !== null ? round((float) $row->avg_value, 2) : null,
        ]);
    }

    /**
     * Get zone summary: current, min, max, avg for all devices in a zone.
     *
     * @return array<int, array{metric: string, current: float|null, min: float|null, max: float|null, avg: float|null, unit: string|null}>
     */
    public function getZoneSummary(int $siteId, string $zone): array
    {
        $devices = Device::forSite($siteId)
            ->where('zone', $zone)
            ->get(['id']);

        if ($devices->isEmpty()) {
            return [];
        }

        $deviceIds = $devices->pluck('id')->all();
        $since = now()->subHours(24);

        // Get distinct metrics for these devices
        $metrics = DB::table('sensor_readings')
            ->whereIn('device_id', $deviceIds)
            ->where('time', '>=', $since)
            ->distinct()
            ->pluck('metric');

        $summary = [];

        foreach ($metrics as $metric) {
            $stats = DB::selectOne("
                SELECT
                    AVG(value) AS avg_value,
                    MIN(value) AS min_value,
                    MAX(value) AS max_value
                FROM sensor_readings
                WHERE device_id IN (" . implode(',', array_fill(0, count($deviceIds), '?')) . ")
                  AND metric = ?
                  AND time >= ?
            ", [...$deviceIds, $metric, $since]);

            // Get the most recent value across all devices in the zone
            $latest = DB::selectOne("
                SELECT value, unit
                FROM sensor_readings
                WHERE device_id IN (" . implode(',', array_fill(0, count($deviceIds), '?')) . ")
                  AND metric = ?
                ORDER BY time DESC
                LIMIT 1
            ", [...$deviceIds, $metric]);

            $summary[] = [
                'metric' => $metric,
                'current' => $latest?->value !== null ? round((float) $latest->value, 2) : null,
                'min' => $stats?->min_value !== null ? round((float) $stats->min_value, 2) : null,
                'max' => $stats?->max_value !== null ? round((float) $stats->max_value, 2) : null,
                'avg' => $stats?->avg_value !== null ? round((float) $stats->avg_value, 2) : null,
                'unit' => $latest?->unit,
            ];
        }

        return $summary;
    }

    /**
     * Get site-level KPIs for a dashboard.
     *
     * @return array{total_devices: int, online_count: int, offline_count: int, active_alerts: int, low_battery_count: int}
     */
    public function getSiteKPIs(int $siteId): array
    {
        $devices = Device::forSite($siteId);

        $total = (clone $devices)->count();
        $online = (clone $devices)->online()->count();
        $lowBattery = (clone $devices)->lowBattery()->count();
        $activeAlerts = Alert::forSite($siteId)->active()->count();

        return [
            'total_devices' => $total,
            'online_count' => $online,
            'offline_count' => $total - $online,
            'active_alerts' => $activeAlerts,
            'low_battery_count' => $lowBattery,
        ];
    }

    /**
     * Resolve a period string to a Carbon start time and resolution bucket.
     *
     * @return array{0: Carbon, 1: string}
     */
    protected function resolvePeriod(string $period): array
    {
        return match ($period) {
            '24h' => [now()->subHours(24), '5m'],
            '7d' => [now()->subDays(7), '1h'],
            '30d' => [now()->subDays(30), '6h'],
            default => [now()->subHours(24), '5m'],
        };
    }
}
