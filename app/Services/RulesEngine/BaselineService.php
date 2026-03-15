<?php

namespace App\Services\RulesEngine;

use App\Models\Device;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BaselineService
{
    /**
     * Learn normal consumption patterns by analyzing readings over N days.
     * Computes hourly averages grouped by day type (weekday vs weekend).
     *
     * @return array<int, array{hour: int, day_type: string, avg_value: float, std_dev: float}>
     */
    public function learnBaseline(Device $device, int $daysBack = 14): array
    {
        $from = now()->subDays($daysBack);
        $to = now();
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            return $this->learnBaselinePostgres($device, $from, $to);
        }

        return $this->learnBaselineSqlite($device, $from, $to);
    }

    /**
     * PostgreSQL baseline learning using EXTRACT and ISODOW.
     *
     * @return array<int, array{hour: int, day_type: string, avg_value: float, std_dev: float}>
     */
    protected function learnBaselinePostgres(Device $device, Carbon $from, Carbon $to): array
    {
        $rows = DB::select("
            SELECT
                EXTRACT(HOUR FROM time)::int AS hour,
                CASE
                    WHEN EXTRACT(ISODOW FROM time) IN (6, 7) THEN 'weekend'
                    ELSE 'weekday'
                END AS day_type,
                AVG(value) AS avg_value,
                COALESCE(STDDEV_POP(value), 0) AS std_dev
            FROM sensor_readings
            WHERE device_id = ?
              AND time BETWEEN ? AND ?
            GROUP BY hour, day_type
            ORDER BY day_type, hour
        ", [$device->id, $from, $to]);

        return array_map(fn (object $row) => [
            'hour' => (int) $row->hour,
            'day_type' => $row->day_type,
            'avg_value' => round((float) $row->avg_value, 4),
            'std_dev' => round((float) $row->std_dev, 4),
        ], $rows);
    }

    /**
     * SQLite-compatible baseline learning using strftime.
     *
     * @return array<int, array{hour: int, day_type: string, avg_value: float, std_dev: float}>
     */
    protected function learnBaselineSqlite(Device $device, Carbon $from, Carbon $to): array
    {
        // SQLite does not have STDDEV — fetch grouped rows and compute in PHP
        $rows = DB::select("
            SELECT
                CAST(strftime('%H', time) AS INTEGER) AS hour,
                CASE
                    WHEN strftime('%w', time) IN ('0', '6') THEN 'weekend'
                    ELSE 'weekday'
                END AS day_type,
                value
            FROM sensor_readings
            WHERE device_id = ?
              AND time BETWEEN ? AND ?
            ORDER BY day_type, hour
        ", [$device->id, $from, $to]);

        return $this->aggregateBaselineRows($rows);
    }

    /**
     * Aggregate raw rows into baseline buckets with avg and std_dev.
     * Used as a fallback when the database lacks STDDEV support (SQLite).
     *
     * @param  array<int, object>  $rows
     * @return array<int, array{hour: int, day_type: string, avg_value: float, std_dev: float}>
     */
    protected function aggregateBaselineRows(array $rows): array
    {
        $buckets = [];

        foreach ($rows as $row) {
            $key = "{$row->day_type}:{$row->hour}";
            $buckets[$key]['hour'] = (int) $row->hour;
            $buckets[$key]['day_type'] = $row->day_type;
            $buckets[$key]['values'][] = (float) $row->value;
        }

        $result = [];

        foreach ($buckets as $bucket) {
            $values = $bucket['values'];
            $count = count($values);
            $avg = array_sum($values) / $count;

            $variance = 0;
            foreach ($values as $v) {
                $variance += ($v - $avg) ** 2;
            }
            $stdDev = $count > 0 ? sqrt($variance / $count) : 0;

            $result[] = [
                'hour' => $bucket['hour'],
                'day_type' => $bucket['day_type'],
                'avg_value' => round($avg, 4),
                'std_dev' => round($stdDev, 4),
            ];
        }

        // Sort by day_type then hour for consistent output
        usort($result, function (array $a, array $b) {
            $cmp = strcmp($a['day_type'], $b['day_type']);

            return $cmp !== 0 ? $cmp : $a['hour'] <=> $b['hour'];
        });

        return $result;
    }

    /**
     * Compare current value against learned baseline for the current hour and day type.
     * Returns null if the value is within normal range (<=2 standard deviations).
     *
     * @return array{deviation_pct: float, baseline_avg: float, current_value: float, severity: string}|null
     */
    public function checkAnomaly(Device $device, string $metric, float $currentValue): ?array
    {
        $hour = now()->hour;
        $dayType = now()->isWeekend() ? 'weekend' : 'weekday';
        $driver = DB::getDriverName();

        $baseline = $this->getBaselineForHour($device, $metric, $hour, $dayType, $driver);

        if (! $baseline) {
            return null;
        }

        $avg = (float) $baseline->avg_value;
        $stdDev = (float) $baseline->std_dev;

        // Cannot detect anomaly with zero standard deviation
        if ($stdDev <= 0) {
            return null;
        }

        $deviation = abs($currentValue - $avg);
        $deviationMultiple = $deviation / $stdDev;

        // Within 2 standard deviations is considered normal
        if ($deviationMultiple <= 2) {
            return null;
        }

        $deviationPct = $avg != 0
            ? round((($currentValue - $avg) / $avg) * 100, 2)
            : 0;

        $severity = match (true) {
            $deviationMultiple > 4 => 'critical',
            $deviationMultiple > 3 => 'warning',
            default => 'info',
        };

        return [
            'deviation_pct' => $deviationPct,
            'baseline_avg' => round($avg, 4),
            'current_value' => $currentValue,
            'severity' => $severity,
        ];
    }

    /**
     * Retrieve the baseline statistics for a specific hour and day type.
     */
    protected function getBaselineForHour(Device $device, string $metric, int $hour, string $dayType, string $driver): ?object
    {
        if ($driver === 'pgsql') {
            return DB::selectOne("
                SELECT
                    AVG(value) AS avg_value,
                    COALESCE(STDDEV_POP(value), 0) AS std_dev
                FROM sensor_readings
                WHERE device_id = ?
                  AND metric = ?
                  AND EXTRACT(HOUR FROM time) = ?
                  AND CASE
                      WHEN EXTRACT(ISODOW FROM time) IN (6, 7) THEN 'weekend'
                      ELSE 'weekday'
                  END = ?
                  AND time >= ?
            ", [$device->id, $metric, $hour, $dayType, now()->subDays(14)]);
        }

        // SQLite fallback — compute in PHP
        $rows = DB::select("
            SELECT value
            FROM sensor_readings
            WHERE device_id = ?
              AND metric = ?
              AND CAST(strftime('%H', time) AS INTEGER) = ?
              AND CASE
                  WHEN strftime('%w', time) IN ('0', '6') THEN 'weekend'
                  ELSE 'weekday'
              END = ?
              AND time >= ?
        ", [$device->id, $metric, $hour, $dayType, now()->subDays(14)]);

        if (empty($rows)) {
            return null;
        }

        $values = array_map(fn (object $r) => (float) $r->value, $rows);
        $count = count($values);
        $avg = array_sum($values) / $count;

        $variance = 0;
        foreach ($values as $v) {
            $variance += ($v - $avg) ** 2;
        }
        $stdDev = sqrt($variance / $count);

        return (object) [
            'avg_value' => $avg,
            'std_dev' => $stdDev,
        ];
    }

    /**
     * Calculate night-time waste by comparing actual consumption (23:00-07:00)
     * against the expected idle baseline.
     *
     * @return array{actual: float, expected: float, waste_pct: float}
     */
    public function getNightWaste(Device $device, Carbon $date): array
    {
        $nightStart = $date->copy()->setTime(23, 0, 0);
        $nightEnd = $date->copy()->addDay()->setTime(7, 0, 0);

        $actual = $this->getNightActual($device, $nightStart, $nightEnd);

        // Build expected from baseline for night hours (23, 0, 1, 2, 3, 4, 5, 6)
        $expected = $this->getNightExpected($device, $date);

        $wastePct = $expected > 0
            ? round((($actual - $expected) / $expected) * 100, 2)
            : ($actual > 0 ? 100.0 : 0.0);

        return [
            'actual' => round($actual, 4),
            'expected' => round($expected, 4),
            'waste_pct' => $wastePct,
        ];
    }

    /**
     * Sum actual readings for the night window (23:00 to 07:00).
     */
    protected function getNightActual(Device $device, Carbon $nightStart, Carbon $nightEnd): float
    {
        $result = DB::selectOne("
            SELECT COALESCE(SUM(value), 0) AS total
            FROM sensor_readings
            WHERE device_id = ?
              AND time BETWEEN ? AND ?
        ", [$device->id, $nightStart, $nightEnd]);

        return (float) $result->total;
    }

    /**
     * Calculate the expected idle baseline for night hours using learned patterns.
     * Night hours: 23, 0, 1, 2, 3, 4, 5, 6.
     */
    protected function getNightExpected(Device $device, Carbon $date): float
    {
        $dayType = $date->isWeekend() ? 'weekend' : 'weekday';
        $nightHours = [23, 0, 1, 2, 3, 4, 5, 6];
        $driver = DB::getDriverName();

        $total = 0.0;

        foreach ($nightHours as $hour) {
            $baseline = $this->getBaselineForHour($device, 'current', $hour, $dayType, $driver);

            if ($baseline) {
                $total += (float) $baseline->avg_value;
            }
        }

        return $total;
    }
}
