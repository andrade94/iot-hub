<?php

namespace App\Http\Controllers;

use App\Services\Analytics\PerformanceAnalyticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PerformanceAnalyticsController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $orgId = $user->hasRole('super_admin') ? null : $user->org_id;
        $days = (int) $request->input('days', 30);

        $service = new PerformanceAnalyticsService($orgId, $days);

        return Inertia::render('analytics/performance', [
            'summary' => $service->getSummary(),
            'trend' => $service->getTrend(),
            'siteBreakdown' => $service->getSiteBreakdown(),
            'days' => $days,
        ]);
    }
}
