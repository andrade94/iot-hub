<?php

namespace App\Events;

use App\Models\Alert;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AlertTriggered implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Alert $alert,
    ) {}

    /**
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("site.{$this->alert->site_id}"),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->alert->id,
            'severity' => $this->alert->severity,
            'status' => $this->alert->status,
            'device_id' => $this->alert->device_id,
            'data' => $this->alert->data,
            'triggered_at' => $this->alert->triggered_at?->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'alert.triggered';
    }
}
