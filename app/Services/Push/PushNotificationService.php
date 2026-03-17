<?php

namespace App\Services\Push;

use App\Models\PushToken;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /**
     * Send a push notification to a user's registered devices.
     */
    public function sendToUser(User $user, string $title, string $body, array $data = []): bool
    {
        $tokens = $user->pushTokens()->pluck('token')->toArray();

        if (empty($tokens)) {
            Log::debug('No push tokens registered for user', ['user_id' => $user->id]);

            return false;
        }

        return $this->send($tokens, $title, $body, $data);
    }

    /**
     * Send a push notification to specific Expo push tokens.
     */
    public function send(array $tokens, string $title, string $body, array $data = []): bool
    {
        if (empty($tokens)) {
            return false;
        }

        $messages = collect($tokens)->map(fn (string $token) => [
            'to' => $token,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'sound' => 'default',
            'priority' => 'high',
        ])->toArray();

        try {
            $response = Http::acceptJson()
                ->post(self::EXPO_PUSH_URL, $messages);

            if ($response->failed()) {
                Log::error('Expo Push API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            $responseData = $response->json('data', []);
            $this->handleReceipts($tokens, $responseData);

            return true;
        } catch (\Exception $e) {
            Log::error('Push notification send failed', [
                'error' => $e->getMessage(),
                'token_count' => count($tokens),
            ]);

            return false;
        }
    }

    /**
     * Handle push receipts — remove invalid/expired tokens.
     */
    private function handleReceipts(array $tokens, array $receipts): void
    {
        foreach ($receipts as $index => $receipt) {
            $status = $receipt['status'] ?? null;

            if ($status === 'error') {
                $errorType = $receipt['details']['error'] ?? null;

                if (in_array($errorType, ['DeviceNotRegistered', 'InvalidCredentials'])) {
                    $token = $tokens[$index] ?? null;
                    if ($token) {
                        PushToken::where('token', $token)->delete();
                        Log::info('Removed invalid push token', ['token' => $token]);
                    }
                }
            }
        }
    }
}
