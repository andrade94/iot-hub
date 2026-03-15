<?php

namespace App\Services\Api;

use App\Models\WebhookSubscription;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookDispatcher
{
    /**
     * Dispatch a webhook event to all matching active subscriptions for an organization.
     *
     * @param  string  $event  The event name (e.g., 'alert.created', 'reading.threshold')
     * @param  array<string, mixed>  $data  The payload to send
     * @param  int  $orgId  The organization ID to scope subscriptions
     * @return int Number of webhooks dispatched
     */
    public function dispatch(string $event, array $data, int $orgId): int
    {
        $subscriptions = WebhookSubscription::where('org_id', $orgId)
            ->where('active', true)
            ->get()
            ->filter(fn (WebhookSubscription $sub) => in_array($event, $sub->events ?? []));

        $dispatched = 0;

        foreach ($subscriptions as $subscription) {
            try {
                $payload = [
                    'event' => $event,
                    'timestamp' => now()->toIso8601String(),
                    'data' => $data,
                ];

                $payloadJson = json_encode($payload);
                $signature = hash_hmac('sha256', $payloadJson, $subscription->secret);

                $response = Http::timeout(10)
                    ->withHeaders([
                        'Content-Type' => 'application/json',
                        'X-Webhook-Signature' => $signature,
                        'X-Webhook-Event' => $event,
                    ])
                    ->withBody($payloadJson, 'application/json')
                    ->post($subscription->url);

                if ($response->successful()) {
                    $subscription->update([
                        'last_triggered_at' => now(),
                        'failure_count' => 0,
                    ]);
                    $dispatched++;
                } else {
                    $this->handleFailure($subscription, $response->status());
                }
            } catch (\Throwable $e) {
                Log::warning('Webhook dispatch failed', [
                    'subscription_id' => $subscription->id,
                    'url' => $subscription->url,
                    'event' => $event,
                    'error' => $e->getMessage(),
                ]);
                $this->handleFailure($subscription);
            }
        }

        return $dispatched;
    }

    /**
     * Handle a failed webhook delivery by incrementing the failure count
     * and deactivating the subscription after too many failures.
     */
    protected function handleFailure(WebhookSubscription $subscription, ?int $statusCode = null): void
    {
        $failureCount = $subscription->failure_count + 1;

        $updates = [
            'failure_count' => $failureCount,
            'last_triggered_at' => now(),
        ];

        // Deactivate after 10 consecutive failures
        if ($failureCount >= 10) {
            $updates['active'] = false;

            Log::warning('Webhook subscription deactivated due to repeated failures', [
                'subscription_id' => $subscription->id,
                'url' => $subscription->url,
                'failure_count' => $failureCount,
                'last_status_code' => $statusCode,
            ]);
        }

        $subscription->update($updates);
    }
}
