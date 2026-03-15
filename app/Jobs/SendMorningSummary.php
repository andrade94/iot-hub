<?php

namespace App\Jobs;

use App\Models\Site;
use App\Services\Reports\MorningSummaryService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

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

            foreach ($site->users as $user) {
                // TODO Phase 4: Send via notification channel (email/push/in-app)
                Log::info('Morning summary dispatched to user', [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'site_id' => $site->id,
                    'alert_count_24h' => $summary['alert_count_24h'],
                    'device_online' => $summary['device_status']['online'],
                    'device_offline' => $summary['device_status']['offline'],
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
