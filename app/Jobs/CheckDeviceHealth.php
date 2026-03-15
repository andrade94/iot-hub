<?php

namespace App\Jobs;

use App\Models\Device;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CheckDeviceHealth implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function handle(): void
    {
        $this->checkOfflineDevices();
        $this->checkLowBatteryDevices();
    }

    /**
     * Detect devices that haven't reported in >15 minutes.
     */
    protected function checkOfflineDevices(): void
    {
        $offlineDevices = Device::where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('last_reading_at')
                    ->orWhere('last_reading_at', '<', now()->subMinutes(15));
            })
            ->get();

        foreach ($offlineDevices as $device) {
            $device->update(['status' => 'offline']);

            Log::info('Device marked offline', [
                'device_id' => $device->id,
                'dev_eui' => $device->dev_eui,
                'last_reading_at' => $device->last_reading_at?->toIso8601String(),
            ]);

            // TODO Phase 2: Create alert via AlertRouter
            // TODO Phase 6: Auto-create work order if offline > 2h
        }
    }

    /**
     * Detect devices with low battery (<20%).
     */
    protected function checkLowBatteryDevices(): void
    {
        $lowBatteryDevices = Device::where('status', 'active')
            ->whereNotNull('battery_pct')
            ->where('battery_pct', '<', 20)
            ->get();

        foreach ($lowBatteryDevices as $device) {
            Log::info('Device low battery', [
                'device_id' => $device->id,
                'dev_eui' => $device->dev_eui,
                'battery_pct' => $device->battery_pct,
            ]);

            // TODO Phase 2: Create alert via AlertRouter
            // TODO Phase 6: Auto-create work order for battery replacement
        }
    }
}
