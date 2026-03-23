<?php

namespace App\Jobs;

use App\Models\Site;
use App\Services\Compliance\MonitoringGapDetector;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class DetectMonitoringGaps implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $detector = new MonitoringGapDetector(maxGapMinutes: 15);
        $totalAlerts = 0;

        // Only check active sites that have the compliance or cold_chain module
        $sites = Site::where('status', 'active')
            ->whereHas('modules', fn ($q) => $q->whereIn('slug', ['cold_chain', 'compliance']))
            ->get();

        foreach ($sites as $site) {
            $totalAlerts += $detector->checkAndAlert($site);
        }

        if ($totalAlerts > 0) {
            Log::info("DetectMonitoringGaps: {$totalAlerts} gap alert(s) across {$sites->count()} site(s)");
        }
    }
}
