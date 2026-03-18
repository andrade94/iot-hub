<?php

namespace App\Services\Reports;

use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Site;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class TemperatureReport
{
    /**
     * Generate a HACCP/COFEPRIS compliance temperature report for a site.
     *
     * Returns structured data suitable for rendering into PDF via Browsershot.
     *
     * @return array{
     *     site: array{id: int, name: string, address: string|null, timezone: string|null},
     *     date_range: array{from: string, to: string},
     *     per_zone: array<int, array{
     *         zone: string|null,
     *         devices: array<int, array{
     *             name: string,
     *             readings_count: int,
     *             min_temp: float|null,
     *             max_temp: float|null,
     *             avg_temp: float|null,
     *             excursions: array<int, array{start: string, end: string|null, peak: float, duration: int}>
     *         }>
     *     }>,
     *     summary: array{total_readings: int, total_excursions: int, compliance_pct: float},
     *     generated_at: string
     * }
     */
    public function generateReport(Site $site, Carbon $from, Carbon $to): array
    {
        $devices = Device::where('site_id', $site->id)
            ->orderBy('zone')
            ->orderBy('name')
            ->get();

        $perZone = [];
        $totalReadings = 0;
        $totalExcursions = 0;

        $devicesByZone = $devices->groupBy('zone');

        foreach ($devicesByZone as $zone => $zoneDevices) {
            $zoneData = [
                'zone' => $zone ?: null,
                'devices' => [],
            ];

            foreach ($zoneDevices as $device) {
                $readings = SensorReading::where('device_id', $device->id)
                    ->where('metric', 'temperature')
                    ->whereBetween('time', [$from, $to])
                    ->orderBy('time')
                    ->get();

                $deviceData = $this->buildDeviceData($device, $readings);
                $totalReadings += $deviceData['readings_count'];
                $totalExcursions += count($deviceData['excursions']);

                $zoneData['devices'][] = $deviceData;
            }

            $perZone[] = $zoneData;
        }

        $compliancePct = $totalReadings > 0
            ? round((1 - ($totalExcursions / max($totalReadings, 1))) * 100, 2)
            : 100.0;

        return [
            'site' => [
                'id' => $site->id,
                'name' => $site->name,
                'address' => $site->address,
                'timezone' => $site->timezone,
            ],
            'date_range' => [
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
            ],
            'per_zone' => $perZone,
            'summary' => [
                'total_readings' => $totalReadings,
                'total_excursions' => $totalExcursions,
                'compliance_pct' => $compliancePct,
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Build data for a single device's temperature readings.
     *
     * @return array{name: string, readings_count: int, min_temp: float|null, max_temp: float|null, avg_temp: float|null, excursions: array<int, array{start: string, end: string|null, peak: float, duration: int}>}
     */
    protected function buildDeviceData(Device $device, Collection $readings): array
    {
        if ($readings->isEmpty()) {
            return [
                'name' => $device->name,
                'readings_count' => 0,
                'min_temp' => null,
                'max_temp' => null,
                'avg_temp' => null,
                'excursions' => [],
            ];
        }

        $values = $readings->pluck('value');

        return [
            'name' => $device->name,
            'readings_count' => $readings->count(),
            'min_temp' => round($values->min(), 2),
            'max_temp' => round($values->max(), 2),
            'avg_temp' => round($values->avg(), 2),
            'excursions' => $this->detectExcursions($device, $readings),
        ];
    }

    /**
     * Detect temperature excursions based on the device's alert rules.
     *
     * An excursion is a period where temperature is outside the acceptable range
     * defined by the device's recipe or alert rules.
     *
     * @return array<int, array{start: string, end: string|null, peak: float, duration: int}>
     */
    protected function detectExcursions(Device $device, Collection $readings): array
    {
        // Get temperature thresholds from the device's recipe or alert rules
        $thresholds = $this->getThresholds($device);
        if (! $thresholds) {
            return [];
        }

        $excursions = [];
        $inExcursion = false;
        $excursionStart = null;
        $peakTemp = null;

        foreach ($readings as $reading) {
            $isOutOfRange = $reading->value > $thresholds['max'] || $reading->value < $thresholds['min'];

            if (! $inExcursion && $isOutOfRange) {
                $inExcursion = true;
                $excursionStart = $reading->time;
                $peakTemp = $reading->value;
            } elseif ($inExcursion && $isOutOfRange) {
                // Still in excursion — track peak
                if ($reading->value > $thresholds['max'] && $reading->value > $peakTemp) {
                    $peakTemp = $reading->value;
                } elseif ($reading->value < $thresholds['min'] && $reading->value < $peakTemp) {
                    $peakTemp = $reading->value;
                }
            } elseif ($inExcursion && ! $isOutOfRange) {
                // Excursion ended
                $excursions[] = [
                    'start' => $excursionStart->toIso8601String(),
                    'end' => $reading->time->toIso8601String(),
                    'peak' => round($peakTemp, 2),
                    'duration' => $excursionStart->diffInMinutes($reading->time),
                ];

                $inExcursion = false;
                $excursionStart = null;
                $peakTemp = null;
            }
        }

        // If still in excursion at end of data
        if ($inExcursion && $excursionStart) {
            $lastReading = $readings->last();
            $excursions[] = [
                'start' => $excursionStart->toIso8601String(),
                'end' => null,
                'peak' => round($peakTemp, 2),
                'duration' => $excursionStart->diffInMinutes($lastReading->time),
            ];
        }

        return $excursions;
    }

    /**
     * Get temperature thresholds for a device from its recipe or alert rules.
     *
     * @return array{min: float, max: float}|null
     */
    protected function getThresholds(Device $device): ?array
    {
        // Try to get from the device's recipe first
        $recipe = $device->recipe;
        if ($recipe && isset($recipe->parameters)) {
            $params = is_array($recipe->parameters) ? $recipe->parameters : [];
            if (isset($params['temp_min']) && isset($params['temp_max'])) {
                return [
                    'min' => (float) $params['temp_min'],
                    'max' => (float) $params['temp_max'],
                ];
            }
        }

        // Fallback: check alert rules for temperature thresholds
        $rules = $device->alertRules()
            ->where('active', true)
            ->get();

        $min = null;
        $max = null;

        foreach ($rules as $rule) {
            $conditions = $rule->conditions;
            if (! is_array($conditions)) {
                continue;
            }

            foreach ($conditions as $condition) {
                if (($condition['metric'] ?? null) !== 'temperature') {
                    continue;
                }

                $threshold = $condition['threshold'] ?? null;
                if ($threshold === null) {
                    continue;
                }

                $type = $condition['condition'] ?? null;
                if ($type === 'above' && ($max === null || $threshold < $max)) {
                    $max = (float) $threshold;
                } elseif ($type === 'below' && ($min === null || $threshold > $min)) {
                    $min = (float) $threshold;
                }
            }
        }

        if ($min !== null && $max !== null) {
            return ['min' => $min, 'max' => $max];
        }

        return null;
    }

    /**
     * Generate a PDF report via Browsershot.
     *
     * Placeholder — PDF rendering will be implemented when the front-end
     * report template is built.
     *
     * @return string|null Path to the generated PDF, or null if not yet implemented.
     */
    public function generatePdf(Site $site, Carbon $from, Carbon $to): ?string
    {
        Log::info('PDF generation placeholder called', [
            'site_id' => $site->id,
            'from' => $from->toIso8601String(),
            'to' => $to->toIso8601String(),
        ]);

        // TODO: Render Blade view with report data and convert to PDF via Browsershot
        // $data = $this->generateReport($site, $from, $to);
        // $html = view('pdf.reports.temperature', $data)->render();
        // $path = storage_path("app/reports/temp_report_{$site->id}_{$from->format('Ymd')}.pdf");
        // Browsershot::html($html)->save($path);
        // return $path;

        return null;
    }
}
