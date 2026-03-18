<?php

namespace App\Jobs;

use App\Models\Device;
use App\Models\WorkOrder;
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

    /**
     * Dispatch only if no open work order of the same type exists for this device.
     */
    public static function dispatchIfNotDuplicate(Device $device, string $type, string $title): void
    {
        $exists = WorkOrder::where('device_id', $device->id)
            ->where('type', $type)
            ->whereIn('status', ['open', 'in_progress', 'assigned'])
            ->exists();

        if ($exists) {
            return;
        }

        $priority = match ($type) {
            'device_offline', 'gateway_offline' => 'high',
            'low_battery' => 'medium',
            default => 'medium',
        };

        static::dispatch($device->id, $type, $priority, $title);
    }
}
