<?php

namespace App\Jobs;

use App\Services\ChirpStack\DeviceProvisioner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class DeprovisionDeviceFromChirpStack implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 2;

    public int $backoff = 10;

    /**
     * We pass the dev_eui directly instead of serializing the Device model
     * because the device may have already been deleted from the DB.
     */
    public function __construct(
        public string $devEui,
    ) {}

    public function handle(DeviceProvisioner $provisioner): void
    {
        if (! $this->devEui) {
            return;
        }

        // Build a minimal object for the provisioner
        $device = new \App\Models\Device;
        $device->dev_eui = $this->devEui;

        $success = $provisioner->deprovisionDevice($device);

        if ($success) {
            Log::info('Device deprovisioned from ChirpStack', ['dev_eui' => $this->devEui]);
        } else {
            Log::warning('Failed to deprovision device from ChirpStack', ['dev_eui' => $this->devEui]);
        }
    }

    public static function shouldDispatch(): bool
    {
        return (bool) config('services.chirpstack.api_key');
    }
}
