<?php

namespace App\Services\Analytics;

use App\Models\Device;
use App\Models\DoorBaseline;
use Illuminate\Support\Facades\DB;

class DoorPatternService
{
    /**
     * Learn door open/close baseline patterns by analyzing sensor readings
     * over the given number of days. Upserts DoorBaseline rows per
     * (device, day_of_week, hour) combination.
     *
     * @return int Number of baseline rows upserted
     */
    public function learnBaseline(Device $device, int $daysBack = 14): int
    {
        $from = now()->subDays($daysBack);
        $to = now();
        $driver = DB::getDriverName();

        $rows = $driver === 'pgsql'
            ? $this->queryBaselinePostgres($device, $from, $to)
            : $this->queryBaselineSqlite($device, $from, $to);

        $upserted = 0;

        foreach ($rows as $row) {
            DoorBaseline::updateOrCreate(
                [
                    'device_id' => $device->id,
                    'day_of_week' => (int) $row->day_of_week,
                    'hour' => (int) $row->hour,
                ],
                [
                    'avg_opens' => round((float) $row->avg_opens, 4),
                    'avg_duration' => round((float) $row->avg_duration, 4),
                    'std_dev_opens' => round((float) $row->std_dev_opens, 4),
                ],
            );
            $upserted++;
        }

        return $upserted;
    }

    /**
     * Compare current hour's door opens against baseline.
     * Returns null if within normal range (<=2 std deviations).
     *
     * @return array{deviation: float, baseline_avg: float}|null
     */
    public function checkAnomaly(Device $device): ?array
    {
        $now = now();
        $dayOfWeek = $now->dayOfWeek;
        $hour = $now->hour;

        $baseline = DoorBaseline::where('device_id', $device->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('hour', $hour)
            ->first();

        if (! $baseline || $baseline->std_dev_opens <= 0) {
            return null;
        }

        // Count door opens in the current hour
        $currentOpens = $this->countCurrentHourOpens($device);
        $deviation = abs($currentOpens - $baseline->avg_opens);

        // Within 2 standard deviations is considered normal
        if ($deviation <= 2 * $baseline->std_dev_opens) {
            return null;
        }

        return [
            'deviation' => round($deviation / $baseline->std_dev_opens, 2),
            'baseline_avg' => $baseline->avg_opens,
        ];
    }

    /**
     * Count door opens for the current hour from sensor readings.
     */
    protected function countCurrentHourOpens(Device $device): int
    {
        $hourStart = now()->startOfHour();
        $hourEnd = now()->endOfHour();

        $result = DB::selectOne("
            SELECT COUNT(*) AS opens
            FROM sensor_readings
            WHERE device_id = ?
              AND metric = 'door_status'
              AND value = 1
              AND time BETWEEN ? AND ?
        ", [$device->id, $hourStart, $hourEnd]);

        return (int) $result->opens;
    }

    /**
     * PostgreSQL query for door baseline learning using EXTRACT.
     *
     * @return array<int, object>
     */
    protected function queryBaselinePostgres(Device $device, $from, $to): array
    {
        return DB::select("
            SELECT
                EXTRACT(DOW FROM time)::int AS day_of_week,
                EXTRACT(HOUR FROM time)::int AS hour,
                AVG(daily_opens) AS avg_opens,
                AVG(daily_duration) AS avg_duration,
                COALESCE(STDDEV_POP(daily_opens), 0) AS std_dev_opens
            FROM (
                SELECT
                    DATE(time) AS day,
                    EXTRACT(DOW FROM time)::int AS dow,
                    EXTRACT(HOUR FROM time)::int AS hr,
                    COUNT(CASE WHEN value = 1 THEN 1 END) AS daily_opens,
                    COALESCE(SUM(CASE WHEN value > 0 THEN value ELSE 0 END), 0) AS daily_duration
                FROM sensor_readings
                WHERE device_id = ?
                  AND metric = 'door_status'
                  AND time BETWEEN ? AND ?
                GROUP BY DATE(time), EXTRACT(DOW FROM time), EXTRACT(HOUR FROM time)
            ) sub
            GROUP BY day_of_week, hour
            ORDER BY day_of_week, hour
        ", [$device->id, $from, $to]);
    }

    /**
     * SQLite-compatible query for door baseline learning using strftime.
     *
     * @return array<int, object>
     */
    protected function queryBaselineSqlite(Device $device, $from, $to): array
    {
        // SQLite lacks STDDEV — fetch grouped rows and compute in PHP
        $rows = DB::select("
            SELECT
                CAST(strftime('%w', time) AS INTEGER) AS day_of_week,
                CAST(strftime('%H', time) AS INTEGER) AS hour,
                strftime('%Y-%m-%d', time) AS day,
                COUNT(CASE WHEN value = 1 THEN 1 END) AS daily_opens,
                COALESCE(SUM(CASE WHEN value > 0 THEN value ELSE 0 END), 0) AS daily_duration
            FROM sensor_readings
            WHERE device_id = ?
              AND metric = 'door_status'
              AND time BETWEEN ? AND ?
            GROUP BY strftime('%w', time), strftime('%H', time), strftime('%Y-%m-%d', time)
            ORDER BY day_of_week, hour
        ", [$device->id, $from, $to]);

        return $this->aggregateSqliteRows($rows);
    }

    /**
     * Aggregate SQLite rows into baseline buckets with avg and std_dev.
     *
     * @param  array<int, object>  $rows
     * @return array<int, object>
     */
    protected function aggregateSqliteRows(array $rows): array
    {
        $buckets = [];

        foreach ($rows as $row) {
            $key = "{$row->day_of_week}:{$row->hour}";
            $buckets[$key]['day_of_week'] = (int) $row->day_of_week;
            $buckets[$key]['hour'] = (int) $row->hour;
            $buckets[$key]['opens'][] = (float) $row->daily_opens;
            $buckets[$key]['durations'][] = (float) $row->daily_duration;
        }

        $result = [];

        foreach ($buckets as $bucket) {
            $opens = $bucket['opens'];
            $durations = $bucket['durations'];
            $count = count($opens);

            $avgOpens = array_sum($opens) / $count;
            $avgDuration = array_sum($durations) / $count;

            $variance = 0;
            foreach ($opens as $v) {
                $variance += ($v - $avgOpens) ** 2;
            }
            $stdDev = $count > 0 ? sqrt($variance / $count) : 0;

            $result[] = (object) [
                'day_of_week' => $bucket['day_of_week'],
                'hour' => $bucket['hour'],
                'avg_opens' => $avgOpens,
                'avg_duration' => $avgDuration,
                'std_dev_opens' => $stdDev,
            ];
        }

        usort($result, function (object $a, object $b) {
            $cmp = $a->day_of_week <=> $b->day_of_week;

            return $cmp !== 0 ? $cmp : $a->hour <=> $b->hour;
        });

        return $result;
    }
}
