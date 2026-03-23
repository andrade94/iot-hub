<?php

namespace App\Jobs;

use App\Models\AlertSnooze;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CheckExpiredSnoozes implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $expired = AlertSnooze::expired()
            ->with(['alert', 'user'])
            ->get();

        if ($expired->isEmpty()) {
            return;
        }

        $renotified = 0;

        foreach ($expired as $snooze) {
            $snooze->delete();

            // NT-024: Re-notify if alert is still active or acknowledged
            if (in_array($snooze->alert->status, ['active', 'acknowledged'])) {
                SendAlertNotification::dispatch($snooze->alert, $snooze->user->id, 'push');
                $renotified++;
            }
        }

        if ($renotified > 0) {
            Log::info("CheckExpiredSnoozes: cleaned {$expired->count()} expired snoozes, re-notified {$renotified} users");
        }
    }
}
