<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Services\Reports\EnergyReport;
use App\Services\Reports\TemperatureReport;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
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
