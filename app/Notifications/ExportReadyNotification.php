<?php

namespace App\Notifications;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ExportReadyNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $filename,
        public string $downloadUrl,
        public Carbon $expiresAt
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];

        if (config('mail.mailer') !== 'log') {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Export is Ready')
            ->greeting("Hello {$notifiable->name}!")
            ->line('Your export has been completed and is ready for download.')
            ->line("File: {$this->filename}")
            ->action('Download Export', $this->downloadUrl)
            ->line("This download link will expire on {$this->expiresAt->format('M j, Y')}.")
            ->line('Thank you for using '.config('app.name').'!');
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Export Ready',
            'message' => "Your export ({$this->filename}) is ready for download.",
            'type' => 'success',
            'icon' => 'Download',
            'action_url' => $this->downloadUrl,
            'action_text' => 'Download',
            'expires_at' => $this->expiresAt->toIso8601String(),
        ];
    }
}
