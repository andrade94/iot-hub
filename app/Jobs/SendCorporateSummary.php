<?php

namespace App\Jobs;

use App\Mail\CorporateSummaryMail;
use App\Models\Organization;
use App\Models\User;
use App\Services\Push\PushNotificationService;
use App\Services\Reports\MorningSummaryService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendCorporateSummary implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    /**
     * Send corporate summaries to org_admin users at 8:00 AM.
     *
     * Generates an organization-wide summary including all active sites
     * and dispatches it to each org_admin user. Currently logs the summary
     * as a placeholder for email digest delivery.
     */
    public function handle(MorningSummaryService $summaryService): void
    {
        $organizations = Organization::has('sites')
            ->with('users')
            ->get();

        foreach ($organizations as $org) {
            $orgAdmins = $org->users->filter(
                fn (User $user) => $user->hasRole('client_org_admin'),
            );

            if ($orgAdmins->isEmpty()) {
                continue;
            }

            Log::info('Generating corporate summary for organization', [
                'org_id' => $org->id,
                'org_name' => $org->name,
            ]);

            $summary = $summaryService->generateCorporateSummary($org);

            $pushService = app(PushNotificationService::class);
            $deviceTotals = $summary['device_totals'];
            $body = "{$summary['site_count']} sites — "
                . "{$deviceTotals['online']}/{$deviceTotals['total']} devices online"
                . ($summary['total_active_alerts'] > 0 ? ", {$summary['total_active_alerts']} active alerts" : '');

            foreach ($orgAdmins as $admin) {
                $pushService->sendToUser(
                    $admin,
                    "Corporate Summary — {$org->name}",
                    $body,
                    ['type' => 'morning_summary'],
                );

                Mail::to($admin->email)->queue(new CorporateSummaryMail($org->name, $summary));

                Log::info('Corporate summary dispatched to org_admin', [
                    'user_id' => $admin->id,
                    'org_name' => $org->name,
                ]);
            }
        }
    }
}
