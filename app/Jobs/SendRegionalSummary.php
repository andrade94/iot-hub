<?php

namespace App\Jobs;

use App\Mail\RegionalSummaryMail;
use App\Models\Site;
use App\Models\User;
use App\Services\Push\PushNotificationService;
use App\Services\Reports\MorningSummaryService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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

            $deviceTotals = $summary['device_totals'];
            $body = "{$summary['site_count']} sites — "
                . "{$deviceTotals['online']}/{$deviceTotals['total']} devices online"
                . ($summary['total_active_alerts'] > 0 ? ", {$summary['total_active_alerts']} active alerts" : '');

            app(PushNotificationService::class)->sendToUser(
                $manager,
                'Regional Summary',
                $body,
                ['type' => 'morning_summary'],
            );

            Mail::to($manager->email)->queue(new RegionalSummaryMail($manager->name, $summary));

            Log::info('Regional summary dispatched to site_manager', [
                'user_id' => $manager->id,
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
