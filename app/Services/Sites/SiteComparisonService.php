<?php

namespace App\Services\Sites;

use App\Models\Alert;
use App\Models\ComplianceEvent;
use App\Models\Device;
use App\Models\Site;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SiteComparisonService
{
    /**
     * Composite score weights (total = 1.0).
     * Exposed publicly so the frontend can show them in a tooltip.
     */
    public const WEIGHTS = [
        'uptime' => 0.25,
        'sla' => 0.30,
        'alert_rate' => 0.20,
        'mttr' => 0.15,
        'compliance' => 0.10,
    ];

    private const SLA_HOURS = [
        'urgent' => 2,
        'high' => 4,
        'medium' => 24,
        'low' => 72,
    ];

    /**
     * Rank all accessible sites by composite score, returning per-site
     * multi-metric data for both the ranking table and head-to-head.
     */
    public function rankAll(Collection $sites, int $days = 30): array
    {
        $since = now()->subDays($days);

        $rows = $sites->map(fn (Site $site) => $this->computeSiteMetrics($site, $since, $days));

        // Compute fleet-wide max alert count for normalizing the alert-rate score.
        $maxAlerts = $rows->max('alert_count') ?: 1;

        $rows = $rows->map(function (array $row) use ($maxAlerts) {
            $row['composite'] = $this->computeComposite($row, $maxAlerts);
            return $row;
        });

        return $rows
            ->sortByDesc('composite')
            ->values()
            ->toArray();
    }

    /**
     * Stats for the 4-cell strip.
     */
    public function getStats(array $rankings): array
    {
        if (empty($rankings)) {
            return [
                'total_sites' => 0,
                'top_performer' => null,
                'fleet_composite' => 0,
                'fleet_composite_delta' => null,
                'biggest_drop' => null,
            ];
        }

        $composites = array_column($rankings, 'composite');
        $fleetAvg = count($composites) > 0
            ? round(array_sum($composites) / count($composites), 1)
            : 0;

        // Top performer (highest composite).
        $top = $rankings[0];

        // Biggest drop (lowest composite or biggest negative delta).
        $worst = $rankings[count($rankings) - 1];

        return [
            'total_sites' => count($rankings),
            'top_performer' => [
                'site_name' => $top['site_name'],
                'composite' => $top['composite'],
                'uptime' => $top['uptime_pct'],
            ],
            'fleet_composite' => $fleetAvg,
            'fleet_composite_delta' => null, // Would need historical snapshots — defer
            'biggest_drop' => count($rankings) >= 2 ? [
                'site_name' => $worst['site_name'],
                'composite' => $worst['composite'],
                'alert_count' => $worst['alert_count'],
            ] : null,
        ];
    }

    // ─────────────────────────────────────────────────────────────
    //  Per-site metric computation (all PHP-side, Postgres-safe)
    // ─────────────────────────────────────────────────────────────

    private function computeSiteMetrics(Site $site, Carbon $since, int $days): array
    {
        // Device uptime.
        $totalDevices = Device::where('site_id', $site->id)->whereIn('status', ['active', 'offline'])->count();
        $onlineDevices = Device::where('site_id', $site->id)->where('status', 'active')->count();
        $uptimePct = $totalDevices > 0 ? round(($onlineDevices / $totalDevices) * 100, 1) : 100.0;

        // Alerts.
        $alertCount = Alert::where('site_id', $site->id)->where('triggered_at', '>=', $since)->count();
        $resolvedCount = Alert::where('site_id', $site->id)
            ->where('triggered_at', '>=', $since)
            ->whereNotNull('resolved_at')
            ->count();
        $compliancePct = $alertCount > 0 ? round(($resolvedCount / $alertCount) * 100, 1) : 100.0;

        // MTTR (work orders, PHP-side for Postgres safety).
        $mttrMinutes = $this->computeMttr($site->id, $since);

        // SLA compliance on closed WOs.
        $slaPct = $this->computeSla($site->id, $since);

        // Work orders completed.
        $woCompleted = WorkOrder::where('site_id', $site->id)
            ->where('status', 'completed')
            ->where('completed_at', '>=', $since)
            ->count();

        // Compliance events YTD.
        $yearStart = now()->startOfYear();
        $ytdEvents = ComplianceEvent::where('site_id', $site->id)
            ->whereIn('status', ['completed', 'overdue'])
            ->where('due_date', '>=', $yearStart)
            ->get(['status', 'due_date', 'completed_at']);
        $ytdTotal = $ytdEvents->count();
        $ytdOnTime = $ytdEvents->filter(function ($e) {
            return $e->status === 'completed' && $e->completed_at && $e->completed_at->lte($e->due_date);
        })->count();
        $complianceYtdPct = $ytdTotal > 0 ? round(($ytdOnTime / $ytdTotal) * 100, 1) : 100.0;

        // Trend sparkline — 7 buckets over the window.
        $sparkline = $this->buildSparkline($site->id, $since, $days);

        return [
            'site_id' => $site->id,
            'site_name' => $site->name,
            'segment' => $site->organization?->segment,
            'device_count' => $totalDevices,
            'uptime_pct' => $uptimePct,
            'sla_pct' => $slaPct,
            'mttr_minutes' => $mttrMinutes,
            'alert_count' => $alertCount,
            'resolved_pct' => $compliancePct,
            'wo_completed' => $woCompleted,
            'compliance_ytd_pct' => $complianceYtdPct,
            'sparkline' => $sparkline,
            'composite' => 0, // filled later after fleet-wide normalization
        ];
    }

    private function computeComposite(array $row, int $maxAlerts): float
    {
        $w = self::WEIGHTS;

        $uptimeScore = $row['uptime_pct'];
        $slaScore = $row['sla_pct'];

        // Alert rate: fewer alerts = higher score. Normalize against the fleet max.
        $alertRateScore = $maxAlerts > 0
            ? (1 - ($row['alert_count'] / $maxAlerts)) * 100
            : 100;

        // MTTR score: faster = higher. Cap at 120 min = 0 score.
        $mttr = $row['mttr_minutes'];
        $mttrScore = $mttr === null ? 50 : max(0, 100 - (($mttr / 120) * 100));

        $complianceScore = $row['compliance_ytd_pct'];

        $composite =
            ($uptimeScore * $w['uptime']) +
            ($slaScore * $w['sla']) +
            ($alertRateScore * $w['alert_rate']) +
            ($mttrScore * $w['mttr']) +
            ($complianceScore * $w['compliance']);

        return round(max(0, min(100, $composite)), 1);
    }

    private function computeMttr(int $siteId, Carbon $since): ?float
    {
        $rows = WorkOrder::where('site_id', $siteId)
            ->where('status', 'completed')
            ->where('completed_at', '>=', $since)
            ->whereNotNull('completed_at')
            ->select('created_at', 'completed_at')
            ->get();

        if ($rows->isEmpty()) {
            return null;
        }

        $total = 0.0;
        foreach ($rows as $wo) {
            $total += $wo->created_at->diffInSeconds($wo->completed_at) / 60;
        }

        return round($total / $rows->count(), 1);
    }

    private function computeSla(int $siteId, Carbon $since): float
    {
        $rows = WorkOrder::where('site_id', $siteId)
            ->where('status', 'completed')
            ->where('completed_at', '>=', $since)
            ->select('priority', 'created_at', 'completed_at')
            ->get();

        if ($rows->isEmpty()) {
            return 100.0;
        }

        $onTime = 0;
        foreach ($rows as $wo) {
            $slaHours = self::SLA_HOURS[$wo->priority] ?? self::SLA_HOURS['medium'];
            if ($wo->completed_at->lte($wo->created_at->copy()->addHours($slaHours))) {
                $onTime++;
            }
        }

        return round(($onTime / $rows->count()) * 100, 1);
    }

    private function buildSparkline(int $siteId, Carbon $since, int $days): array
    {
        $buckets = 7;
        $out = array_fill(0, $buckets, 0);
        $totalSeconds = max(1, $since->diffInSeconds(now()));
        $bucketSeconds = (int) ceil($totalSeconds / $buckets);

        $alerts = Alert::where('site_id', $siteId)
            ->where('triggered_at', '>=', $since)
            ->select('triggered_at')
            ->get();

        foreach ($alerts as $alert) {
            if (! $alert->triggered_at) {
                continue;
            }
            $elapsed = $since->diffInSeconds($alert->triggered_at);
            $idx = min($buckets - 1, (int) floor($elapsed / $bucketSeconds));
            $out[$idx]++;
        }

        return $out;
    }
}
