<?php

namespace App\Services\Reports;

use App\Models\Device;
use App\Models\Site;
use App\Services\RulesEngine\BaselineService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;

class EnergyReport
{
    public function __construct(
        protected BaselineService $baselineService,
    ) {}

    /**
     * Generate a full energy consumption report for a site over a date range.
     *
     * @return array{
     *     site: array{id: int, name: string, timezone: string|null},
     *     period: array{from: string, to: string, days: int},
     *     per_device: array<int, array{name: string, model: string, zone: string|null, total_kwh: float, avg_daily_kwh: float, peak_current: float, readings_count: int}>,
     *     daily_totals: array<int, array{date: string, total_kwh: float, cost_mxn: float}>,
     *     summary: array{total_kwh: float, total_cost: float, avg_daily_cost: float, baseline_comparison_pct: float|null}
     * }
     */
    public function generateConsumptionReport(Site $site, Carbon $from, Carbon $to): array
    {
        $days = max($from->diffInDays($to), 1);

        $devices = Device::where('site_id', $site->id)->get();
        $perDevice = $this->buildPerDeviceStats($devices, $from, $to, $days);
        $dailyTotals = $this->buildDailyTotals($site, $from, $to);
        $totalKwh = array_sum(array_column($dailyTotals, 'total_kwh'));
        $totalCost = array_sum(array_column($dailyTotals, 'cost_mxn'));
        $avgDailyCost = $days > 0 ? round($totalCost / $days, 2) : 0;

        $baselineComparisonPct = $this->calculateBaselineComparison($devices, $totalKwh, $days);

        return [
            'site' => [
                'id' => $site->id,
                'name' => $site->name,
                'timezone' => $site->timezone,
            ],
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'days' => $days,
            ],
            'per_device' => $perDevice,
            'daily_totals' => $dailyTotals,
            'summary' => [
                'total_kwh' => round($totalKwh, 4),
                'total_cost' => round($totalCost, 2),
                'avg_daily_cost' => $avgDailyCost,
                'baseline_comparison_pct' => $baselineComparisonPct,
            ],
            'night_waste' => $this->analyzeNightWaste($site, $from, $to),
        ];
    }

    /**
     * Analyze overnight energy consumption to detect waste.
     * "Night" = hours between site closing and opening (e.g., 22:00 - 06:00).
     * Returns per-device overnight vs daytime consumption comparison.
     *
     * @return array{
     *     devices: array<int, array{device_name: string, device_model: string, zone: string|null, day_kwh: float, night_kwh: float, night_pct: float, waste_flag: bool}>,
     *     summary: array{total_night_kwh: float, total_day_kwh: float, night_cost_mxn: float, night_pct: float, operating_hours: string}
     * }
     */
    public function analyzeNightWaste(Site $site, Carbon $from, Carbon $to): array
    {
        $openingHour = $site->opening_hour ? (int) $site->opening_hour->format('H') : 6;
        $closingHour = min($openingHour + 16, 22); // Assume 16h operating day

        $devices = Device::where('site_id', $site->id)->get();
        $results = [];

        foreach ($devices as $device) {
            // Day consumption (opening to closing)
            $dayKwh = DB::selectOne("
                SELECT COALESCE(SUM(value), 0) as total
                FROM sensor_readings
                WHERE device_id = ? AND metric = 'current' AND time BETWEEN ? AND ?
                AND CAST(strftime('%H', time) AS INTEGER) BETWEEN ? AND ?
            ", [$device->id, $from, $to, $openingHour, $closingHour - 1])?->total ?? 0;

            // Night consumption (closing to opening)
            $nightKwh = DB::selectOne("
                SELECT COALESCE(SUM(value), 0) as total
                FROM sensor_readings
                WHERE device_id = ? AND metric = 'current' AND time BETWEEN ? AND ?
                AND (CAST(strftime('%H', time) AS INTEGER) >= ? OR CAST(strftime('%H', time) AS INTEGER) < ?)
            ", [$device->id, $from, $to, $closingHour, $openingHour])?->total ?? 0;

            $totalKwh = (float) $dayKwh + (float) $nightKwh;
            $nightPct = $totalKwh > 0 ? round(((float) $nightKwh / $totalKwh) * 100, 1) : 0.0;

            $results[] = [
                'device_name' => $device->name,
                'device_model' => $device->model,
                'zone' => $device->zone,
                'day_kwh' => round((float) $dayKwh, 2),
                'night_kwh' => round((float) $nightKwh, 2),
                'night_pct' => $nightPct,
                'waste_flag' => $nightPct > 30, // Flag if >30% consumption is overnight
            ];
        }

        $totalNight = array_sum(array_column($results, 'night_kwh'));
        $totalDay = array_sum(array_column($results, 'day_kwh'));
        $nightCost = $this->calculateCost($totalNight);

        return [
            'devices' => $results,
            'summary' => [
                'total_night_kwh' => round($totalNight, 2),
                'total_day_kwh' => round($totalDay, 2),
                'night_cost_mxn' => $nightCost,
                'night_pct' => ($totalDay + $totalNight) > 0 ? round($totalNight / ($totalDay + $totalNight) * 100, 1) : 0.0,
                'operating_hours' => "{$openingHour}:00 - {$closingHour}:00",
            ],
        ];
    }

    /**
     * Build per-device energy statistics for the report.
     *
     * @param  \Illuminate\Database\Eloquent\Collection<int, Device>  $devices
     * @return array<int, array{name: string, model: string, zone: string|null, total_kwh: float, avg_daily_kwh: float, peak_current: float, readings_count: int}>
     */
    protected function buildPerDeviceStats($devices, Carbon $from, Carbon $to, int $days): array
    {
        $perDevice = [];

        foreach ($devices as $device) {
            $stats = DB::selectOne("
                SELECT
                    COALESCE(SUM(value), 0) AS total_kwh,
                    COALESCE(MAX(value), 0) AS peak_current,
                    COUNT(*) AS readings_count
                FROM sensor_readings
                WHERE device_id = ?
                  AND time BETWEEN ? AND ?
            ", [$device->id, $from, $to]);

            $totalKwh = (float) $stats->total_kwh;

            $perDevice[] = [
                'name' => $device->name,
                'model' => $device->model,
                'zone' => $device->zone,
                'total_kwh' => round($totalKwh, 4),
                'avg_daily_kwh' => $days > 0 ? round($totalKwh / $days, 4) : 0,
                'peak_current' => round((float) $stats->peak_current, 4),
                'readings_count' => (int) $stats->readings_count,
            ];
        }

        return $perDevice;
    }

    /**
     * Build daily consumption totals with cost estimates.
     *
     * @return array<int, array{date: string, total_kwh: float, cost_mxn: float}>
     */
    protected function buildDailyTotals(Site $site, Carbon $from, Carbon $to): array
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            $rows = DB::select("
                SELECT
                    DATE(time) AS date,
                    COALESCE(SUM(value), 0) AS total_kwh
                FROM sensor_readings
                WHERE device_id IN (SELECT id FROM devices WHERE site_id = ?)
                  AND time BETWEEN ? AND ?
                GROUP BY DATE(time)
                ORDER BY date
            ", [$site->id, $from, $to]);
        } else {
            // SQLite fallback
            $rows = DB::select("
                SELECT
                    strftime('%Y-%m-%d', time) AS date,
                    COALESCE(SUM(value), 0) AS total_kwh
                FROM sensor_readings
                WHERE device_id IN (SELECT id FROM devices WHERE site_id = ?)
                  AND time BETWEEN ? AND ?
                GROUP BY strftime('%Y-%m-%d', time)
                ORDER BY date
            ", [$site->id, $from, $to]);
        }

        return array_map(fn (object $row) => [
            'date' => $row->date,
            'total_kwh' => round((float) $row->total_kwh, 4),
            'cost_mxn' => $this->calculateCost((float) $row->total_kwh),
        ], $rows);
    }

    /**
     * Calculate baseline comparison percentage.
     * Positive values indicate above-baseline consumption; negative values indicate savings.
     *
     * @param  \Illuminate\Database\Eloquent\Collection<int, Device>  $devices
     */
    protected function calculateBaselineComparison($devices, float $totalKwh, int $days): ?float
    {
        if ($devices->isEmpty() || $totalKwh <= 0) {
            return null;
        }

        $baselineTotal = 0;

        foreach ($devices as $device) {
            $baseline = $this->baselineService->learnBaseline($device, $days);

            if (empty($baseline)) {
                continue;
            }

            // Sum all hourly averages across the baseline period to get an expected total
            foreach ($baseline as $bucket) {
                // Each bucket represents one hour of one day type;
                // multiply by approximate number of those days in the period
                $dayRatio = $bucket['day_type'] === 'weekend' ? 2 / 7 : 5 / 7;
                $baselineTotal += $bucket['avg_value'] * $days * $dayRatio;
            }
        }

        if ($baselineTotal <= 0) {
            return null;
        }

        return round((($totalKwh - $baselineTotal) / $baselineTotal) * 100, 2);
    }

    /**
     * Calculate the energy cost in MXN using a simplified CFE tariff.
     *
     * @param  string  $tariff  CFE tariff code (e.g., 'GDMTH')
     */
    public function calculateCost(float $kwh, string $tariff = 'GDMTH'): float
    {
        $rate = $this->getRate($tariff);

        return round($kwh * $rate, 2);
    }

    /**
     * Get the base rate per kWh for a CFE tariff.
     * Uses simplified flat rates; extend with tiered/time-of-use logic as needed.
     */
    protected function getRate(string $tariff): float
    {
        return match ($tariff) {
            'GDMTH' => 2.50,
            'GDBT' => 2.80,
            'PDBT' => 3.20,
            'DAC' => 5.50,
            default => 2.50,
        };
    }

    /**
     * Correlate CT101 current sensor readings with EM300-TH temperature readings
     * over a time range. Useful for analyzing compressor efficiency.
     *
     * @return array<int, array{time: string, current: float|null, temperature: float|null}>
     */
    public function getCompressorCorrelation(int $ctDeviceId, int $thDeviceId, Carbon $from, Carbon $to): array
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            return $this->getCorrelationPostgres($ctDeviceId, $thDeviceId, $from, $to);
        }

        return $this->getCorrelationSqlite($ctDeviceId, $thDeviceId, $from, $to);
    }

    /**
     * PostgreSQL compressor correlation using 15-min interval bucketing.
     *
     * @return array<int, array{time: string, current: float|null, temperature: float|null}>
     */
    protected function getCorrelationPostgres(int $ctDeviceId, int $thDeviceId, Carbon $from, Carbon $to): array
    {
        $rows = DB::select("
            SELECT
                COALESCE(ct.bucket, th.bucket) AS time,
                ct.avg_value AS current,
                th.avg_value AS temperature
            FROM (
                SELECT
                    to_timestamp(floor(extract(epoch FROM time) / 900) * 900) AS bucket,
                    AVG(value) AS avg_value
                FROM sensor_readings
                WHERE device_id = ?
                  AND metric = 'current'
                  AND time BETWEEN ? AND ?
                GROUP BY bucket
            ) ct
            FULL OUTER JOIN (
                SELECT
                    to_timestamp(floor(extract(epoch FROM time) / 900) * 900) AS bucket,
                    AVG(value) AS avg_value
                FROM sensor_readings
                WHERE device_id = ?
                  AND metric = 'temperature'
                  AND time BETWEEN ? AND ?
                GROUP BY bucket
            ) th ON ct.bucket = th.bucket
            ORDER BY time
        ", [$ctDeviceId, $from, $to, $thDeviceId, $from, $to]);

        return array_map(fn (object $row) => [
            'time' => $row->time,
            'current' => $row->current !== null ? round((float) $row->current, 4) : null,
            'temperature' => $row->temperature !== null ? round((float) $row->temperature, 4) : null,
        ], $rows);
    }

    /**
     * SQLite-compatible compressor correlation using strftime for time alignment.
     *
     * @return array<int, array{time: string, current: float|null, temperature: float|null}>
     */
    protected function getCorrelationSqlite(int $ctDeviceId, int $thDeviceId, Carbon $from, Carbon $to): array
    {
        // Fetch current readings bucketed by 15-minute intervals
        $ctRows = DB::select("
            SELECT
                strftime('%Y-%m-%d %H:', time) ||
                    CASE
                        WHEN CAST(strftime('%M', time) AS INTEGER) < 15 THEN '00'
                        WHEN CAST(strftime('%M', time) AS INTEGER) < 30 THEN '15'
                        WHEN CAST(strftime('%M', time) AS INTEGER) < 45 THEN '30'
                        ELSE '45'
                    END AS bucket,
                AVG(value) AS avg_value
            FROM sensor_readings
            WHERE device_id = ?
              AND metric = 'current'
              AND time BETWEEN ? AND ?
            GROUP BY bucket
            ORDER BY bucket
        ", [$ctDeviceId, $from, $to]);

        // Fetch temperature readings bucketed by 15-minute intervals
        $thRows = DB::select("
            SELECT
                strftime('%Y-%m-%d %H:', time) ||
                    CASE
                        WHEN CAST(strftime('%M', time) AS INTEGER) < 15 THEN '00'
                        WHEN CAST(strftime('%M', time) AS INTEGER) < 30 THEN '15'
                        WHEN CAST(strftime('%M', time) AS INTEGER) < 45 THEN '30'
                        ELSE '45'
                    END AS bucket,
                AVG(value) AS avg_value
            FROM sensor_readings
            WHERE device_id = ?
              AND metric = 'temperature'
              AND time BETWEEN ? AND ?
            GROUP BY bucket
            ORDER BY bucket
        ", [$thDeviceId, $from, $to]);

        // Index temperature by bucket for efficient lookup
        $thMap = [];
        foreach ($thRows as $row) {
            $thMap[$row->bucket] = (float) $row->avg_value;
        }

        // Merge both datasets on bucket
        $allBuckets = [];

        foreach ($ctRows as $row) {
            $allBuckets[$row->bucket] = [
                'time' => $row->bucket,
                'current' => round((float) $row->avg_value, 4),
                'temperature' => isset($thMap[$row->bucket])
                    ? round($thMap[$row->bucket], 4)
                    : null,
            ];
            unset($thMap[$row->bucket]);
        }

        // Add temperature-only buckets
        foreach ($thMap as $bucket => $value) {
            $allBuckets[$bucket] = [
                'time' => $bucket,
                'current' => null,
                'temperature' => round($value, 4),
            ];
        }

        ksort($allBuckets);

        return array_values($allBuckets);
    }
}
