<?php

namespace App\Notifications;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PlatformOutageAlert extends Notification
{
    use Queueable;

    public function __construct(
        public ?string $lastReadingAt = null,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (config('mail.mailer') !== 'log') {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $lastAt = $this->lastReadingAt
            ? Carbon::parse($this->lastReadingAt)->diffForHumans()
            : 'unknown';

        return (new MailMessage)
            ->subject('Platform Alert: No sensor data received')
            ->line('No sensor readings have been received platform-wide in the last 10 minutes.')
            ->line("Last reading received: {$lastAt}")
            ->line('Possible cause: MQTT broker down, ChirpStack outage, or network issue.')
            ->action('View Command Center', url('/command-center'))
            ->line('Investigate immediately.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'No sensor data received',
            'message' => 'No readings received platform-wide in 10 minutes. Possible MQTT/ChirpStack outage.',
            'type' => 'error',
            'icon' => 'AlertTriangle',
            'action_url' => '/command-center',
            'action_text' => 'View Command Center',
            'last_reading_at' => $this->lastReadingAt,
        ];
    }
}
