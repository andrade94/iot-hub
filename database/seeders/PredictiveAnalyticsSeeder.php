<?php

namespace Database\Seeders;

use App\Models\Device;
use App\Models\SensorReading;
use Illuminate\Database\Seeder;

class PredictiveAnalyticsSeeder extends Seeder
{
    /**
     * Seed battery history, compressor trends, and temperature drift patterns
     * so the Predictive Analytics page has realistic data to work with.
     *
     * This creates daily sensor readings spread over 90 days.
     */
    public function run(): void
    {
        $this->command->info('Seeding predictive analytics data...');

        $devices = Device::where('status', 'active')->with('site')->get();

        if ($devices->isEmpty()) {
            $this->command->warn('  No active devices found. Run migrate:fresh --seed first.');
            return;
        }

        $em300Devices = $devices->where('model', 'EM300-TH');
        $ct101Devices = $devices->where('model', 'CT101');
        $ws301Devices = $devices->where('model', 'WS301');

        // ── Battery decline patterns ───────────────────────────────
        // Pick up to 4 devices and give them different drain profiles
        $batteryTargets = $devices->whereNotNull('battery_pct')->take(4)->values();

        $profiles = [
            // Urgent: fast drain, currently at ~18%, 5 days left
            ['start' => 75, 'end' => 18, 'noise' => 1.5],
            // Urgent: fast drain, currently at ~12%, 3 days left
            ['start' => 68, 'end' => 12, 'noise' => 2.0],
            // Warning: moderate drain, currently at ~42%, 22 days left
            ['start' => 82, 'end' => 42, 'noise' => 1.0],
            // Healthy: very slow drain, currently at ~89%
            ['start' => 95, 'end' => 89, 'noise' => 0.5],
        ];

        foreach ($batteryTargets as $idx => $device) {
            $profile = $profiles[$idx] ?? $profiles[3];
            $this->seedBatteryHistory($device, $profile);
            // Update device battery_pct to match the end value
            $device->update(['battery_pct' => (int) $profile['end']]);
        }

        $this->command->info("  - {$batteryTargets->count()} battery decline profiles seeded (90 days)");

        // ── Compressor degradation pattern ─────────────────────────
        // Pick first CT101 and make its current draw increase over 4 weeks
        $compressor = $ct101Devices->first();
        if ($compressor) {
            $this->seedCompressorDegradation($compressor);
            $this->command->info('  - 1 compressor degradation pattern seeded');
        }

        // ── Temperature drift pattern ──────────────────────────────
        // Pick first two EM300-TH and make one drift warm, one drift cool
        $tempDevices = $em300Devices->take(2)->values();
        foreach ($tempDevices as $i => $device) {
            $direction = $i === 0 ? 'warming' : 'cooling';
            $this->seedTemperatureDrift($device, $direction);
        }
        $this->command->info("  - {$tempDevices->count()} temperature drift patterns seeded");

        $this->command->info('Predictive analytics data seeded.');
    }

    /**
     * Create daily battery readings over 90 days showing a decline curve.
     */
    private function seedBatteryHistory(Device $device, array $profile): void
    {
        $readings = [];
        $days = 90;
        $start = $profile['start'];
        $end = $profile['end'];
        $noise = $profile['noise'];

        for ($d = $days; $d >= 0; $d--) {
            $progress = 1 - ($d / $days); // 0 → 1
            $value = $start - (($start - $end) * $progress);
            $value += (mt_rand() / mt_getrandmax() - 0.5) * $noise;
            $value = max(0, min(100, round($value, 1)));

            $readings[] = [
                'device_id' => $device->id,
                'metric' => 'battery',
                'value' => $value,
                'unit' => '%',
                'time' => now()->subDays($d)->startOfDay()->addHours(rand(6, 18)),
                'created_at' => now(),
            ];
        }

        SensorReading::insert($readings);
    }

    /**
     * Create current readings showing compressor degradation:
     * - Days 90–30: stable baseline around 12.5A
     * - Days 30–0: rising 15% per week (4 weeks of degradation)
     */
    private function seedCompressorDegradation(Device $device): void
    {
        $readings = [];
        $baseline = 12.5;

        for ($d = 90; $d >= 0; $d--) {
            $daysAgo = $d;

            if ($daysAgo > 30) {
                // Baseline period — stable
                $value = $baseline + (mt_rand() / mt_getrandmax() - 0.5) * 2;
            } else {
                // Degradation period — rising week over week
                $weeksIntoDegradation = (30 - $daysAgo) / 7;
                $multiplier = 1 + ($weeksIntoDegradation * 0.12); // 12% per week
                $value = $baseline * $multiplier + (mt_rand() / mt_getrandmax() - 0.5) * 2;
            }

            $readings[] = [
                'device_id' => $device->id,
                'metric' => 'current',
                'value' => round(max(0, $value), 2),
                'unit' => 'A',
                'time' => now()->subDays($d)->startOfDay()->addHours(rand(8, 16)),
                'created_at' => now(),
            ];
        }

        SensorReading::insert($readings);
    }

    /**
     * Create temperature readings showing drift:
     * - Days 90–21: stable baseline
     * - Days 21–0: gradual drift in the given direction
     */
    private function seedTemperatureDrift(Device $device, string $direction): void
    {
        $readings = [];
        $isWarming = $direction === 'warming';

        // Determine baseline from zone
        $baseline = match (true) {
            str_contains($device->zone ?? '', 'Freezer') => -19.0,
            str_contains($device->zone ?? '', 'Cooler') => 3.8,
            str_contains($device->zone ?? '', 'Vitrina') => 4.0,
            default => 4.0,
        };

        for ($d = 90; $d >= 0; $d--) {
            if ($d > 21) {
                // Baseline period
                $value = $baseline + (mt_rand() / mt_getrandmax() - 0.5) * 0.8;
            } else {
                // Drift period — gradual shift
                $weeksDrifting = (21 - $d) / 7;
                $driftAmount = $weeksDrifting * ($isWarming ? 0.45 : -0.85);
                $value = $baseline + $driftAmount + (mt_rand() / mt_getrandmax() - 0.5) * 0.6;
            }

            $readings[] = [
                'device_id' => $device->id,
                'metric' => 'temperature',
                'value' => round($value, 2),
                'unit' => '°C',
                'time' => now()->subDays($d)->startOfDay()->addHours(rand(0, 23)),
                'created_at' => now(),
            ];
        }

        SensorReading::insert($readings);
    }
}
