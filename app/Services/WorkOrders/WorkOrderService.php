<?php

namespace App\Services\WorkOrders;

use App\Models\Alert;
use App\Models\Device;
use App\Models\WorkOrder;
use Illuminate\Support\Facades\Log;

class WorkOrderService
{
    /**
     * Create a work order linked to an existing alert.
     */
    public function createFromAlert(Alert $alert, string $type, string $priority): WorkOrder
    {
        $workOrder = WorkOrder::create([
            'site_id' => $alert->site_id,
            'alert_id' => $alert->id,
            'device_id' => $alert->device_id,
            'type' => $type,
            'title' => 'WO: ' . ($alert->rule?->name ?? 'Alert') . ' — ' . ($alert->device?->name ?? 'Unknown device'),
            'priority' => $priority,
            'status' => 'open',
        ]);

        Log::info('Work order created from alert', [
            'work_order_id' => $workOrder->id,
            'alert_id' => $alert->id,
            'type' => $type,
        ]);

        return $workOrder;
    }

    /**
     * Create a work order triggered by a health check or automated rule.
     */
    public function createFromTrigger(Device $device, string $type, string $priority, string $title): WorkOrder
    {
        $workOrder = WorkOrder::create([
            'site_id' => $device->site_id,
            'device_id' => $device->id,
            'type' => $type,
            'title' => $title,
            'priority' => $priority,
            'status' => 'open',
        ]);

        Log::info('Work order created from trigger', [
            'work_order_id' => $workOrder->id,
            'device_id' => $device->id,
            'type' => $type,
        ]);

        return $workOrder;
    }

    /**
     * Complete a work order and auto-resolve the linked alert if present.
     * Resolution failures on terminal alerts are logged and swallowed so the
     * WO completion itself still succeeds.
     */
    public function complete(WorkOrder $wo, int $userId): void
    {
        $wo->complete();

        $alertResolved = false;
        if ($wo->alert_id && $wo->alert && in_array($wo->alert->status, ['active', 'acknowledged'])) {
            try {
                $wo->alert->resolve($userId, 'work_order');
                $alertResolved = true;
            } catch (\InvalidArgumentException $e) {
                Log::warning('Could not auto-resolve linked alert on WO completion', [
                    'work_order_id' => $wo->id,
                    'alert_id' => $wo->alert_id,
                    'alert_status' => $wo->alert->status,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('Work order completed', [
            'work_order_id' => $wo->id,
            'completed_by' => $userId,
            'alert_resolved' => $alertResolved,
        ]);
    }
}
