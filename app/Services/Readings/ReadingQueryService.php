<?php

namespace App\Services\Readings;

use App\Models\SensorReading;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ReadingQueryService
{
    /**
     * Get readings for a device within a time range.
     *
     * @param  string|null  $resolution  Time bucket: '1m', '5m', '15m', '1h', '6h', '1d'
     */
    public function getReadings(
        int $deviceId,
        string $metric,
        Carbon $from,
        Carbon $to,
        ?string $resolution = null,
    ): Collection {
        if ($resolution) {
            return $this->getAggregatedReadings($deviceId, $metric, $from, $to, $resolution);
        }

        return SensorReading::where('device_id', $deviceId)
            ->where('metric', $metric)
            ->whereBetween('time', [$from, $to])
            ->orderBy('time')
            ->get(['time', 'value', 'unit']);
    }

    /**
     * Get time-bucketed aggregated readings.
     * Uses TimescaleDB time_bucket() in production, SQLite-compatible fallback in dev.
     */
    protected function getAggregatedReadings(
        int $deviceId,
        string $metric,
        Carbon $from,
        Carbon $to,
        string $resolution,
    ): Collection {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            return $this->getTimescaleAggregated($deviceId, $metric, $from, $to, $resolution);
        }

        return $this->getSqliteAggregated($deviceId, $metric, $from, $to, $resolution);
    }

    /**
     * TimescaleDB time_bucket aggregation.
     */
    protected function getTimescaleAggregated(
        int $deviceId,
        string $metric,
        Carbon $from,
        Carbon $to,
        string $resolution,
    ): Collection {
        $interval = $this->resolutionToInterval($resolution);

        return collect(DB::select("
            SELECT
                time_bucket(?, time) AS bucket,
                AVG(value) AS avg_value,
                MIN(value) AS min_value,
                MAX(value) AS max_value,
                COUNT(*) AS reading_count
            FROM sensor_readings
            WHERE device_id = ?
              AND metric = ?
              AND time BETWEEN ? AND ?
            GROUP BY bucket
            ORDER BY bucket
        ", [$interval, $deviceId, $metric, $from, $to]));
    }

    /**
     * SQLite-compatible aggregation using strftime.
     */
    protected function getSqliteAggregated(
        int $deviceId,
        string $metric,
        Carbon $from,
        Carbon $to,
        string $resolution,
    ): Collection {
        $format = $this->resolutionToSqliteFormat($resolution);

        return collect(DB::select("
            SELECT
                strftime(?, time) AS bucket,
                AVG(value) AS avg_value,
                MIN(value) AS min_value,
                MAX(value) AS max_value,
                COUNT(*) AS reading_count
            FROM sensor_readings
            WHERE device_id = ?
              AND metric = ?
              AND time BETWEEN ? AND ?
            GROUP BY bucket
            ORDER BY bucket
        ", [$format, $deviceId, $metric, $from, $to]));
    }

    /**
     * Get the latest reading for each metric of a device.
     */
    public function getLatestReadings(int $deviceId): Collection
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            return collect(DB::select("
                SELECT DISTINCT ON (metric) metric, value, unit, time
                FROM sensor_readings
                WHERE device_id = ?
                ORDER BY metric, time DESC
            ", [$deviceId]));
        }

        // SQLite fallback
        return collect(DB::select("
            SELECT sr.metric, sr.value, sr.unit, sr.time
            FROM sensor_readings sr
            INNER JOIN (
                SELECT metric, MAX(time) as max_time
                FROM sensor_readings
                WHERE device_id = ?
                GROUP BY metric
            ) latest ON sr.metric = latest.metric AND sr.time = latest.max_time
            WHERE sr.device_id = ?
        ", [$deviceId, $deviceId]));
    }

    /**
     * Get summary statistics for a device metric over a time range.
     */
    public function getSummary(int $deviceId, string $metric, Carbon $from, Carbon $to): ?object
    {
        return DB::selectOne("
            SELECT
                AVG(value) AS avg_value,
                MIN(value) AS min_value,
                MAX(value) AS max_value,
                COUNT(*) AS reading_count
            FROM sensor_readings
            WHERE device_id = ?
              AND metric = ?
              AND time BETWEEN ? AND ?
        ", [$deviceId, $metric, $from, $to]);
    }

    /**
     * Convert resolution string to PostgreSQL interval.
     */
    protected function resolutionToInterval(string $resolution): string
    {
        return match ($resolution) {
            '1m' => '1 minute',
            '5m' => '5 minutes',
            '15m' => '15 minutes',
            '1h' => '1 hour',
            '6h' => '6 hours',
            '1d' => '1 day',
            default => '1 hour',
        };
    }

    /**
     * Convert resolution string to SQLite strftime format.
     */
    protected function resolutionToSqliteFormat(string $resolution): string
    {
        return match ($resolution) {
            '1m' => '%Y-%m-%d %H:%M',
            '5m' => '%Y-%m-%d %H:%M',
            '15m' => '%Y-%m-%d %H:%M',
            '1h' => '%Y-%m-%d %H:00',
            '6h' => '%Y-%m-%d %H:00',
            '1d' => '%Y-%m-%d',
            default => '%Y-%m-%d %H:00',
        };
    }
}
