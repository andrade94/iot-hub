<?php

namespace App\Http\Controllers;

use App\Services\Alerts\AlertAnalyticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AlertAnalyticsController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('view alert analytics'), 403);

        $days = (int) $request->input('days', 30);
        $siteId = $request->input('site_id');
        $orgId = $user->hasRole('super_admin') ? null : $user->org_id;

        $service = new AlertAnalyticsService(
            orgId: $orgId,
            siteId: $siteId ? (int) $siteId : null,
            days: $days,
        );

        return Inertia::render('analytics/alerts', [
            'summary' => $service->getSummary(),
            'noisiest_rules' => $service->getNoisiestRules(),
            'trend' => $service->getTrend(),
            'resolution_breakdown' => $service->getResolutionBreakdown(),
            'suggested_tuning' => $service->getSuggestedTuning(),
            'sites' => $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]),
            'filters' => [
                'days' => $days,
                'site_id' => $siteId,
            ],
        ]);
    }
}
