<?php

namespace App\Jobs;

use App\Models\Device;
use App\Services\WorkOrders\WorkOrderService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CreateWorkOrder implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(
        public int $deviceId,
        public string $type,
        public string $priority,
        public string $title,
    ) {}

    public function handle(WorkOrderService $service): void
    {
        $device = Device::find($this->deviceId);

        if (! $device) {
            Log::warning('CreateWorkOrder: device not found', ['device_id' => $this->deviceId]);

            return;
        }

        $service->createFromTrigger($device, $this->type, $this->priority, $this->title);
    }
}
