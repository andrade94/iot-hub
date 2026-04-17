<?php

namespace App\Jobs;

use App\Models\Device;
use App\Services\ChirpStack\DeviceProvisioner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProvisionDeviceOnChirpStack implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public int $deviceId,
    ) {}

    public function handle(DeviceProvisioner $provisioner): void
    {
        $device = Device::with('site')->find($this->deviceId);

        if (! $device) {
            Log::warning('ProvisionDeviceOnChirpStack: device not found', ['id' => $this->deviceId]);

            return;
        }

        $applicationId = $device->site?->chirpstack_application_id;
        if (! $applicationId) {
            Log::info('ProvisionDeviceOnChirpStack: site has no chirpstack_application_id, skipping', [
                'device_id' => $device->id,
                'site_id' => $device->site_id,
            ]);

            return;
        }

        $deviceProfileId = config("services.chirpstack.device_profiles.{$device->model}", '');
        if (! $deviceProfileId) {
            Log::warning('ProvisionDeviceOnChirpStack: no device profile configured for model', [
                'device_id' => $device->id,
                'model' => $device->model,
            ]);

            return;
        }

        $success = $provisioner->provisionDevice($device, $applicationId, $deviceProfileId);

        if (! $success) {
            Log::error('ProvisionDeviceOnChirpStack: provisioning failed, will retry', [
                'device_id' => $device->id,
                'attempt' => $this->attempts(),
            ]);

            $this->release($this->backoff);
        }
    }

    /**
     * Determine if provisioning should be attempted.
     * Returns false when ChirpStack is not configured — the job
     * never fires in that case (checked at dispatch site).
     */
    public static function shouldDispatch(): bool
    {
        return (bool) config('services.chirpstack.api_key');
    }
}
