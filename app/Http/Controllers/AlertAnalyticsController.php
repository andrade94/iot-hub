<?php

namespace App\Http\Controllers;

use App\Services\Alerts\AlertAnalyticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AlertAnalyticsController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('view alert analytics'), 403);

        [$days, $siteId, $severity] = $this->parseFilters($request);
        $orgId = $user->hasRole('super_admin') ? null : $user->org_id;

        $service = new AlertAnalyticsService(
            orgId: $orgId,
            siteId: $siteId,
            days: $days,
            severity: $severity,
        );

        $summary = $service->getSummary();
        $mttr = $service->getMttr();
        $noiseScore = $service->getNoiseScore($summary, $mttr);

        // Team performance is gated — shown to managers+ on teams of ≥ 3
        $teamPerformance = $user->hasAnyRole(['super_admin', 'client_org_admin', 'client_site_manager'])
            ? $service->getTeamPerformance(minTeamSize: 3)
            : collect();

        return Inertia::render('analytics/alerts', [
            'summary' => $summary,
            'mttr' => $mttr,
            'ack_histogram' => $service->getAckHistogram(),
            'noise_score' => $noiseScore,
            'noisiest_rules' => $service->getNoisiestRules(),
            'trend' => $service->getTrend(),
            'trend_by_severity' => $service->getTrendBySeverity(),
            'resolution_breakdown' => $service->getResolutionBreakdown(),
            'suggested_tuning' => $service->getSuggestedTuning(),
            'team_performance' => $teamPerformance,
            'sites' => $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]),
            'filters' => [
                'days' => $days,
                'site_id' => $siteId,
                'severity' => $severity,
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('view alert analytics'), 403);

        [$days, $siteId, $severity] = $this->parseFilters($request);
        $orgId = $user->hasRole('super_admin') ? null : $user->org_id;

        $service = new AlertAnalyticsService(
            orgId: $orgId,
            siteId: $siteId,
            days: $days,
            severity: $severity,
        );

        $summary = $service->getSummary();
        $noisiest = $service->getNoisiestRules(50);
        $breakdown = $service->getResolutionBreakdown();
        $trend = $service->getTrend();
        $suggestedTuning = $service->getSuggestedTuning();

        $filename = 'alert-analytics-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($summary, $noisiest, $breakdown, $trend, $suggestedTuning, $days, $siteId, $severity) {
            $out = fopen('php://output', 'w');

            // Filters header
            fputcsv($out, ['# Alert Analytics Export']);
            fputcsv($out, ['# Window (days)', $days]);
            fputcsv($out, ['# Site ID', $siteId ?? 'all']);
            fputcsv($out, ['# Severity', $severity ?? 'all']);
            fputcsv($out, []);

            // Summary
            fputcsv($out, ['# Summary KPIs']);
            fputcsv($out, ['Metric', 'Value']);
            fputcsv($out, ['Total alerts', $summary['total_alerts']]);
            fputcsv($out, ['Dismissal rate %', $summary['dismissal_rate']]);
            fputcsv($out, ['Avg response (min)', $summary['avg_response_minutes'] ?? '']);
            fputcsv($out, ['Auto-resolved %', $summary['auto_resolved_pct']]);
            fputcsv($out, []);

            // Resolution breakdown
            fputcsv($out, ['# Resolution Breakdown']);
            fputcsv($out, ['Type', 'Count']);
            foreach ($breakdown as $type => $count) {
                fputcsv($out, [$type, $count]);
            }
            fputcsv($out, []);

            // Noisiest rules
            fputcsv($out, ['# Noisiest Rules']);
            fputcsv($out, ['Rule ID', 'Rule Name', 'Site ID', 'Alert Count', 'Dismissal Rate %']);
            foreach ($noisiest as $rule) {
                fputcsv($out, [
                    $rule['rule_id'],
                    $rule['rule_name'],
                    $rule['site_id'],
                    $rule['alert_count'],
                    $rule['dismissal_rate'],
                ]);
            }
            fputcsv($out, []);

            // Trend
            fputcsv($out, ['# Daily Trend']);
            fputcsv($out, ['Date', 'Count']);
            foreach ($trend as $date => $count) {
                fputcsv($out, [$date, $count]);
            }
            fputcsv($out, []);

            // Suggested tuning
            fputcsv($out, ['# Suggested Tuning']);
            fputcsv($out, ['Rule ID', 'Rule Name', 'Weekly Rate', 'Suggestion']);
            foreach ($suggestedTuning as $rule) {
                fputcsv($out, [
                    $rule['rule_id'],
                    $rule['rule_name'],
                    $rule['weekly_rate'],
                    $rule['suggestion'],
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * @return array{0:int,1:?int,2:?string} [days, siteId, severity]
     */
    private function parseFilters(Request $request): array
    {
        $days = (int) $request->input('days', 30);
        $siteId = $request->filled('site_id') ? (int) $request->input('site_id') : null;
        $severity = $request->input('severity');
        if (! in_array($severity, ['critical', 'high', 'medium', 'low'], true)) {
            $severity = null;
        }
        return [$days, $siteId, $severity];
    }
}
