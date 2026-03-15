<?php

namespace App\Jobs;

use App\Models\Site;
use App\Models\User;
use App\Services\Reports\MorningSummaryService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendRegionalSummary implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    /**
     * Send regional summaries to site_manager users.
     *
     * Runs every minute. For each site_manager, finds the earliest opening
     * hour among their assigned sites and triggers 30 minutes after that.
     * This ensures all sites have had their individual summaries generated
     * before the regional roll-up is sent.
     */
    public function handle(MorningSummaryService $summaryService): void
    {
        $now = now();

        $managers = User::role('site_manager')
            ->whereNotNull('org_id')
            ->with(['sites' => fn ($q) => $q->active()])
            ->get();

        foreach ($managers as $manager) {
            if ($manager->sites->isEmpty()) {
                continue;
            }

            if (! $this->shouldSendSummary($manager, $now)) {
                continue;
            }

            Log::info('Generating regional summary for site_manager', [
                'user_id' => $manager->id,
                'user_name' => $manager->name,
                'site_count' => $manager->sites->count(),
            ]);

            $summary = $summaryService->generateRegionalSummary($manager);

            // TODO Phase 4: Send via notification channel (email/push/in-app)
            Log::info('Regional summary dispatched to site_manager', [
                'user_id' => $manager->id,
                'user_name' => $manager->name,
                'total_alerts_24h' => $summary['total_alerts_24h'],
                'total_active_alerts' => $summary['total_active_alerts'],
                'device_totals' => $summary['device_totals'],
            ]);
        }
    }

    /**
     * Determine if the current time is 30 minutes after the earliest site opening
     * for this manager (in each site's local timezone, converted to UTC).
     */
    protected function shouldSendSummary(User $manager, Carbon $now): bool
    {
        $earliestUtc = null;

        foreach ($manager->sites as $site) {
            if (! $site->timezone || ! $site->opening_hour) {
                continue;
            }

            // Build today's opening time in the site's local timezone, then convert to UTC
            $localOpening = $now->copy()
                ->setTimezone($site->timezone)
                ->setTimeFromTimeString($site->opening_hour->format('H:i:s'))
                ->setTimezone('UTC');

            if ($earliestUtc === null || $localOpening->lt($earliestUtc)) {
                $earliestUtc = $localOpening;
            }
        }

        if ($earliestUtc === null) {
            return false;
        }

        $targetUtc = $earliestUtc->copy()->addMinutes(30);

        return $now->format('Y-m-d H:i') === $targetUtc->format('Y-m-d H:i');
    }
}
