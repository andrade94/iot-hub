<?php

namespace App\Http\Controllers;

use App\Services\Sites\SiteComparisonService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SiteComparisonController extends Controller
{
    public function export(Request $request, SiteComparisonService $service)
    {
        $user = $request->user();
        $sites = $user->accessibleSites();
        $metric = $request->input('metric', 'compliance');
        $days = (int) $request->input('days', 30);

        $rankings = $service->rank($sites, $metric, $days);
        $org = $user->organization;

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.site-comparison', [
            'rankings' => $rankings,
            'metric' => $metric,
            'days' => $days,
            'orgName' => $org?->name ?? 'Astrea',
            'generatedAt' => now()->toDateTimeString(),
        ]);

        return $pdf->download("site-comparison-{$metric}-{$days}d.pdf");
    }

    public function __invoke(Request $request, SiteComparisonService $service)
    {
        $user = $request->user();
        $sites = $user->accessibleSites();

        $metric = $request->input('metric', 'compliance');
        $days = (int) $request->input('days', 30);

        $rankings = $service->rank($sites, $metric, $days);

        return Inertia::render('sites/compare', [
            'rankings' => $rankings,
            'metric' => $metric,
            'days' => $days,
            'sites' => $sites->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]),
        ]);
    }
}
