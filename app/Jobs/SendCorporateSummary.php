<?php

namespace App\Jobs;

use App\Models\Organization;
use App\Models\User;
use App\Services\Reports\MorningSummaryService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

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
                fn (User $user) => $user->hasRole('org_admin'),
            );

            if ($orgAdmins->isEmpty()) {
                continue;
            }

            Log::info('Generating corporate summary for organization', [
                'org_id' => $org->id,
                'org_name' => $org->name,
            ]);

            $summary = $summaryService->generateCorporateSummary($org);

            foreach ($orgAdmins as $admin) {
                // TODO Phase 4: Send email digest via Mailable
                Log::info('Corporate summary dispatched to org_admin', [
                    'user_id' => $admin->id,
                    'user_name' => $admin->name,
                    'org_name' => $org->name,
                    'site_count' => $summary['site_count'],
                    'total_alerts_24h' => $summary['total_alerts_24h'],
                    'total_active_alerts' => $summary['total_active_alerts'],
                    'device_totals' => $summary['device_totals'],
                ]);
            }
        }
    }
}
