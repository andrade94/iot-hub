<?php

namespace App\Services\Alerts;

use App\Jobs\SendAlertNotification;
use App\Models\Alert;
use App\Models\EscalationChain;
use Illuminate\Support\Facades\Log;

class EscalationService
{
    /**
     * Escalate an alert to a specific level in the chain if not yet acknowledged.
     */
    public function escalate(Alert $alert, EscalationChain $chain, int $level = 1): void
    {
        // Don't escalate if already acknowledged/resolved
        if (in_array($alert->status, ['acknowledged', 'resolved', 'dismissed'])) {
            Log::info('Escalation skipped — alert already handled', [
                'alert_id' => $alert->id,
                'status' => $alert->status,
                'level' => $level,
            ]);

            return;
        }

        // Find the matching level entry in the chain's levels array
        $levelEntry = collect($chain->levels)->firstWhere('level', $level);

        if (! $levelEntry) {
            Log::warning('Escalation level not found in chain', [
                'alert_id' => $alert->id,
                'chain_id' => $chain->id,
                'level' => $level,
            ]);

            return;
        }

        $userIds = $levelEntry['user_ids'] ?? [];
        $channels = $levelEntry['channels'] ?? ['push'];

        Log::info('Escalating alert', [
            'alert_id' => $alert->id,
            'level' => $level,
            'user_ids' => $userIds,
            'channels' => $channels,
        ]);

        foreach ($userIds as $userId) {
            foreach ($channels as $channel) {
                SendAlertNotification::dispatch($alert, $userId, $channel);
            }
        }
    }
}
