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
     * Uses PostgreSQL date_trunc/epoch flooring in production, SQLite strftime fallback in dev.
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
     * Standard PostgreSQL aggregation using date_trunc + interval floor.
     */
    protected function getTimescaleAggregated(
        int $deviceId,
        string $metric,
        Carbon $from,
        Carbon $to,
        string $resolution,
    ): Collection {
        $truncUnit = $this->resolutionToTruncUnit($resolution);
        $seconds = $this->resolutionToSeconds($resolution);

        // For units that date_trunc supports natively (minute, hour, day), use it directly.
        // For multi-minute intervals (5m, 15m), floor to the nearest interval via epoch arithmetic.
        if (in_array($truncUnit, ['hour', 'day'])) {
            return collect(DB::select("
                SELECT
                    date_trunc(?, time) AS bucket,
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
            ", [$truncUnit, $deviceId, $metric, $from, $to]));
        }

        // For sub-hour intervals, use epoch-based flooring
        return collect(DB::select("
            SELECT
                to_timestamp(floor(extract(epoch FROM time) / ?) * ?) AS bucket,
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
        ", [$seconds, $seconds, $deviceId, $metric, $from, $to]));
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
     * Convert resolution to a date_trunc unit (for simple intervals).
     */
    protected function resolutionToTruncUnit(string $resolution): string
    {
        return match ($resolution) {
            '1m' => 'minute',
            '5m' => 'minute',
            '15m' => 'minute',
            '1h' => 'hour',
            '6h' => 'hour',
            '1d' => 'day',
            default => 'hour',
        };
    }

    /**
     * Convert resolution to seconds (for epoch-based flooring).
     */
    protected function resolutionToSeconds(string $resolution): int
    {
        return match ($resolution) {
            '1m' => 60,
            '5m' => 300,
            '15m' => 900,
            '1h' => 3600,
            '6h' => 21600,
            '1d' => 86400,
            default => 3600,
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
