<?php

namespace App\Jobs;

use App\Models\Alert;
use App\Models\AlertNotification;
use App\Models\User;
use App\Services\WhatsApp\TwilioService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendAlertNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public Alert $alert,
        public int $userId,
        public string $channel,
    ) {}

    public function handle(): void
    {
        $user = User::find($this->userId);
        if (! $user) {
            return;
        }

        // Don't send if alert already resolved
        if (in_array($this->alert->status, ['resolved', 'dismissed'])) {
            return;
        }

        $notification = AlertNotification::create([
            'alert_id' => $this->alert->id,
            'user_id' => $this->userId,
            'channel' => $this->channel,
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $success = match ($this->channel) {
            'whatsapp' => $this->sendWhatsApp($user),
            'push' => $this->sendPush($user),
            'email' => $this->sendEmail($user),
            default => false,
        };

        $notification->update([
            'status' => $success ? 'delivered' : 'failed',
            'delivered_at' => $success ? now() : null,
            'error' => $success ? null : "Failed to send via {$this->channel}",
        ]);
    }

    protected function sendWhatsApp(User $user): bool
    {
        return app(TwilioService::class)->sendAlert($this->alert, $user);
    }

    protected function sendPush(User $user): bool
    {
        $device = $this->alert->device;
        $site = $this->alert->site;

        $title = match ($this->alert->severity) {
            'critical' => "CRITICAL Alert — {$site?->name}",
            'high' => "High Alert — {$site?->name}",
            default => "Alert — {$site?->name}",
        };

        $body = $device
            ? "{$device->name}: {$this->alert->severity} alert triggered"
            : "Alert triggered at {$site?->name}";

        return app(\App\Services\Push\PushNotificationService::class)->sendToUser($user, $title, $body, [
            'type' => 'alert',
            'alert_id' => $this->alert->id,
            'site_id' => $this->alert->site_id,
            'severity' => $this->alert->severity,
        ]);
    }

    protected function sendEmail(User $user): bool
    {
        // TODO: Create AlertMail notification
        Log::info('Email notification placeholder', [
            'alert_id' => $this->alert->id,
            'user_id' => $user->id,
        ]);

        return true;
    }
}
