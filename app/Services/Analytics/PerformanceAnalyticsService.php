<?php

namespace App\Services\Analytics;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Site;
use App\Models\User;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PerformanceAnalyticsService
{
    private const SLA_HOURS = [
        'urgent' => 2,
        'high' => 4,
        'medium' => 24,
        'low' => 72,
    ];

    /** Prefetched data — loaded once, reused by every method. */
    private Collection $siteIds;
    private Carbon $since;
    private Collection $alerts;
    private Collection $workOrders;
    private Collection $devices;
    private bool $loaded = false;

    public function __construct(
        private ?int $orgId = null,
        private int $days = 30,
    ) {}

    /**
     * Load all data needed for the page in 5 bulk queries.
     * Every public method calls this first — it's idempotent.
     */
    private function load(): void
    {
        if ($this->loaded) {
            return;
        }

        $this->siteIds = $this->orgId
            ? Site::where('org_id', $this->orgId)->pluck('id')
            : Site::pluck('id');

        $this->since = now()->subDays($this->days);

        // Query 1: All alerts in window (+ unresolved for active-critical count).
        $this->alerts = Alert::whereIn('site_id', $this->siteIds)
            ->where(function ($q) {
                $q->where('triggered_at', '>=', $this->since)
                    ->orWhereNull('resolved_at');
            })
            ->with(['site:id,name', 'device:id,name,zone', 'rule:id,name'])
            ->get();

        // Query 2: All work orders in window (+ open ones for breached SLAs).
        $this->workOrders = WorkOrder::whereIn('site_id', $this->siteIds)
            ->where(function ($q) {
                $q->where('created_at', '>=', $this->since)
                    ->orWhereIn('status', ['open', 'assigned', 'in_progress']);
            })
            ->with('site:id,name')
            ->get();

        // Query 3: All devices.
        $this->devices = Device::whereIn('site_id', $this->siteIds)
            ->get(['id', 'site_id', 'model', 'status']);

        $this->loaded = true;
    }

    // ─── Filtered collections (derived from prefetched data) ─────

    private function alertsInWindow(): Collection
    {
        return $this->alerts->filter(fn (Alert $a) => $a->triggered_at && $a->triggered_at->gte($this->since));
    }

    private function completedWosInWindow(): Collection
    {
        return $this->workOrders->filter(
            fn (WorkOrder $wo) => $wo->status === 'completed'
                && $wo->completed_at
                && $wo->completed_at->gte($this->since)
        );
    }

    private function createdWosInWindow(): Collection
    {
        return $this->workOrders->filter(
            fn (WorkOrder $wo) => $wo->created_at && $wo->created_at->gte($this->since)
        );
    }

    private function openWos(): Collection
    {
        return $this->workOrders->filter(
            fn (WorkOrder $wo) => in_array($wo->status, ['open', 'assigned', 'in_progress'])
        );
    }

    private function activeDevices(): Collection
    {
        return $this->devices->whereIn('status', ['active', 'offline']);
    }

    // ─────────────────────────────────────────────────────────────
    //  [A] Executive KPI strip (7 cards)
    // ─────────────────────────────────────────────────────────────

    public function getExecKpis(): array
    {
        $this->load();

        $fleet = $this->activeDevices();
        $totalDevices = $fleet->count();
        $onlineDevices = $fleet->where('status', 'active')->count();
        $uptime = $totalDevices > 0 ? round(($onlineDevices / $totalDevices) * 100, 1) : 100.0;

        $sla = $this->computeSlaFromCollection($this->completedWosInWindow());
        $mttr = $this->computeMttrFromCollection($this->completedWosInWindow());
        $ack = $this->computeAvgAckFromCollection($this->alertsInWindow());

        $completed = $this->completedWosInWindow()->count();
        $created = $this->createdWosInWindow()->count();

        $alertCount = $this->alertsInWindow()->count();
        $alertsWithWo = $this->createdWosInWindow()->whereNotNull('alert_id')->count();
        $conversion = $alertCount > 0 ? round(($alertsWithWo / $alertCount) * 100, 1) : 0.0;

        $activeCritical = $this->alerts
            ->whereIn('severity', ['critical', 'high'])
            ->whereNull('resolved_at')
            ->count();

        return [
            'device_uptime_pct' => $uptime,
            'sla_compliance_pct' => $sla['pct'],
            'sla_target_pct' => 95.0,
            'mttr_minutes' => $mttr,
            'ack_minutes' => $ack,
            'wo_completed' => $completed,
            'wo_created' => $created,
            'alert_to_wo_pct' => $conversion,
            'active_critical' => $activeCritical,
            'total_devices' => $totalDevices,
            'online_devices' => $onlineDevices,
        ];
    }

    // ─────────────────────────────────────────────────────────────
    //  [B] SLA banner + trend
    // ─────────────────────────────────────────────────────────────

    public function getSlaBanner(): array
    {
        $this->load();
        $sla = $this->computeSlaFromCollection($this->completedWosInWindow());

        return [
            'pct' => $sla['pct'],
            'target_pct' => 95.0,
            'total' => $sla['total'],
            'on_time' => $sla['on_time'],
            'breached' => $sla['breached'],
            'is_healthy' => $sla['pct'] >= 95.0,
        ];
    }

    public function getSlaTrend(): array
    {
        $this->load();
        $days = min($this->days, 60);
        $completed = $this->completedWosInWindow();

        // Group completed WOs by date of completion.
        $byDate = $completed->groupBy(fn (WorkOrder $wo) => $wo->completed_at->toDateString());

        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $dateStr = now()->copy()->subDays($i)->toDateString();
            $dayWos = $byDate->get($dateStr, collect());
            $sla = $this->computeSlaFromCollection($dayWos);
            $out[] = [
                'date' => $dateStr,
                'pct' => $sla['pct'],
                'total' => $sla['total'],
            ];
        }

        return $out;
    }

    // ─────────────────────────────────────────────────────────────
    //  [C] Uptime trend (daily estimated device availability)
    // ─────────────────────────────────────────────────────────────

    public function getUptimeTrend(): array
    {
        $this->load();
        $days = min($this->days, 60);
        $totalDevices = $this->devices->count();

        // Group critical/high alerts by trigger date.
        $critAlerts = $this->alertsInWindow()->whereIn('severity', ['critical', 'high']);
        $byDate = $critAlerts->groupBy(fn (Alert $a) => $a->triggered_at->toDateString());

        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $dateStr = now()->copy()->subDays($i)->toDateString();
            $impacted = min($byDate->get($dateStr, collect())->count(), $totalDevices);
            $pct = $totalDevices > 0
                ? round((($totalDevices - $impacted) / $totalDevices) * 100, 2)
                : 100.0;
            $out[] = ['date' => $dateStr, 'pct' => $pct];
        }

        return $out;
    }

    // ─────────────────────────────────────────────────────────────
    //  [D] Work-order throughput histogram
    // ─────────────────────────────────────────────────────────────

    public function getWorkOrderHistogram(): array
    {
        $this->load();
        $days = min($this->days, 30);

        $createdByDate = $this->createdWosInWindow()
            ->groupBy(fn (WorkOrder $wo) => $wo->created_at->toDateString());
        $completedByDate = $this->completedWosInWindow()
            ->groupBy(fn (WorkOrder $wo) => $wo->completed_at->toDateString());

        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $dateStr = now()->copy()->subDays($i)->toDateString();
            $out[] = [
                'date' => $dateStr,
                'created' => $createdByDate->get($dateStr, collect())->count(),
                'completed' => $completedByDate->get($dateStr, collect())->count(),
            ];
        }

        return $out;
    }

    // ─────────────────────────────────────────────────────────────
    //  [B.2] Top breached SLAs
    // ─────────────────────────────────────────────────────────────

    public function getBreachedSlas(int $limit = 5): array
    {
        $this->load();

        return $this->openWos()
            ->map(function (WorkOrder $wo) {
                $slaHours = self::SLA_HOURS[$wo->priority] ?? self::SLA_HOURS['medium'];
                $deadline = $wo->created_at->copy()->addHours($slaHours);
                $overdueMinutes = $deadline->isPast() ? (int) $deadline->diffInMinutes(now()) : 0;

                return [
                    'id' => $wo->id,
                    'title' => $wo->title,
                    'priority' => $wo->priority,
                    'status' => $wo->status,
                    'site_name' => $wo->site?->name,
                    'site_id' => $wo->site_id,
                    'created_at' => $wo->created_at?->toIso8601String(),
                    'sla_hours' => $slaHours,
                    'overdue_minutes' => $overdueMinutes,
                ];
            })
            ->filter(fn ($row) => $row['overdue_minutes'] > 0)
            ->sortByDesc('overdue_minutes')
            ->take($limit)
            ->values()
            ->toArray();
    }

    // ─────────────────────────────────────────────────────────────
    //  [D.2] Recent improvements
    // ─────────────────────────────────────────────────────────────

    public function getImprovements(int $limit = 3): array
    {
        $this->load();
        $halfDays = max(7, (int) floor($this->days / 2));
        $midpoint = now()->copy()->subDays($halfDays);

        $critAlerts = $this->alertsInWindow()->whereIn('severity', ['critical', 'high']);
        $bySite = $critAlerts->groupBy('site_id');

        $sites = Site::whereIn('id', $this->siteIds)->get(['id', 'name'])->keyBy('id');
        $rows = [];

        foreach ($bySite as $siteId => $siteAlerts) {
            $prev = $siteAlerts->filter(fn (Alert $a) => $a->triggered_at->lt($midpoint))->count();
            $current = $siteAlerts->filter(fn (Alert $a) => $a->triggered_at->gte($midpoint))->count();
            $delta = $prev - $current;

            if ($delta <= 0 || $prev === 0) {
                continue;
            }

            $rows[] = [
                'site_id' => $siteId,
                'site_name' => $sites->get($siteId)?->name ?? '—',
                'alerts_before' => $prev,
                'alerts_after' => $current,
                'delta' => $delta,
                'improvement_pct' => round(($delta / $prev) * 100, 1),
            ];
        }

        usort($rows, fn ($a, $b) => $b['improvement_pct'] <=> $a['improvement_pct']);

        return array_slice($rows, 0, $limit);
    }

    // ─────────────────────────────────────────────────────────────
    //  [E] Device reliability by model
    // ─────────────────────────────────────────────────────────────

    public function getDeviceReliabilityByModel(): array
    {
        $this->load();

        $alertsByDevice = $this->alertsInWindow()->groupBy('device_id');
        $critAlertsByDevice = $this->alertsInWindow()
            ->whereIn('severity', ['critical', 'high'])
            ->groupBy('device_id');

        $byModel = $this->devices->whereNotNull('model')->groupBy('model');
        $out = [];

        foreach ($byModel as $model => $group) {
            $total = $group->count();
            $online = $group->where('status', 'active')->count();
            $deviceIds = $group->pluck('id');

            $alerts = $deviceIds->sum(fn ($id) => $alertsByDevice->get($id, collect())->count());
            $criticalAlerts = $deviceIds->sum(fn ($id) => $critAlertsByDevice->get($id, collect())->count());

            $out[] = [
                'model' => $model,
                'total_devices' => $total,
                'online' => $online,
                'uptime_pct' => $total > 0 ? round(($online / $total) * 100, 1) : 100.0,
                'alert_count' => $alerts,
                'critical_alerts' => $criticalAlerts,
                'alerts_per_device' => $total > 0 ? round($alerts / $total, 2) : 0.0,
            ];
        }

        usort($out, fn ($a, $b) => $b['alerts_per_device'] <=> $a['alerts_per_device']);

        return $out;
    }

    // ─────────────────────────────────────────────────────────────
    //  [F] Site breakdown
    // ─────────────────────────────────────────────────────────────

    public function getSiteBreakdown(): array
    {
        $this->load();

        $alertsBySite = $this->alertsInWindow()->groupBy('site_id');
        $wosBySite = $this->completedWosInWindow()->groupBy('site_id');
        $devicesBySite = $this->activeDevices()->groupBy('site_id');

        $sites = Site::whereIn('id', $this->siteIds)->get(['id', 'name']);

        return $sites->map(function (Site $site) use ($alertsBySite, $wosBySite, $devicesBySite) {
            $siteAlerts = $alertsBySite->get($site->id, collect());
            $siteWos = $wosBySite->get($site->id, collect());
            $siteDevices = $devicesBySite->get($site->id, collect());

            $totalAlerts = $siteAlerts->count();
            $resolved = $siteAlerts->whereNotNull('resolved_at')->count();
            $totalDevices = $siteDevices->count();
            $online = $siteDevices->where('status', 'active')->count();
            $mttr = $this->computeMttrFromCollection($siteWos);

            return [
                'site_id' => $site->id,
                'site_name' => $site->name,
                'alert_count' => $totalAlerts,
                'compliance_pct' => $totalAlerts > 0 ? round(($resolved / $totalAlerts) * 100, 1) : 100.0,
                'device_uptime_pct' => $totalDevices > 0 ? round(($online / $totalDevices) * 100, 1) : 100.0,
                'mttr_minutes' => $mttr,
                'total_devices' => $totalDevices,
                'online_devices' => $online,
            ];
        })->sortByDesc('alert_count')->values()->toArray();
    }

    // ─────────────────────────────────────────────────────────────
    //  [F.5] Technician performance
    // ─────────────────────────────────────────────────────────────

    public function getTechnicianPerformance(): array
    {
        $this->load();

        $assignedWos = $this->workOrders->whereNotNull('assigned_to');
        $techIds = $assignedWos->pluck('assigned_to')->unique();

        if ($techIds->isEmpty()) {
            return [];
        }

        $techs = User::whereIn('id', $techIds)->get(['id', 'name'])->keyBy('id');
        $completedByTech = $this->completedWosInWindow()->groupBy('assigned_to');
        $openByTech = $this->openWos()->groupBy('assigned_to');

        $out = [];

        foreach ($techIds as $techId) {
            $tech = $techs->get($techId);
            if (! $tech) {
                continue;
            }

            $completed = $completedByTech->get($techId, collect());
            $handled = $completed->count();
            $open = $openByTech->get($techId, collect())->count();

            $avgMinutes = null;
            $onTime = 0;

            if ($handled > 0) {
                $totalMin = 0.0;
                foreach ($completed as $wo) {
                    $totalMin += $wo->created_at->diffInSeconds($wo->completed_at) / 60;
                    $slaHours = self::SLA_HOURS[$wo->priority] ?? self::SLA_HOURS['medium'];
                    if ($wo->completed_at->lte($wo->created_at->copy()->addHours($slaHours))) {
                        $onTime++;
                    }
                }
                $avgMinutes = round($totalMin / $handled, 1);
            }

            $out[] = [
                'id' => $tech->id,
                'name' => $tech->name,
                'initials' => $this->initials($tech->name),
                'handled' => $handled,
                'open' => $open,
                'avg_minutes' => $avgMinutes,
                'sla_hit_pct' => $handled > 0 ? round(($onTime / $handled) * 100, 1) : null,
            ];
        }

        usort($out, fn ($a, $b) => ($b['sla_hit_pct'] ?? 0) <=> ($a['sla_hit_pct'] ?? 0));

        return $out;
    }

    // ─────────────────────────────────────────────────────────────
    //  [G] Critical incidents timeline
    // ─────────────────────────────────────────────────────────────

    public function getCriticalIncidents(int $limit = 8): array
    {
        $this->load();
        $cutoff = now()->copy()->subDays(min($this->days, 14));

        // Work from the prefetched alerts collection instead of a new query.
        $incidents = $this->alerts
            ->filter(fn (Alert $a) => $a->triggered_at && $a->triggered_at->gte($cutoff))
            ->whereIn('severity', ['critical', 'high'])
            ->sortByDesc('triggered_at')
            ->take($limit);

        // Batch-lookup linked WOs from the prefetched collection.
        $alertIds = $incidents->pluck('id');
        $linkedWos = $this->workOrders->whereIn('alert_id', $alertIds)->keyBy('alert_id');

        return $incidents->map(function (Alert $alert) use ($linkedWos) {
            $linkedWo = $linkedWos->get($alert->id);
            $ackDelay = null;
            if ($alert->acknowledged_at && $alert->triggered_at) {
                $ackDelay = (int) $alert->triggered_at->diffInSeconds($alert->acknowledged_at);
            }

            return [
                'id' => $alert->id,
                'severity' => $alert->severity,
                'title' => $alert->rule?->name ?? 'Alert',
                'site_name' => $alert->site?->name,
                'site_id' => $alert->site_id,
                'device_name' => $alert->device?->name,
                'zone' => $alert->device?->zone,
                'triggered_at' => $alert->triggered_at?->toIso8601String(),
                'acknowledged_at' => $alert->acknowledged_at?->toIso8601String(),
                'resolved_at' => $alert->resolved_at?->toIso8601String(),
                'ack_delay_seconds' => $ackDelay,
                'is_active' => $alert->resolved_at === null,
                'linked_work_order_id' => $linkedWo?->id,
            ];
        })->values()->toArray();
    }

    // ─────────────────────────────────────────────────────────────
    //  Collection-based computation helpers (no extra DB queries)
    // ─────────────────────────────────────────────────────────────

    private function computeSlaFromCollection(Collection $wos): array
    {
        $total = $wos->count();
        if ($total === 0) {
            return ['total' => 0, 'on_time' => 0, 'breached' => 0, 'pct' => 100.0];
        }

        $onTime = 0;
        foreach ($wos as $wo) {
            $slaHours = self::SLA_HOURS[$wo->priority] ?? self::SLA_HOURS['medium'];
            if ($wo->completed_at && $wo->completed_at->lte($wo->created_at->copy()->addHours($slaHours))) {
                $onTime++;
            }
        }

        return [
            'total' => $total,
            'on_time' => $onTime,
            'breached' => $total - $onTime,
            'pct' => round(($onTime / $total) * 100, 1),
        ];
    }

    private function computeMttrFromCollection(Collection $wos): ?float
    {
        $completed = $wos->filter(fn ($wo) => $wo->completed_at !== null);
        if ($completed->isEmpty()) {
            return null;
        }

        $total = 0.0;
        foreach ($completed as $wo) {
            $total += $wo->created_at->diffInSeconds($wo->completed_at) / 60;
        }

        return round($total / $completed->count(), 1);
    }

    private function computeAvgAckFromCollection(Collection $alerts): ?float
    {
        $acked = $alerts->filter(fn (Alert $a) => $a->acknowledged_at !== null);
        if ($acked->isEmpty()) {
            return null;
        }

        $total = 0.0;
        foreach ($acked as $alert) {
            $total += $alert->triggered_at->diffInSeconds($alert->acknowledged_at) / 60;
        }

        return round($total / $acked->count(), 1);
    }

    private function initials(?string $name): string
    {
        if (! $name) {
            return '??';
        }
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $letters = '';
        foreach (array_slice($parts, 0, 2) as $part) {
            $letters .= mb_strtoupper(mb_substr($part, 0, 1));
        }

        return $letters ?: '??';
    }
}
