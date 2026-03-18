<?php

namespace App\Services\WhatsApp;

use App\Models\Alert;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TwilioService
{
    protected string $accountSid;

    protected string $authToken;

    protected string $fromNumber;

    public function __construct()
    {
        $this->accountSid = config('services.twilio.account_sid', '');
        $this->authToken = config('services.twilio.auth_token', '');
        $this->fromNumber = config('services.twilio.whatsapp_from', '');
    }

    /**
     * Send a WhatsApp alert notification.
     */
    public function sendAlert(Alert $alert, User $user): bool
    {
        $phone = $user->whatsapp_phone;
        if (! $phone) {
            Log::warning('User has no WhatsApp phone', ['user_id' => $user->id]);

            return false;
        }

        $template = $this->getTemplate($alert);

        return $this->sendMessage($phone, $template);
    }

    /**
     * Send a freeform WhatsApp message to a phone number.
     */
    public function sendFreeformMessage(string $to, string $body): bool
    {
        return $this->sendMessage($to, $body);
    }

    /**
     * Send a WhatsApp message via Twilio API.
     */
    protected function sendMessage(string $to, string $body): bool
    {
        if (! $this->accountSid || ! $this->authToken) {
            Log::debug('Twilio not configured — skipping WhatsApp');

            return false;
        }

        try {
            $response = Http::asForm()
                ->withBasicAuth($this->accountSid, $this->authToken)
                ->post(
                    "https://api.twilio.com/2010-04-01/Accounts/{$this->accountSid}/Messages.json",
                    [
                        'From' => "whatsapp:{$this->fromNumber}",
                        'To' => "whatsapp:{$to}",
                        'Body' => $body,
                    ],
                );

            if ($response->successful()) {
                return true;
            }

            Log::error('Twilio WhatsApp send failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        } catch (\Exception $e) {
            Log::error('Twilio WhatsApp exception', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Get the message template for an alert severity.
     */
    protected function getTemplate(Alert $alert): string
    {
        $data = $alert->data ?? [];
        $deviceName = $data['device_name'] ?? 'Unknown';
        $metric = $data['metric'] ?? '';
        $value = $data['value'] ?? '';
        $threshold = $data['threshold'] ?? '';
        $zone = $data['zone'] ?? '';
        $siteName = $alert->site?->name ?? 'Unknown';

        return match ($alert->severity) {
            'critical' => "🔴 *ALERTA CRÍTICA*\n\n"
                . "📍 {$siteName}" . ($zone ? " — {$zone}" : '') . "\n"
                . "📡 {$deviceName}\n"
                . "📊 {$metric}: {$value} (límite: {$threshold})\n\n"
                . "⏰ " . now()->format('H:i d/m/Y') . "\n\n"
                . "Responder:\n"
                . "✅ ACK — Reconocer\n"
                . "🔼 ESC — Escalar",

            'high' => "🟠 *Alerta Alta*\n\n"
                . "📍 {$siteName}" . ($zone ? " — {$zone}" : '') . "\n"
                . "📡 {$deviceName}\n"
                . "📊 {$metric}: {$value} (límite: {$threshold})\n\n"
                . "⏰ " . now()->format('H:i d/m/Y'),

            default => "🟡 *Alerta*\n\n"
                . "📍 {$siteName} — {$deviceName}\n"
                . "📊 {$metric}: {$value}\n\n"
                . "⏰ " . now()->format('H:i d/m/Y'),
        };
    }

    /**
     * Process a Twilio webhook callback (button reply).
     */
    public function processWebhook(array $payload): ?array
    {
        $body = strtoupper(trim($payload['Body'] ?? ''));
        $from = str_replace('whatsapp:', '', $payload['From'] ?? '');

        if (! $from) {
            return null;
        }

        $action = match (true) {
            str_contains($body, 'ACK') => 'acknowledge',
            str_contains($body, 'ESC') => 'escalate',
            default => null,
        };

        if (! $action) {
            return null;
        }

        return [
            'action' => $action,
            'phone' => $from,
        ];
    }
}
