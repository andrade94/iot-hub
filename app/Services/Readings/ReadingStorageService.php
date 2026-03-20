<?php

namespace App\Services\Readings;

use App\Models\Device;
use App\Models\SensorReading;
use Illuminate\Support\Facades\Redis;

class ReadingStorageService
{
    /**
     * Store decoded sensor readings and update caches.
     *
     * @param  array<string, array{value: float, unit: string}>  $readings
     */
    public function store(Device $device, array $readings, ?int $rssi = null): void
    {
        $now = now();

        // Build records and insert, silently skipping duplicates (BR-096)
        $records = [];
        foreach ($readings as $metric => $data) {
            $records[] = [
                'time' => $now,
                'device_id' => $device->id,
                'metric' => $metric,
                'value' => $data['value'],
                'unit' => $data['unit'] ?? null,
                'created_at' => $now,
            ];

            // Update Redis latest reading cache
            $this->updateLatestCache($device->id, $metric, $data['value'], $data['unit'] ?? '', $now->toIso8601String());
        }

        SensorReading::insertOrIgnore($records);

        // Update device fields
        $updateData = ['last_reading_at' => $now];

        if ($rssi !== null) {
            $updateData['rssi'] = $rssi;
        }

        // Extract battery from readings if present
        if (isset($readings['battery'])) {
            $updateData['battery_pct'] = (int) $readings['battery']['value'];
        }

        // Mark as active if still pending
        if ($device->status === 'pending' || $device->status === 'provisioned') {
            $updateData['status'] = 'active';
        }

        $device->update($updateData);
    }

    /**
     * Update the Redis latest reading cache for a device metric.
     */
    protected function updateLatestCache(int $deviceId, string $metric, float $value, string $unit, string $time): void
    {
        try {
            $key = "device:{$deviceId}:latest";
            Redis::hSet($key, $metric, json_encode([
                'value' => $value,
                'unit' => $unit,
                'time' => $time,
            ]));
            // Expire after 1 hour as safety net
            Redis::expire($key, 3600);
        } catch (\Exception $e) {
            // Redis is optional — don't fail if unavailable
        }
    }

    /**
     * Get the latest cached reading for a device.
     *
     * @return array<string, array{value: float, unit: string, time: string}>|null
     */
    public function getLatest(int $deviceId): ?array
    {
        try {
            $key = "device:{$deviceId}:latest";
            $data = Redis::hGetAll($key);

            if (empty($data)) {
                return null;
            }

            $result = [];
            foreach ($data as $metric => $json) {
                $result[$metric] = json_decode($json, true);
            }

            return $result;
        } catch (\Exception $e) {
            return null;
        }
    }
}
