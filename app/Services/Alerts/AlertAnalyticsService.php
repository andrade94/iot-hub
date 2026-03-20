<?php

namespace App\Services\Alerts;

use App\Models\Alert;
use Illuminate\Support\Collection;

class AlertAnalyticsService
{
    public function __construct(
        private ?int $orgId = null,
        private ?int $siteId = null,
        private int $days = 30,
    ) {}

    /**
     * Summary KPI cards (BR-067).
     */
    public function getSummary(): array
    {
        $query = $this->baseQuery();

        $total = (clone $query)->count();
        $dismissed = (clone $query)->where('resolution_type', 'dismissed')->count();
        $autoResolved = (clone $query)->where('resolution_type', 'auto')->count();

        // Avg response time (alert → acknowledge) in minutes
        $avgResponseMinutes = (clone $query)
            ->whereNotNull('acknowledged_at')
            ->selectRaw("AVG((JULIANDAY(acknowledged_at) - JULIANDAY(triggered_at)) * 1440) as avg_min")
            ->value('avg_min');

        return [
            'total_alerts' => $total,
            'dismissal_rate' => $total > 0 ? round(($dismissed / $total) * 100, 1) : 0,
            'avg_response_minutes' => $avgResponseMinutes !== null ? (int) round($avgResponseMinutes) : null,
            'auto_resolved_pct' => $total > 0 ? round(($autoResolved / $total) * 100, 1) : 0,
        ];
    }

    /**
     * Top 10 noisiest rules by alert count (BR-067).
     */
    public function getNoisiestRules(int $limit = 10): Collection
    {
        return Alert::query()
            ->join('alert_rules', 'alerts.rule_id', '=', 'alert_rules.id')
            ->when($this->siteId, fn ($q) => $q->where('alerts.site_id', $this->siteId))
            ->when($this->orgId, fn ($q) => $q->whereHas('site', fn ($sq) => $sq->where('org_id', $this->orgId)))
            ->where('alerts.triggered_at', '>=', now()->subDays($this->days))
            ->groupBy('alerts.rule_id', 'alert_rules.name', 'alert_rules.site_id')
            ->selectRaw('alerts.rule_id, alert_rules.name as rule_name, alert_rules.site_id, COUNT(*) as alert_count')
            ->selectRaw("SUM(CASE WHEN alerts.resolution_type = 'dismissed' THEN 1 ELSE 0 END) as dismissed_count")
            ->orderByDesc('alert_count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'rule_id' => $row->rule_id,
                'rule_name' => $row->rule_name,
                'site_id' => $row->site_id,
                'alert_count' => $row->alert_count,
                'dismissal_rate' => $row->alert_count > 0
                    ? round(($row->dismissed_count / $row->alert_count) * 100, 1) : 0,
            ]);
    }

    /**
     * Daily alert trend data over the period.
     */
    public function getTrend(): Collection
    {
        return $this->baseQuery()
            ->selectRaw("DATE(triggered_at) as date, COUNT(*) as count")
            ->groupByRaw("DATE(triggered_at)")
            ->orderBy('date')
            ->pluck('count', 'date');
    }

    /**
     * Resolution breakdown (auto vs manual vs work_order vs dismissed).
     */
    public function getResolutionBreakdown(): array
    {
        $query = $this->baseQuery()->whereNotNull('resolved_at');

        return [
            'auto' => (clone $query)->where('resolution_type', 'auto')->count(),
            'manual' => (clone $query)->where('resolution_type', 'manual')->count(),
            'work_order' => (clone $query)->where('resolution_type', 'work_order')->count(),
            'dismissed' => (clone $query)->where('resolution_type', 'dismissed')->count(),
        ];
    }

    /**
     * Rules firing >50x/week with tuning suggestions (BR-068).
     */
    public function getSuggestedTuning(): Collection
    {
        $weeks = max($this->days / 7, 1);

        return $this->getNoisiestRules(20)
            ->map(fn ($rule) => [
                ...$rule,
                'weekly_rate' => (int) round($rule['alert_count'] / $weeks),
            ])
            ->filter(fn ($rule) => $rule['weekly_rate'] >= 50)
            ->map(fn ($rule) => [
                ...$rule,
                'suggestion' => "Fires ~{$rule['weekly_rate']}x/week — consider raising threshold",
            ])
            ->values();
    }

    private function baseQuery()
    {
        return Alert::query()
            ->when($this->siteId, fn ($q) => $q->where('site_id', $this->siteId))
            ->when($this->orgId, fn ($q) => $q->whereHas('site', fn ($sq) => $sq->where('org_id', $this->orgId)))
            ->where('triggered_at', '>=', now()->subDays($this->days));
    }
}
