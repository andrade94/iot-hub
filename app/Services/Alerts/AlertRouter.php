<?php

namespace App\Services\Alerts;

use App\Jobs\EscalateAlert;
use App\Jobs\SendAlertNotification;
use App\Models\Alert;
use App\Models\EscalationChain;
use Illuminate\Support\Facades\Log;

class AlertRouter
{
    /**
     * Route an alert to the appropriate channels based on severity.
     */
    public function route(Alert $alert): void
    {
        $siteId = $alert->site_id;

        // Get escalation chain for this site, ordered by level
        $chains = EscalationChain::where('site_id', $siteId)
            ->orderBy('level')
            ->get();

        if ($chains->isEmpty()) {
            Log::warning('No escalation chain configured for site', [
                'site_id' => $siteId,
                'alert_id' => $alert->id,
            ]);

            // Broadcast via Reverb as fallback
            $this->broadcastAlert($alert);

            return;
        }

        // Determine which levels to notify based on severity
        $levels = $this->getLevelsForSeverity($alert->severity, $chains->max('level'));

        foreach ($chains as $chain) {
            if ($chain->level > max($levels)) {
                continue;
            }

            if ($chain->level === min($levels)) {
                // First level — notify immediately
                SendAlertNotification::dispatch($alert, $chain->user_id, $chain->channel);
            } else {
                // Higher levels — schedule escalation with delay
                $delayMinutes = $chains
                    ->where('level', '<=', $chain->level)
                    ->sum('delay_minutes');

                EscalateAlert::dispatch($alert, $chain)
                    ->delay(now()->addMinutes($delayMinutes));
            }
        }

        // Always broadcast via Reverb for live dashboard
        $this->broadcastAlert($alert);
    }

    /**
     * Determine which escalation levels to trigger based on severity.
     */
    protected function getLevelsForSeverity(string $severity, int $maxLevel): array
    {
        return match ($severity) {
            'critical' => range(1, min($maxLevel, 3)), // All levels up to 3
            'high' => range(1, min($maxLevel, 2)),     // Levels 1-2
            'medium' => [1],                            // Level 1 only
            'low' => [1],                               // Level 1 only
            default => [1],
        };
    }

    /**
     * Broadcast alert via Reverb for real-time dashboard updates.
     */
    protected function broadcastAlert(Alert $alert): void
    {
        try {
            broadcast(new \App\Events\AlertTriggered($alert))->toOthers();
        } catch (\Exception $e) {
            Log::debug('Alert broadcast failed', ['error' => $e->getMessage()]);
        }
    }
}
