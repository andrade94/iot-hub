<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\WorkOrder;
use App\Services\Push\PushNotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendWorkOrderNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public WorkOrder $workOrder,
        public string $event, // 'assigned' | 'status_changed'
        public ?int $recipientId = null,
    ) {
        $this->onQueue('notifications');
    }

    public function handle(PushNotificationService $pushService): void
    {
        $recipient = $this->resolveRecipient();

        if (! $recipient) {
            return;
        }

        $site = $this->workOrder->site;
        [$title, $body] = $this->buildMessage($site?->name ?? 'Unknown Site');

        $pushService->sendToUser($recipient, $title, $body, [
            'type' => 'work_order',
            'work_order_id' => $this->workOrder->id,
            'site_id' => $this->workOrder->site_id,
            'event' => $this->event,
        ]);

        Log::info('Work order push notification sent', [
            'work_order_id' => $this->workOrder->id,
            'event' => $this->event,
            'recipient_id' => $recipient->id,
        ]);
    }

    private function resolveRecipient(): ?User
    {
        if ($this->recipientId) {
            return User::find($this->recipientId);
        }

        return match ($this->event) {
            'assigned' => $this->workOrder->assignedTo,
            'status_changed' => $this->workOrder->createdBy,
            default => null,
        };
    }

    private function buildMessage(string $siteName): array
    {
        $title = $this->workOrder->title;

        return match ($this->event) {
            'assigned' => [
                "Work Order Assigned — {$siteName}",
                "You've been assigned: {$title}",
            ],
            'status_changed' => [
                "Work Order Updated — {$siteName}",
                "{$title} is now {$this->workOrder->status}",
            ],
            default => [
                "Work Order — {$siteName}",
                $title,
            ],
        };
    }
}
