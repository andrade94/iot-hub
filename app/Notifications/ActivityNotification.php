<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class ActivityNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        private string $activityType,
        private string $description,
        private ?string $resourceUrl = null,
    ) {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }

    /**
     * Get the type of the notification being broadcast.
     */
    public function broadcastType(): string
    {
        return 'notification.created';
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $data = [
            'title' => $this->getTitleForActivityType($this->activityType),
            'message' => $this->description,
            'type' => 'info',
            'icon' => $this->getIconForActivityType($this->activityType),
        ];

        if ($this->resourceUrl) {
            $data['action_url'] = $this->resourceUrl;
            $data['action_text'] = 'View';
        }

        return $data;
    }

    /**
     * Get the title for the activity type.
     */
    private function getTitleForActivityType(string $type): string
    {
        return match ($type) {
            'created' => 'New Item Created',
            'updated' => 'Item Updated',
            'deleted' => 'Item Deleted',
            'published' => 'Content Published',
            'comment' => 'New Comment',
            'mention' => 'You Were Mentioned',
            default => 'Activity Update',
        };
    }

    /**
     * Get the icon name for the activity type.
     */
    private function getIconForActivityType(string $type): string
    {
        return match ($type) {
            'created' => 'Plus',
            'updated' => 'Pencil',
            'deleted' => 'Trash2',
            'published' => 'Send',
            'comment' => 'MessageSquare',
            'mention' => 'AtSign',
            default => 'Activity',
        };
    }
}
