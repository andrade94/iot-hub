<?php

namespace App\Console\Commands;

use App\Jobs\ProcessSensorReading;
use App\Models\Device;
use App\Models\Site;
use Illuminate\Console\Command;

class SimulatorStart extends Command
{
    protected $signature = 'simulator:start
                            {--sites=3 : Number of sites to simulate}
                            {--devices-per-site=10 : Number of devices per site}
                            {--mode=normal : Simulation mode (normal|incidents|onboarding|stress)}
                            {--interval=30 : Seconds between readings}
                            {--duration=0 : Duration in seconds (0 = run until stopped)}';

    protected $description = 'Start the IoT sensor simulator generating realistic Milesight payloads';

    /**
     * Sensor model payload generators.
     */
    protected array $generators = [
        'EM300-TH' => 'generateEM300TH',
        'CT101' => 'generateCT101',
        'WS301' => 'generateWS301',
        'GS101' => 'generateGS101',
        'EM300-PT' => 'generateEM300PT',
        'EM310-UDL' => 'generateEM310UDL',
        'AM307' => 'generateAM307',
    ];

    public function handle(): int
    {
        $mode = $this->option('mode');
        $interval = (int) $this->option('interval');
        $duration = (int) $this->option('duration');
        $maxSites = (int) $this->option('sites');
        $maxDevicesPerSite = (int) $this->option('devices-per-site');

        $devices = Device::with('site')
            ->whereHas('site', fn ($q) => $q->where('status', 'active'))
            ->limit($maxSites * $maxDevicesPerSite)
            ->get();

        if ($devices->isEmpty()) {
            $this->error('No active devices found. Run php artisan migrate:fresh --seed first.');

            return 1;
        }

        $this->info("Simulator started: mode={$mode}, devices={$devices->count()}, interval={$interval}s");
        $this->info('Press Ctrl+C to stop.');

        $startTime = time();
        $iteration = 0;

        while (true) {
            $iteration++;

            foreach ($devices as $device) {
                $generator = $this->generators[$device->model] ?? null;
                if (! $generator) {
                    continue;
                }

                $payload = $this->$generator($device, $mode, $iteration);
                $rssi = rand(-100, -60);

                ProcessSensorReading::dispatch(
                    deviceId: $device->id,
                    payload: $payload,
                    rssi: $rssi,
                );
            }

            $this->line("[".now()->format('H:i:s')."] Iteration {$iteration}: dispatched {$devices->count()} readings");

            if ($duration > 0 && (time() - $startTime) >= $duration) {
                $this->info('Duration reached. Stopping.');
                break;
            }

            sleep($interval);
        }

        return 0;
    }

    /**
     * EM300-TH: Temperature & Humidity.
     */
    protected function generateEM300TH(Device $device, string $mode, int $iteration): string
    {
        $baseTemp = match (true) {
            str_contains($device->zone ?? '', 'Freezer') => -20.0,
            str_contains($device->zone ?? '', 'Cooler') => 4.0,
            str_contains($device->zone ?? '', 'Vitrina') => 3.0,
            default => 22.0,
        };

        $temp = $baseTemp + $this->getVariation($mode, $iteration, 1.5);
        $humidity = 55 + $this->getVariation($mode, $iteration, 10);
        $battery = $device->battery_pct ?? 85;

        // Temperature: channel 01, type 67, signed int16 /10 (little-endian)
        $tempRaw = (int) round($temp * 10);
        if ($tempRaw < 0) {
            $tempRaw = 0x10000 + $tempRaw;
        }

        // Humidity: channel 02, type 68, uint8 *2
        $humRaw = (int) round($humidity * 2);

        // Battery: channel 03, type 75, uint8
        return '0167' . $this->le16($tempRaw)
            . '0268' . sprintf('%02X', min(max($humRaw, 0), 255))
            . '0375' . sprintf('%02X', min(max($battery, 0), 100));
    }

    /**
     * CT101: Current Transformer.
     */
    protected function generateCT101(Device $device, string $mode, int $iteration): string
    {
        $baseCurrent = 12.5; // Amps
        $current = $baseCurrent + $this->getVariation($mode, $iteration, 5);
        $battery = $device->battery_pct ?? 90;

        // Current: channel 01, type 99, uint32 /1000 (little-endian)
        $currentRaw = (int) round(max($current, 0) * 1000);

        return '0199' . $this->le32($currentRaw)
            . '0375' . sprintf('%02X', min(max($battery, 0), 100));
    }

    /**
     * WS301: Door sensor.
     */
    protected function generateWS301(Device $device, string $mode, int $iteration): string
    {
        // Door status flips occasionally
        $doorOpen = ($mode === 'incidents' && $iteration % 3 === 0) ? 1 : (rand(1, 20) === 1 ? 1 : 0);
        $battery = $device->battery_pct ?? 95;

        return sprintf('0300%02X0475%02X', $doorOpen, min(max($battery, 0), 100));
    }

    /**
     * GS101: Gas sensor.
     */
    protected function generateGS101(Device $device, string $mode, int $iteration): string
    {
        $gasAlarm = ($mode === 'incidents' && $iteration % 10 === 0) ? 1 : 0;
        $concentration = $gasAlarm ? rand(600, 1200) : rand(10, 80);

        return '0101' . sprintf('%02X', $gasAlarm) . '0202' . $this->le16($concentration);
    }

    /**
     * EM300-PT: Pressure & Temperature.
     */
    protected function generateEM300PT(Device $device, string $mode, int $iteration): string
    {
        $temp = 25 + $this->getVariation($mode, $iteration, 3);
        $pressure = 750 + $this->getVariation($mode, $iteration, 50); // kPa * 10
        $battery = 85;

        $tempRaw = (int) round($temp * 10);
        if ($tempRaw < 0) {
            $tempRaw = 0x10000 + $tempRaw;
        }

        $pressureRaw = (int) round($pressure * 10);

        return '0167' . $this->le16($tempRaw)
            . '0273' . $this->le16($pressureRaw)
            . '0375' . sprintf('%02X', $battery);
    }

    /**
     * EM310-UDL: Ultrasonic Distance.
     */
    protected function generateEM310UDL(Device $device, string $mode, int $iteration): string
    {
        $distance = 1500 + $this->getVariation($mode, $iteration, 200); // mm
        $battery = 80;

        return '0182' . $this->le16(max(0, (int) $distance)) . '0375' . sprintf('%02X', $battery);
    }

    /**
     * AM307: Indoor Air Quality.
     */
    protected function generateAM307(Device $device, string $mode, int $iteration): string
    {
        $temp = 23 + $this->getVariation($mode, $iteration, 2);
        $humidity = 45 + $this->getVariation($mode, $iteration, 8);
        $co2 = 450 + $this->getVariation($mode, $iteration, 200);
        $tvoc = 100 + $this->getVariation($mode, $iteration, 80);
        $pressure = 1013 + $this->getVariation($mode, $iteration, 5); // hPa * 10
        $battery = 75;

        $tempRaw = (int) round($temp * 10);
        if ($tempRaw < 0) {
            $tempRaw = 0x10000 + $tempRaw;
        }

        $humRaw = (int) round($humidity * 2);

        return '0167' . $this->le16($tempRaw)
            . '0268' . sprintf('%02X', min(max($humRaw, 0), 255))
            . '037D' . $this->le16(max(0, (int) $co2))
            . '047D' . $this->le16(max(0, (int) $tvoc))
            . '0573' . $this->le16(max(0, (int) round($pressure * 10)))
            . '0675' . sprintf('%02X', $battery);
    }

    /**
     * Encode a 16-bit value as little-endian hex.
     */
    protected function le16(int $value): string
    {
        $value &= 0xFFFF;

        return sprintf('%02X%02X', $value & 0xFF, ($value >> 8) & 0xFF);
    }

    /**
     * Encode a 32-bit value as little-endian hex.
     */
    protected function le32(int $value): string
    {
        $value &= 0xFFFFFFFF;

        return sprintf('%02X%02X%02X%02X',
            $value & 0xFF,
            ($value >> 8) & 0xFF,
            ($value >> 16) & 0xFF,
            ($value >> 24) & 0xFF,
        );
    }

    /**
     * Get variation based on mode.
     */
    protected function getVariation(string $mode, int $iteration, float $range): float
    {
        return match ($mode) {
            'normal' => (mt_rand() / mt_getrandmax() - 0.5) * $range,
            'incidents' => ($iteration % 5 === 0)
                ? $range * (mt_rand() / mt_getrandmax() + 1) // Spike
                : (mt_rand() / mt_getrandmax() - 0.5) * $range * 0.5,
            'stress' => (mt_rand() / mt_getrandmax() - 0.5) * $range * 2,
            'onboarding' => (mt_rand() / mt_getrandmax() - 0.5) * $range * 0.3,
            default => 0,
        };
    }
}
