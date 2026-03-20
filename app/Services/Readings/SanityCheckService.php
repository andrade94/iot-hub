<?php

namespace App\Services\Readings;

use App\Models\Alert;
use App\Models\Device;
use App\Models\DeviceAnomaly;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class SanityCheckService
{
    /**
     * Valid ranges per sensor model per metric (VL-018).
     * Source: Milesight manufacturer datasheets.
     */
    public const VALID_RANGES = [
        'EM300-TH' => [
            'temperature' => ['min' => -40, 'max' => 85],
            'humidity' => ['min' => 0, 'max' => 100],
            'battery' => ['min' => 0, 'max' => 100],
        ],
        'EM300-MCS' => [
            'temperature' => ['min' => -40, 'max' => 85],
            'battery' => ['min' => 0, 'max' => 100],
        ],
        'EM300-PT' => [
            'temperature' => ['min' => -40, 'max' => 85],
            'pressure' => ['min' => 0, 'max' => 1100],
            'battery' => ['min' => 0, 'max' => 100],
        ],
        'CT101' => [
            'current' => ['min' => 0, 'max' => 100],
            'power_factor' => ['min' => 0, 'max' => 1],
            'battery' => ['min' => 0, 'max' => 100],
        ],
        'WS301' => [
            'door_status' => ['min' => 0, 'max' => 1],
            'battery' => ['min' => 0, 'max' => 100],
        ],
        'AM307' => [
            'temperature' => ['min' => -20, 'max' => 60],
            'humidity' => ['min' => 0, 'max' => 100],
            'co2' => ['min' => 0, 'max' => 5000],
            'tvoc' => ['min' => 0, 'max' => 60000],
            'pressure' => ['min' => 300, 'max' => 1100],
            'battery' => ['min' => 0, 'max' => 100],
        ],
        'EM310-UDL' => [
            'distance' => ['min' => 0, 'max' => 15000],
            'battery' => ['min' => 0, 'max' => 100],
        ],
        'GS101' => [
            'gas_alarm' => ['min' => 0, 'max' => 1],
            'gas_concentration' => ['min' => 0, 'max' => 10000],
        ],
        'VS121' => [
            'people_count' => ['min' => 0, 'max' => 500],
            'battery' => ['min' => 0, 'max' => 100],
        ],
        'WS202' => [
            'temperature' => ['min' => -40, 'max' => 85],
            'battery' => ['min' => 0, 'max' => 100],
        ],
    ];

    /**
     * Filter readings, removing invalid values and logging anomalies.
     * Returns only valid readings (BR-086, BR-087).
     *
     * @param  array<string, array{value: float, unit?: string}>  $readings
     * @return array<string, array{value: float, unit?: string}>
     */
    public function validate(Device $device, array $readings): array
    {
        $ranges = self::VALID_RANGES[$device->model] ?? null;

        // Unknown model → pass everything through
        if ($ranges === null) {
            return $readings;
        }

        $valid = [];

        foreach ($readings as $metric => $data) {
            $range = $ranges[$metric] ?? null;

            // Metric has no range defined → allow it
            if ($range === null) {
                $valid[$metric] = $data;

                continue;
            }

            $value = $data['value'];

            if ($value >= $range['min'] && $value <= $range['max']) {
                $valid[$metric] = $data;
            } else {
                $this->logAnomaly($device, $metric, $value, $range, $data['unit'] ?? null);
                $this->checkAnomalyThreshold($device, $metric, $range);
            }
        }

        return $valid;
    }

    /**
     * Log invalid reading to device_anomalies table.
     */
    private function logAnomaly(Device $device, string $metric, float $value, array $range, ?string $unit): void
    {
        DeviceAnomaly::create([
            'device_id' => $device->id,
            'metric' => $metric,
            'value' => $value,
            'valid_min' => $range['min'],
            'valid_max' => $range['max'],
            'unit' => $unit,
            'recorded_at' => now(),
            'created_at' => now(),
        ]);

        Log::warning("SanityCheck: device {$device->id} ({$device->model}) sent invalid {$metric}={$value} (range: {$range['min']}–{$range['max']})");
    }

    /**
     * If device sends 5+ invalid readings for a metric in 1 hour,
     * create a system alert for possible hardware failure (BR-088).
     */
    private function checkAnomalyThreshold(Device $device, string $metric, array $range): void
    {
        $key = "anomaly_count:{$device->id}:{$metric}";

        try {
            $count = Redis::incr($key);

            if ($count === 1) {
                Redis::expire($key, 3600);
            }

            if ($count === 5) {
                Alert::create([
                    'site_id' => $device->site_id,
                    'device_id' => $device->id,
                    'severity' => 'high',
                    'status' => 'active',
                    'triggered_at' => now(),
                    'data' => [
                        'type' => 'sensor_anomaly',
                        'rule_name' => 'Sensor sending invalid data',
                        'device_name' => $device->name,
                        'metric' => $metric,
                        'message' => "Device {$device->name} sent 5+ invalid {$metric} readings in the last hour (valid range: {$range['min']}–{$range['max']}). Possible hardware failure.",
                    ],
                ]);
            }
        } catch (\Exception $e) {
            // Redis unavailable — skip threshold check, anomaly is still logged to DB
        }
    }
}
