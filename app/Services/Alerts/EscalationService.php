<?php

namespace App\Services\Alerts;

use App\Jobs\SendAlertNotification;
use App\Models\Alert;
use App\Models\EscalationChain;
use Illuminate\Support\Facades\Log;

class EscalationService
{
    /**
     * Escalate an alert to the next level if not yet acknowledged.
     */
    public function escalate(Alert $alert, EscalationChain $chain): void
    {
        // Don't escalate if already acknowledged/resolved
        if (in_array($alert->status, ['acknowledged', 'resolved', 'dismissed'])) {
            Log::info('Escalation skipped — alert already handled', [
                'alert_id' => $alert->id,
                'status' => $alert->status,
                'level' => $chain->level,
            ]);

            return;
        }

        Log::info('Escalating alert', [
            'alert_id' => $alert->id,
            'level' => $chain->level,
            'user_id' => $chain->user_id,
            'channel' => $chain->channel,
        ]);

        SendAlertNotification::dispatch($alert, $chain->user_id, $chain->channel);
    }
}
