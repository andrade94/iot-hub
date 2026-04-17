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

        // Clamp allowed ranges to the pills the UI exposes.
        if (! in_array($days, [7, 30, 90], true)) {
            $days = 30;
        }

        $service = new PerformanceAnalyticsService($orgId, $days);

        return Inertia::render('analytics/performance', [
            'days' => $days,
            'execKpis' => $service->getExecKpis(),
            'slaBanner' => $service->getSlaBanner(),
            'slaTrend' => $service->getSlaTrend(),
            'uptimeTrend' => $service->getUptimeTrend(),
            'woHistogram' => $service->getWorkOrderHistogram(),
            'breachedSlas' => $service->getBreachedSlas(),
            'improvements' => $service->getImprovements(),
            'deviceReliability' => $service->getDeviceReliabilityByModel(),
            'siteBreakdown' => $service->getSiteBreakdown(),
            'technicians' => $service->getTechnicianPerformance(),
            'incidents' => $service->getCriticalIncidents(),
        ]);
    }
}
