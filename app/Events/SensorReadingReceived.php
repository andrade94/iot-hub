<?php

namespace App\Events;

use App\Models\Device;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SensorReadingReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Device $device,
        public array $readings,
    ) {}

    /**
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("site.{$this->device->site_id}"),
            new PrivateChannel("device.{$this->device->id}"),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'device_id' => $this->device->id,
            'dev_eui' => $this->device->dev_eui,
            'name' => $this->device->name,
            'readings' => $this->readings,
            'time' => now()->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'sensor.reading';
    }
}
