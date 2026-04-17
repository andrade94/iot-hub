<?php

namespace App\Http\Controllers;

use App\Services\Sites\SiteComparisonService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SiteComparisonController extends Controller
{
    public function __invoke(Request $request, SiteComparisonService $service)
    {
        $user = $request->user();
        $sites = $user->accessibleSites();

        $days = (int) $request->input('days', 30);
        if (! in_array($days, [7, 30, 90], true)) {
            $days = 30;
        }

        $rankings = $service->rankAll($sites, $days);
        $stats = $service->getStats($rankings);

        return Inertia::render('sites/compare', [
            'rankings' => $rankings,
            'stats' => $stats,
            'days' => $days,
            'weights' => SiteComparisonService::WEIGHTS,
        ]);
    }

    public function export(Request $request, SiteComparisonService $service)
    {
        $user = $request->user();
        $sites = $user->accessibleSites();
        $days = (int) $request->input('days', 30);
        if (! in_array($days, [7, 30, 90], true)) {
            $days = 30;
        }

        $rankings = $service->rankAll($sites, $days);
        $org = $user->organization;

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.site-comparison', [
            'rankings' => $rankings,
            'days' => $days,
            'orgName' => $org?->name ?? 'Astrea',
            'generatedAt' => now()->toDateTimeString(),
        ]);

        return $pdf->download("site-comparison-{$days}d.pdf");
    }
}
