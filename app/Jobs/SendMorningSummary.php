<?php

namespace App\Jobs;

use App\Mail\MorningSummaryMail;
use App\Models\Site;
use App\Services\Push\PushNotificationService;
use App\Services\Reports\MorningSummaryService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendMorningSummary implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    /**
     * Find sites whose local time matches their opening_hour and dispatch
     * morning summary notifications to their site_viewer users.
     *
     * This job runs every minute. It checks each active site's timezone and
     * opening_hour to determine if the current minute matches the site's
     * configured opening time.
     */
    public function handle(MorningSummaryService $summaryService): void
    {
        $now = now();

        $sites = Site::active()
            ->whereNotNull('timezone')
            ->whereNotNull('opening_hour')
            ->with(['users' => fn ($q) => $q->wherePivot('role', 'site_viewer')])
            ->get();

        foreach ($sites as $site) {
            if (! $this->isOpeningTime($site, $now)) {
                continue;
            }

            Log::info('Generating morning summary for site', [
                'site_id' => $site->id,
                'site_name' => $site->name,
                'timezone' => $site->timezone,
                'opening_hour' => $site->opening_hour?->format('H:i'),
            ]);

            $summary = $summaryService->generateStoreSummary($site);

            $pushService = app(PushNotificationService::class);

            foreach ($site->users as $user) {
                $deviceStatus = $summary['device_status'];
                $body = "{$deviceStatus['online']}/{$deviceStatus['total']} devices online"
                    . ($summary['alert_count_24h'] > 0 ? ", {$summary['alert_count_24h']} alerts (24h)" : '')
                    . ($deviceStatus['offline'] > 0 ? ", {$deviceStatus['offline']} offline" : '');

                $pushService->sendToUser($user, "Good morning — {$site->name}", $body, [
                    'type' => 'morning_summary',
                    'site_id' => $site->id,
                ]);

                Mail::to($user->email)->queue(new MorningSummaryMail($site->name, $summary));

                Log::info('Morning summary dispatched to user', [
                    'user_id' => $user->id,
                    'site_id' => $site->id,
                ]);
            }
        }
    }

    /**
     * Check if the current UTC time matches the site's opening hour in its local timezone.
     */
    protected function isOpeningTime(Site $site, Carbon $now): bool
    {
        $localNow = $now->copy()->setTimezone($site->timezone);
        $openingHour = $site->opening_hour;

        if (! $openingHour) {
            return false;
        }

        return $localNow->format('H:i') === $openingHour->format('H:i');
    }
}
