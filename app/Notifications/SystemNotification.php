<?php

namespace App\Notifications;

use App\Events\NotificationCreated;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SystemNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        private string $title,
        private string $message,
        private string $type = 'info',
        private ?string $actionUrl = null,
        private ?string $actionText = null,
        private bool $sendEmail = false,
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
        $channels = ['database', 'broadcast'];

        if ($this->sendEmail && config('mail.mailer') !== 'log') {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->title);

        // Set level based on type
        $mail->level($this->type === 'error' ? 'error' : ($this->type === 'warning' ? 'warning' : 'info'));

        $mail->greeting("Hello {$notifiable->name}!")
            ->line($this->message);

        if ($this->actionUrl) {
            $mail->action($this->actionText ?? 'View Details', $this->actionUrl);
        }

        $mail->line('Thank you for using '.config('app.name').'!');

        return $mail;
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
            'title' => $this->title,
            'message' => $this->message,
            'type' => $this->type,
            'icon' => $this->getIconForType($this->type),
        ];

        if ($this->actionUrl) {
            $data['action_url'] = $this->actionUrl;
            $data['action_text'] = $this->actionText ?? 'View Details';
        }

        return $data;
    }

    /**
     * Get the icon name for the notification type.
     */
    private function getIconForType(string $type): string
    {
        return match ($type) {
            'success' => 'CheckCircle',
            'warning' => 'AlertTriangle',
            'error' => 'XCircle',
            'info' => 'Info',
            default => 'Bell',
        };
    }
}
