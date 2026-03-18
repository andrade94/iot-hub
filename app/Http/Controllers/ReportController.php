<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Services\Reports\EnergyReport;
use App\Services\Reports\TemperatureReport;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        return Inertia::render('reports/index', [
            'sites' => $sites,
        ]);
    }

    public function temperature(Request $request, Site $site, TemperatureReport $reportService)
    {
        $from = $request->filled('from')
            ? Carbon::parse($request->input('from'))
            : now()->subDays(7);
        $to = $request->filled('to')
            ? Carbon::parse($request->input('to'))
            : now();

        $report = $reportService->generateReport($site, $from, $to);

        return Inertia::render('reports/temperature', [
            'site' => $site,
            'report' => $report,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ]);
    }

    public function energy(Request $request, Site $site, EnergyReport $reportService)
    {
        $from = $request->filled('from')
            ? Carbon::parse($request->input('from'))
            : now()->subDays(30);
        $to = $request->filled('to')
            ? Carbon::parse($request->input('to'))
            : now();

        $report = $reportService->generateConsumptionReport($site, $from, $to);

        return Inertia::render('reports/energy', [
            'site' => $site,
            'report' => $report,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ]);
    }

    public function downloadTemperature(Request $request, Site $site, TemperatureReport $reportService)
    {
        $from = $request->filled('from') ? Carbon::parse($request->input('from')) : now()->subDays(7);
        $to = $request->filled('to') ? Carbon::parse($request->input('to')) : now();

        $report = $reportService->generateReport($site, $from, $to);

        $pdf = Pdf::loadView('pdf.reports.temperature', [
            'site' => $site,
            'report' => $report,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ])->setPaper('letter', 'portrait');

        return $pdf->download("temperature-report-{$site->name}-{$from->format('Y-m-d')}.pdf");
    }

    public function downloadEnergy(Request $request, Site $site, EnergyReport $reportService)
    {
        $from = $request->filled('from') ? Carbon::parse($request->input('from')) : now()->subDays(30);
        $to = $request->filled('to') ? Carbon::parse($request->input('to')) : now();

        $report = $reportService->generateConsumptionReport($site, $from, $to);

        $pdf = Pdf::loadView('pdf.reports.energy', [
            'site' => $site,
            'report' => $report,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ])->setPaper('letter', 'portrait');

        return $pdf->download("energy-report-{$site->name}-{$from->format('Y-m-d')}.pdf");
    }

    public function summary(Request $request, Site $site)
    {
        $morningSummaryService = app(\App\Services\Reports\MorningSummaryService::class);
        $summary = $morningSummaryService->generateStoreSummary($site);

        return Inertia::render('reports/summary', [
            'site' => $site,
            'summary' => $summary,
        ]);
    }
}
