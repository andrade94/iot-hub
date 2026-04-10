<?php

namespace Database\Seeders;

use App\Models\Device;
use App\Models\FloorPlan;
use App\Models\SensorReading;
use App\Models\Site;
use Illuminate\Database\Seeder;

class SensorReadingSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding sensor readings and floor plans...');

        $sites = Site::where('status', 'active')->with('devices')->get();

        foreach ($sites as $site) {
            $this->seedFloorPlan($site);
            $this->seedReadings($site);
        }

        $this->command->info('  - '.SensorReading::count().' sensor readings created');
        $this->command->info('  - '.FloorPlan::count().' floor plans created');
    }

    private function seedFloorPlan(Site $site): void
    {
        // Create a floor plan for the first active site if none exists
        if ($site->floorPlans()->exists()) {
            return;
        }

        $fp = FloorPlan::create([
            'site_id' => $site->id,
            'name' => 'Planta Baja',
            'floor_number' => 1,
            'image_path' => '/images/demo/floor-plan-placeholder.svg',
            'width_px' => 1200,
            'height_px' => 600,
        ]);

        // Place devices on the floor plan with realistic positions
        $positions = [
            'Cooler A' => [['x' => 0.15, 'y' => 0.25], ['x' => 0.25, 'y' => 0.35]],
            'Cooler B' => [['x' => 0.42, 'y' => 0.25]],
            'Freezer' => [['x' => 0.72, 'y' => 0.20], ['x' => 0.82, 'y' => 0.35]],
            'Vitrina 1' => [['x' => 0.55, 'y' => 0.65]],
            'Compressor 1' => [['x' => 0.35, 'y' => 0.72]],
            'Compressor 2' => [['x' => 0.50, 'y' => 0.72]],
            'Kitchen' => [['x' => 0.12, 'y' => 0.70]],
            'Office' => [['x' => 0.88, 'y' => 0.68]],
        ];

        $devices = $site->devices;
        $positionIdx = [];

        foreach ($devices as $device) {
            $zone = $device->zone ?? 'Unassigned';
            if (! isset($positions[$zone])) {
                continue;
            }

            $idx = $positionIdx[$zone] ?? 0;
            $posArr = $positions[$zone];
            if ($idx >= count($posArr)) {
                continue;
            }

            $device->update([
                'floor_id' => $fp->id,
                'floor_x' => $posArr[$idx]['x'],
                'floor_y' => $posArr[$idx]['y'],
            ]);

            $positionIdx[$zone] = $idx + 1;
        }
    }

    private function seedReadings(Site $site): void
    {
        $devices = $site->devices;
        $now = now();

        // Define which devices should be "online" (8 of 10)
        $offlineZones = ['Office']; // 1 zone offline, rest online

        // Metric config per device model
        $metricConfig = [
            'EM300-TH' => [
                ['metric' => 'temperature', 'unit' => '°C'],
                ['metric' => 'humidity', 'unit' => '%'],
            ],
            'CT101' => [
                ['metric' => 'current', 'unit' => 'A'],
                ['metric' => 'power', 'unit' => 'kW'],
            ],
            'WS301' => [
                ['metric' => 'door_status', 'unit' => null],
            ],
            'GS101' => [
                ['metric' => 'temperature', 'unit' => '°C'],
                ['metric' => 'gas_level', 'unit' => 'ppm'],
            ],
            'AM307' => [
                ['metric' => 'temperature', 'unit' => '°C'],
                ['metric' => 'co2', 'unit' => 'ppm'],
                ['metric' => 'humidity', 'unit' => '%'],
            ],
        ];

        // Temperature ranges per zone
        $tempRanges = [
            'Cooler A' => ['base' => 4.0, 'jitter' => 1.2],
            'Cooler B' => ['base' => 3.5, 'jitter' => 1.0],
            'Freezer' => ['base' => -20.0, 'jitter' => 2.5],
            'Vitrina 1' => ['base' => 6.0, 'jitter' => 1.5],
            'Kitchen' => ['base' => 22.0, 'jitter' => 3.0],
            'Office' => ['base' => 23.0, 'jitter' => 2.0],
        ];

        $readings = [];
        $batchSize = 500;

        foreach ($devices as $device) {
            $zone = $device->zone ?? 'Unassigned';
            $isOffline = in_array($zone, $offlineZones);
            $model = $device->model;
            $metrics = $metricConfig[$model] ?? [];

            if (empty($metrics)) {
                continue;
            }

            // Generate 24 hours of readings at 5-minute intervals
            // Offline devices stop reporting 2 hours ago
            $hoursOfData = $isOffline ? 22 : 24;
            $startOffset = $isOffline ? 120 : 0; // minutes ago to stop

            for ($minutesAgo = $startOffset + ($hoursOfData * 60); $minutesAgo >= $startOffset; $minutesAgo -= 5) {
                $time = $now->copy()->subMinutes($minutesAgo);

                foreach ($metrics as $mc) {
                    $value = $this->generateValue($mc['metric'], $zone, $minutesAgo, $tempRanges);

                    $readings[] = [
                        'time' => $time,
                        'device_id' => $device->id,
                        'metric' => $mc['metric'],
                        'value' => $value,
                        'unit' => $mc['unit'],
                        'created_at' => $time,
                    ];

                    if (count($readings) >= $batchSize) {
                        SensorReading::insertOrIgnore($readings);
                        $readings = [];
                    }
                }
            }

            // Update device last_reading_at
            $lastReadingAt = $isOffline
                ? $now->copy()->subMinutes($startOffset)
                : $now->copy()->subMinutes(rand(1, 8));

            $device->update([
                'last_reading_at' => $lastReadingAt,
                'battery_pct' => $isOffline ? rand(5, 30) : rand(55, 98),
                'rssi' => rand(-95, -60),
            ]);
        }

        // Flush remaining
        if (! empty($readings)) {
            SensorReading::insertOrIgnore($readings);
        }
    }

    private function generateDoorStatus(int $minutesAgo): float
    {
        $hourOfDay = (int) now()->subMinutes($minutesAgo)->format('G');
        $isBusyHour = $hourOfDay >= 8 && $hourOfDay <= 18;
        $openChance = $isBusyHour ? 25 : 5;

        return mt_rand(0, 100) < $openChance ? 1 : 0;
    }

    private function generateValue(string $metric, string $zone, int $minutesAgo, array $tempRanges): float
    {
        // Add a slight time-based drift for realistic charts
        $timeFactor = sin($minutesAgo / 60 * 0.5) * 0.5;

        return match ($metric) {
            'temperature' => round(
                ($tempRanges[$zone]['base'] ?? 20.0)
                + (mt_rand(-100, 100) / 100 * ($tempRanges[$zone]['jitter'] ?? 2.0))
                + $timeFactor,
                2
            ),
            'humidity' => round(55 + mt_rand(-150, 150) / 10 + $timeFactor * 3, 1),
            'door_status' => $this->generateDoorStatus($minutesAgo),
            'current' => round(3.5 + mt_rand(-100, 100) / 100 * 1.5, 2),
            'power' => round(0.8 + mt_rand(-30, 50) / 100 * 0.6, 2),
            'gas_level' => round(mt_rand(0, 50) / 10, 1),
            'co2' => round(400 + mt_rand(-50, 200) + $timeFactor * 20, 0),
            default => round(mt_rand(0, 1000) / 100, 2),
        };
    }
}
