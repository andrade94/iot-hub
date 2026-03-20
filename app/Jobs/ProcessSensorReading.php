<?php

namespace App\Jobs;

use App\Models\Device;
use App\Services\Decoders\DecoderFactory;
use App\Services\Readings\ReadingStorageService;
use App\Services\Readings\SanityCheckService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessSensorReading implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 10;

    public function __construct(
        public int $deviceId,
        public string $payload,
        public ?int $rssi = null,
    ) {}

    public function handle(DecoderFactory $decoderFactory, ReadingStorageService $storageService, SanityCheckService $sanityService): void
    {
        $device = Device::find($this->deviceId);

        if (! $device) {
            Log::warning('ProcessSensorReading: device not found', ['device_id' => $this->deviceId]);

            return;
        }

        // Decode the payload based on device model
        try {
            $readings = $decoderFactory->decode($device->model, $this->payload);
        } catch (\Exception $e) {
            Log::error('ProcessSensorReading: decode failed', [
                'device_id' => $this->deviceId,
                'model' => $device->model,
                'error' => $e->getMessage(),
            ]);

            return;
        }

        if (empty($readings)) {
            Log::warning('ProcessSensorReading: empty readings', [
                'device_id' => $this->deviceId,
                'model' => $device->model,
            ]);

            return;
        }

        // Sanity check: filter out physically impossible values (BR-086, BR-087, BR-088)
        $readings = $sanityService->validate($device, $readings);

        if (empty($readings)) {
            Log::info('ProcessSensorReading: all readings failed sanity check', [
                'device_id' => $this->deviceId,
                'model' => $device->model,
            ]);

            return;
        }

        // Store readings + update caches
        $storageService->store($device, $readings, $this->rssi);

        // Evaluate alert rules against new readings
        EvaluateAlertRules::dispatch($device->id, $readings);

        // Broadcast via Reverb for live dashboards
        try {
            broadcast(new \App\Events\SensorReadingReceived($device, $readings))->toOthers();
        } catch (\Exception $e) {
            // Broadcasting is optional — don't fail the job
            Log::debug('ProcessSensorReading: broadcast failed', ['error' => $e->getMessage()]);
        }
    }
}
