<?php

namespace App\Services\Devices;

use App\Models\AlertRule;
use App\Models\Device;

class DeviceReplacementService
{
    /**
     * Replace a device: create new device inheriting config, mark old as replaced (BR-059-063).
     */
    public function replace(Device $oldDevice, array $newDeviceData): Device
    {
        // Create new device inheriting config from old (BR-059)
        $newDevice = Device::create([
            'site_id' => $oldDevice->site_id,
            'gateway_id' => $oldDevice->gateway_id,
            'model' => $newDeviceData['new_model'] ?? $oldDevice->model,
            'dev_eui' => $newDeviceData['new_dev_eui'],
            'app_key' => $newDeviceData['new_app_key'],
            'name' => $oldDevice->name,
            'zone' => $oldDevice->zone,
            'floor_id' => $oldDevice->floor_id,
            'floor_x' => $oldDevice->floor_x,
            'floor_y' => $oldDevice->floor_y,
            'recipe_id' => $oldDevice->recipe_id,
            'status' => 'pending',
            'replaced_device_id' => $oldDevice->id,
        ]);

        // Transfer alert rule bindings to new device
        AlertRule::where('device_id', $oldDevice->id)
            ->update(['device_id' => $newDevice->id]);

        // Mark old device as replaced (BR-060)
        $oldDevice->update(['status' => 'replaced']);

        activity()
            ->performedOn($newDevice)
            ->causedBy(auth()->user())
            ->withProperties([
                'old_device_id' => $oldDevice->id,
                'old_dev_eui' => $oldDevice->dev_eui,
                'new_dev_eui' => $newDevice->dev_eui,
            ])
            ->log("Device {$oldDevice->name} replaced: {$oldDevice->dev_eui} → {$newDevice->dev_eui}");

        return $newDevice;
    }
}
