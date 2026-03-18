<?php

namespace App\Jobs;

use App\Models\Device;
use App\Models\Gateway;
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
        $this->checkOfflineGateways();
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

            // Auto-create work order if offline > 2 hours
            if ($device->last_reading_at && $device->last_reading_at->lt(now()->subHours(2))) {
                CreateWorkOrder::dispatchIfNotDuplicate($device, 'device_offline', "Device '{$device->name}' has been offline for over 2 hours.");
            }
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

            // Auto-create work order for battery replacement
            CreateWorkOrder::dispatchIfNotDuplicate($device, 'low_battery', "Device '{$device->name}' battery at {$device->battery_pct}% — needs replacement.");
        }
    }

    /**
     * Detect gateways that haven't been seen in >30 minutes.
     */
    protected function checkOfflineGateways(): void
    {
        $offlineGateways = Gateway::where('status', 'registered')
            ->where(function ($query) {
                $query->whereNull('last_seen_at')
                    ->orWhere('last_seen_at', '<', now()->subMinutes(30));
            })
            ->with('site')
            ->get();

        foreach ($offlineGateways as $gateway) {
            Log::info('Gateway offline', [
                'gateway_id' => $gateway->id,
                'serial' => $gateway->serial,
                'last_seen_at' => $gateway->last_seen_at?->toIso8601String(),
            ]);

            // Auto-create work order for gateway outage — uses first device as reference, or null
            $device = $gateway->devices()->first();
            if ($device) {
                CreateWorkOrder::dispatchIfNotDuplicate($device, 'gateway_offline', "Gateway '{$gateway->model}' ({$gateway->serial}) at {$gateway->site?->name} has been offline for over 30 minutes.");
            }
        }
    }
}
