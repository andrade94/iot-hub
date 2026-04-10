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
        private ?string $severity = null,
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

        // Avg ack time — computed PHP-side for DB portability
        $avgAckMinutes = $this->avgAckMinutes($query);

        // Previous-period comparison for delta chips
        $prev = $this->baseQuery(previous: true);
        $prevTotal = (clone $prev)->count();
        $prevDismissed = (clone $prev)->where('resolution_type', 'dismissed')->count();
        $prevAckMinutes = $this->avgAckMinutes($prev);

        $prevDismissalRate = $prevTotal > 0 ? round(($prevDismissed / $prevTotal) * 100, 1) : 0;
        $currDismissalRate = $total > 0 ? round(($dismissed / $total) * 100, 1) : 0;

        return [
            'total_alerts' => $total,
            'total_delta' => $total - $prevTotal,
            'dismissal_rate' => $currDismissalRate,
            'dismissal_rate_delta' => round($currDismissalRate - $prevDismissalRate, 1),
            'dismissed_count' => $dismissed,
            'avg_ack_minutes' => $avgAckMinutes !== null ? (int) round($avgAckMinutes) : null,
            'avg_ack_minutes_delta' => ($avgAckMinutes !== null && $prevAckMinutes !== null)
                ? (int) round($avgAckMinutes - $prevAckMinutes)
                : null,
            'auto_resolved_pct' => $total > 0 ? round(($autoResolved / $total) * 100, 1) : 0,
            // Kept for backwards compat — old callers still reference this
            'avg_response_minutes' => $avgAckMinutes !== null ? (int) round($avgAckMinutes) : null,
        ];
    }

    /**
     * DB-agnostic average ack time in minutes. Pulls triggered_at + acknowledged_at
     * and computes diff in PHP so we don't depend on JULIANDAY (SQLite-only) or
     * TIMESTAMPDIFF (MySQL) or EXTRACT(EPOCH) (Postgres).
     */
    private function avgAckMinutes($query): ?float
    {
        $pairs = (clone $query)
            ->whereNotNull('acknowledged_at')
            ->select('triggered_at', 'acknowledged_at')
            ->get();

        if ($pairs->isEmpty()) {
            return null;
        }

        $total = 0.0;
        foreach ($pairs as $p) {
            $total += $p->triggered_at->diffInSeconds($p->acknowledged_at) / 60;
        }
        return $total / $pairs->count();
    }

    /**
     * Mean Time To Resolution — triggered_at → resolved_at.
     * Returns {mean, p50, p95, p99, sample_count} in minutes.
     *
     * Fetches raw timestamps and computes diffs PHP-side for DB portability.
     * Safe up to ~10k rows per query; cache for larger datasets.
     */
    public function getMttr(): array
    {
        $pairs = $this->baseQuery()
            ->whereNotNull('resolved_at')
            ->select('triggered_at', 'resolved_at')
            ->get();

        $durations = $pairs
            ->map(fn ($p) => $p->triggered_at->diffInSeconds($p->resolved_at) / 60)
            ->filter(fn ($d) => $d >= 0)
            ->values()
            ->sort()
            ->values();

        if ($durations->isEmpty()) {
            return [
                'mean' => null,
                'p50' => null,
                'p95' => null,
                'p99' => null,
                'sample_count' => 0,
            ];
        }

        return [
            'mean' => (int) round($durations->avg()),
            'p50' => (int) round($this->percentile($durations, 50)),
            'p95' => (int) round($this->percentile($durations, 95)),
            'p99' => (int) round($this->percentile($durations, 99)),
            'sample_count' => $durations->count(),
        ];
    }

    /**
     * 5-bucket histogram of acknowledge times + percentiles.
     * Buckets: <1m, 1-5m, 5-15m, 15-60m, >60m
     */
    public function getAckHistogram(): array
    {
        $pairs = $this->baseQuery()
            ->whereNotNull('acknowledged_at')
            ->select('triggered_at', 'acknowledged_at')
            ->get();

        $durations = $pairs
            ->map(fn ($p) => $p->triggered_at->diffInSeconds($p->acknowledged_at) / 60)
            ->filter(fn ($d) => $d >= 0)
            ->values();

        $buckets = [
            ['label' => '< 1 min', 'max' => 1, 'count' => 0],
            ['label' => '1 – 5 min', 'max' => 5, 'count' => 0],
            ['label' => '5 – 15 min', 'max' => 15, 'count' => 0],
            ['label' => '15 – 60 min', 'max' => 60, 'count' => 0],
            ['label' => '> 1 h', 'max' => PHP_INT_MAX, 'count' => 0],
        ];

        foreach ($durations as $d) {
            foreach ($buckets as &$b) {
                if ($d < $b['max']) {
                    $b['count']++;
                    break;
                }
            }
            unset($b);
        }

        $sorted = $durations->sort()->values();
        $percentiles = $sorted->isEmpty()
            ? ['p50' => null, 'p95' => null, 'p99' => null]
            : [
                'p50' => $this->percentile($sorted, 50),
                'p95' => $this->percentile($sorted, 95),
                'p99' => $this->percentile($sorted, 99),
            ];

        return [
            'buckets' => array_map(fn ($b) => ['label' => $b['label'], 'count' => $b['count']], $buckets),
            'p50' => $percentiles['p50'] !== null ? round($percentiles['p50'], 1) : null,
            'p95' => $percentiles['p95'] !== null ? round($percentiles['p95'], 1) : null,
            'p99' => $percentiles['p99'] !== null ? round($percentiles['p99'], 1) : null,
            'sample_count' => $durations->count(),
        ];
    }

    /**
     * Composite noise score, 0-10. Higher = noisier.
     *
     * Formula (intentionally opinionated; expose weights later via config):
     *   volume_component   = min(total / 2000, 1) * 3.0
     *   dismissal_component = (dismissal_rate / 100) * 4.0
     *   mttr_component     = min(mttr_minutes / 60, 1) * 3.0
     *
     * Rationale: dismissal rate weighted highest because that's the purest
     * "this rule is wasting my team's time" signal. MTTR covers "slow to
     * resolve" which may or may not be rule-related. Volume is scaled so
     * super-high-volume sites don't automatically score 10.
     */
    public function getNoiseScore(array $summary, array $mttr): array
    {
        $total = $summary['total_alerts'] ?? 0;
        $dismissalRate = $summary['dismissal_rate'] ?? 0;
        $mttrMean = $mttr['mean'] ?? 0;

        $volumeComponent = min($total / 2000, 1) * 3.0;
        $dismissalComponent = ($dismissalRate / 100) * 4.0;
        $mttrComponent = min(($mttrMean ?? 0) / 60, 1) * 3.0;

        $score = $volumeComponent + $dismissalComponent + $mttrComponent;

        return [
            'score' => round($score, 1),
            'max' => 10.0,
            'components' => [
                'volume' => round($volumeComponent, 1),
                'dismissal' => round($dismissalComponent, 1),
                'mttr' => round($mttrComponent, 1),
            ],
            'label' => $score < 3 ? 'quiet' : ($score < 6 ? 'moderate' : ($score < 8 ? 'noisy' : 'overwhelming')),
        ];
    }

    /**
     * Top 10 noisiest rules by alert count (BR-067).
     */
    public function getNoisiestRules(int $limit = 10): Collection
    {
        return Alert::query()
            ->join('alert_rules', 'alerts.rule_id', '=', 'alert_rules.id')
            ->whereNotNull('alerts.rule_id')
            ->when($this->siteId, fn ($q) => $q->where('alerts.site_id', $this->siteId))
            ->when($this->orgId, fn ($q) => $q->whereHas('site', fn ($sq) => $sq->where('org_id', $this->orgId)))
            ->when($this->severity, fn ($q) => $q->where('alerts.severity', $this->severity))
            ->where('alerts.triggered_at', '>=', now()->subDays($this->days))
            ->groupBy('alerts.rule_id', 'alert_rules.name', 'alert_rules.site_id', 'alert_rules.severity')
            ->selectRaw('alerts.rule_id, alert_rules.name as rule_name, alert_rules.site_id, alert_rules.severity as rule_severity, COUNT(*) as alert_count')
            ->selectRaw("SUM(CASE WHEN alerts.resolution_type = 'dismissed' THEN 1 ELSE 0 END) as dismissed_count")
            ->orderByDesc('alert_count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'rule_id' => $row->rule_id,
                'rule_name' => $row->rule_name,
                'site_id' => $row->site_id,
                'severity' => $row->rule_severity,
                'alert_count' => $row->alert_count,
                'dismissal_rate' => $row->alert_count > 0
                    ? round(($row->dismissed_count / $row->alert_count) * 100, 1) : 0,
            ]);
    }

    /**
     * Daily alert trend.
     * @deprecated Prefer getTrendBySeverity() for the stacked chart.
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
     * Daily alert trend grouped by severity for the stacked chart.
     * Returns [[date, critical, high, medium, low, total], ...] sorted ascending.
     */
    public function getTrendBySeverity(): array
    {
        $rows = $this->baseQuery()
            ->selectRaw("DATE(triggered_at) as date, severity, COUNT(*) as count")
            ->groupByRaw("DATE(triggered_at), severity")
            ->orderBy('date')
            ->get();

        $byDate = [];
        foreach ($rows as $r) {
            $date = $r->date;
            if (! isset($byDate[$date])) {
                $byDate[$date] = [
                    'date' => $date,
                    'critical' => 0,
                    'high' => 0,
                    'medium' => 0,
                    'low' => 0,
                    'total' => 0,
                ];
            }
            $sev = in_array($r->severity, ['critical', 'high', 'medium', 'low'], true) ? $r->severity : 'low';
            $byDate[$date][$sev] = (int) $r->count;
            $byDate[$date]['total'] += (int) $r->count;
        }

        ksort($byDate);
        return array_values($byDate);
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
     * Per-user triage stats. Requires acknowledged_by to be populated.
     * Hidden for teams below the minimum size to avoid "surveillance" feel.
     */
    public function getTeamPerformance(int $minTeamSize = 3): Collection
    {
        $alerts = $this->baseQuery()
            ->whereNotNull('acknowledged_by')
            ->with('acknowledgedByUser:id,name')
            ->select('id', 'acknowledged_by', 'triggered_at', 'acknowledged_at', 'resolution_type')
            ->get();

        if ($alerts->isEmpty()) {
            return collect();
        }

        // Group PHP-side — handles the time-diff math portably
        $grouped = $alerts->groupBy('acknowledged_by');

        // Only expose individual data when the team is big enough
        if ($grouped->count() < $minTeamSize) {
            return collect();
        }

        return $grouped
            ->map(function ($userAlerts, $userId) {
                $handled = $userAlerts->count();
                $dismissed = $userAlerts->where('resolution_type', 'dismissed')->count();
                $avgAck = $userAlerts->avg(
                    fn ($a) => $a->triggered_at->diffInSeconds($a->acknowledged_at) / 60
                );
                return [
                    'user_id' => (int) $userId,
                    'user_name' => $userAlerts->first()->acknowledgedByUser?->name ?? 'Unknown',
                    'handled_count' => $handled,
                    'avg_ack_minutes' => $avgAck !== null ? round((float) $avgAck, 1) : null,
                    'dismissal_rate' => $handled > 0 ? round(($dismissed / $handled) * 100, 1) : 0,
                ];
            })
            ->sortByDesc('handled_count')
            ->take(10)
            ->values();
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

    /**
     * Linear-interpolation percentile over a sorted collection of floats.
     */
    private function percentile(Collection $sorted, int $p): float
    {
        $count = $sorted->count();
        if ($count === 0) {
            return 0.0;
        }
        if ($count === 1) {
            return (float) $sorted->first();
        }
        $rank = ($p / 100) * ($count - 1);
        $lower = (int) floor($rank);
        $upper = (int) ceil($rank);
        if ($lower === $upper) {
            return (float) $sorted[$lower];
        }
        $weight = $rank - $lower;
        return (float) $sorted[$lower] + ((float) $sorted[$upper] - (float) $sorted[$lower]) * $weight;
    }

    private function baseQuery(bool $previous = false)
    {
        $start = $previous
            ? now()->subDays($this->days * 2)
            : now()->subDays($this->days);
        $end = $previous
            ? now()->subDays($this->days)
            : now();

        return Alert::query()
            ->when($this->siteId, fn ($q) => $q->where('site_id', $this->siteId))
            ->when($this->orgId, fn ($q) => $q->whereHas('site', fn ($sq) => $sq->where('org_id', $this->orgId)))
            ->when($this->severity, fn ($q) => $q->where('severity', $this->severity))
            ->whereBetween('triggered_at', [$start, $end]);
    }
}
