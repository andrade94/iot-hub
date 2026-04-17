<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\DataExport;
use App\Models\Device;
use App\Models\Gateway;
use App\Models\MaintenanceWindow;
use App\Models\ReportSchedule;
use App\Models\Site;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Spatie\Activitylog\Models\Activity;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $now = now();

        // Range window (1/7/30 days) — anchors KPI trends and sparklines
        $rangeDays = in_array((int) $request->input('range'), [1, 7, 30], true)
            ? (int) $request->input('range')
            : 7;
        $periodStart = $now->copy()->subDays($rangeDays);
        $prevPeriodStart = $periodStart->copy()->subDays($rangeDays);

        $siteIds = $user->accessibleSites()->pluck('id');

        // ── KPIs ────────────────────────────────────────────────
        $totalDevices = Device::whereIn('site_id', $siteIds)->count();
        $onlineDevices = Device::whereIn('site_id', $siteIds)->online()->count();
        $activeAlerts = Alert::whereIn('site_id', $siteIds)->unresolved()->count();
        $criticalAlertsCount = Alert::whereIn('site_id', $siteIds)->unresolved()->where('severity', 'critical')->count();
        $highAlertsCount = Alert::whereIn('site_id', $siteIds)->unresolved()->where('severity', 'high')->count();
        // Match WorkOrderController::index — "open" = not yet completed
        $openWorkOrders = WorkOrder::whereIn('site_id', $siteIds)
            ->whereIn('status', ['open', 'assigned', 'in_progress'])
            ->count();

        // Overdue WOs — per-priority SLA (matches WorkOrderController::index)
        $overdueWorkOrders = WorkOrder::whereIn('site_id', $siteIds)
            ->whereIn('status', ['open', 'assigned'])
            ->where(function ($q) use ($now) {
                $q->where(fn ($qq) => $qq->where('priority', 'urgent')->where('created_at', '<=', $now->copy()->subHours(2)))
                    ->orWhere(fn ($qq) => $qq->where('priority', 'high')->where('created_at', '<=', $now->copy()->subHours(4)))
                    ->orWhere(fn ($qq) => $qq->where('priority', 'medium')->where('created_at', '<=', $now->copy()->subDay()))
                    ->orWhere(fn ($qq) => $qq->where('priority', 'low')->where('created_at', '<=', $now->copy()->subHours(72)));
            })
            ->count();

        // Trends — compare to the previous equivalent window
        $prevAlerts = Alert::whereIn('site_id', $siteIds)
            ->whereBetween('triggered_at', [$prevPeriodStart, $periodStart])
            ->count();
        $currAlerts = Alert::whereIn('site_id', $siteIds)
            ->where('triggered_at', '>=', $periodStart)
            ->count();
        $alertsDelta = $currAlerts - $prevAlerts;

        $prevWos = WorkOrder::whereIn('site_id', $siteIds)
            ->whereBetween('created_at', [$prevPeriodStart, $periodStart])
            ->count();
        $currWos = WorkOrder::whereIn('site_id', $siteIds)
            ->where('created_at', '>=', $periodStart)
            ->count();
        $wosDelta = $currWos - $prevWos;

        $kpis = [
            'total_devices' => $totalDevices,
            'online_devices' => $onlineDevices,
            'active_alerts' => $activeAlerts,
            'open_work_orders' => $openWorkOrders,
            'critical_alerts' => $criticalAlertsCount,
            'high_alerts' => $highAlertsCount,
            'overdue_work_orders' => $overdueWorkOrders,
            'alerts_delta' => $alertsDelta,
            'wos_delta' => $wosDelta,
            'devices_spark' => $this->sparklineDevices($siteIds, $rangeDays),
            'online_spark' => $this->sparklineOnline($siteIds, $rangeDays),
            'alerts_spark' => $this->sparklineAlerts($siteIds, $rangeDays),
            'wos_spark' => $this->sparklineWorkOrders($siteIds, $rangeDays),
        ];

        // ── Fleet breakdown ────────────────────────────────────
        $fleetBreakdown = [
            'online' => $onlineDevices,
            'low_battery' => Device::whereIn('site_id', $siteIds)
                ->where('status', 'active')
                ->whereNotNull('battery_pct')
                ->where('battery_pct', '<', 20)
                ->count(),
            'offline' => max(0, Device::whereIn('site_id', $siteIds)
                ->where('status', 'active')
                ->count() - $onlineDevices),
            'idle' => Device::whereIn('site_id', $siteIds)->where('status', 'inactive')->count(),
        ];

        // ── Per-site stats ─────────────────────────────────────
        $siteStats = Site::whereIn('id', $siteIds)
            ->withCount([
                'devices',
                'devices as online_devices_count' => fn ($q) => $q->online(),
                'alerts as active_alerts_count' => fn ($q) => $q->whereIn('status', ['active', 'acknowledged']),
                'alerts as critical_alerts_count' => fn ($q) => $q->whereIn('status', ['active', 'acknowledged'])->where('severity', 'critical'),
            ])
            ->withCount(['workOrders as open_work_orders_count' => fn ($q) => $q->whereNotIn('status', ['completed', 'cancelled'])])
            ->get()
            ->map(fn ($site) => [
                'id' => $site->id,
                'name' => $site->name,
                'slug' => $site->slug ?? null,
                'status' => $site->status,
                'timezone' => $site->timezone ?? null,
                'device_count' => (int) $site->devices_count,
                'online_count' => (int) $site->online_devices_count,
                'active_alerts' => (int) $site->active_alerts_count,
                'critical_alerts' => (int) $site->critical_alerts_count,
                'open_work_orders' => (int) $site->open_work_orders_count,
                'latitude' => $site->lat !== null ? (float) $site->lat : null,
                'longitude' => $site->lng !== null ? (float) $site->lng : null,
            ]);

        // ── Action cards ───────────────────────────────────────
        $actionCards = [
            'unacknowledged_alerts' => Alert::whereIn('site_id', $siteIds)->active()->count(),
            'overdue_work_orders' => $overdueWorkOrders,
            'critical_battery' => $fleetBreakdown['low_battery'],
        ];

        // ── Gateways ───────────────────────────────────────────
        $gateways = Gateway::whereIn('site_id', $siteIds)
            ->with('site:id,name')
            ->withCount(['devices'])
            ->orderBy('site_id')
            ->orderBy('serial')
            ->get()
            ->map(function ($gw) use ($now) {
                $isOnline = $gw->last_seen_at && $gw->last_seen_at->gte($now->copy()->subMinutes(15));
                return [
                    'id' => $gw->id,
                    'serial' => $gw->serial,
                    'model' => $gw->model,
                    'site_name' => $gw->site?->name ?? '—',
                    'device_count' => (int) $gw->devices_count,
                    'status' => $isOnline ? 'online' : 'offline',
                    'last_seen_at' => $gw->last_seen_at?->toIso8601String(),
                    'last_seen_ago' => $gw->last_seen_at?->diffForHumans(null, true, true) ?? '—',
                ];
            });

        $gatewayStats = [
            'total' => $gateways->count(),
            'online' => $gateways->where('status', 'online')->count(),
        ];

        // ── Recent alerts (live feed, last 5) ──────────────────
        $recentAlerts = Alert::whereIn('site_id', $siteIds)
            ->with(['device:id,name,zone,model', 'site:id,name', 'rule:id,name'])
            ->latest('triggered_at')
            ->limit(5)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'severity' => $a->severity,
                'status' => $a->status,
                'rule_name' => $a->data['rule_name'] ?? $a->rule?->name ?? 'Unknown rule',
                'device_name' => $a->device?->name,
                'device_model' => $a->device?->model,
                'zone' => $a->device?->zone,
                'site_name' => $a->site?->name,
                'triggered_at' => $a->triggered_at?->toIso8601String(),
                'triggered_ago' => $a->triggered_at?->diffForHumans(null, true, true) ?? '—',
            ]);

        // ── Upcoming maintenance windows (next 60 min) ─────────
        $maintenanceUpcoming = $this->upcomingMaintenance($siteIds, $now);

        // ── Temperature excursions (last 24h) ──────────────────
        $excursionCutoff = $now->copy()->subHours(24);
        $excursions = Alert::whereIn('site_id', $siteIds)
            ->where('triggered_at', '>=', $excursionCutoff)
            ->whereIn('severity', ['critical', 'high'])
            ->where(function ($q) {
                $q->whereJsonContains('data->metric', 'temperature')
                    ->orWhereJsonContains('data->metric', 'temp');
            })
            ->with(['device:id,name,zone', 'site:id,name'])
            ->latest('triggered_at')
            ->limit(8)
            ->get()
            ->map(function ($a) {
                $triggered = $a->triggered_at;
                $ended = $a->resolved_at ?? now();
                $durationMinutes = (int) $triggered->diffInMinutes($ended);
                $threshold = $a->data['threshold'] ?? null;
                $value = $a->data['value'] ?? null;
                $delta = (is_numeric($threshold) && is_numeric($value))
                    ? round((float) $value - (float) $threshold, 1)
                    : null;
                return [
                    'id' => $a->id,
                    'zone' => $a->device?->zone ?? $a->data['zone'] ?? '—',
                    'device_name' => $a->device?->name,
                    'site_name' => $a->site?->name,
                    'delta_c' => $delta,
                    'peak_value' => is_numeric($value) ? (float) $value : null,
                    'duration_minutes' => $durationMinutes,
                    'status' => in_array($a->status, ['active', 'acknowledged']) ? 'active' : 'recovered',
                ];
            });

        // ── HACCP compliance (cold-chain segment only) ─────────
        $compliance = null;
        $orgSegment = $user->organization?->segment ?? null;
        if ($orgSegment === 'cold_chain') {
            $compliance = $this->haccpCompliance($siteIds);
        }

        // ── Recent activity (last 5) ───────────────────────────
        $recentActivity = Activity::whereHasMorph('subject', [
            Alert::class, WorkOrder::class, Site::class, Device::class,
        ])->latest()->limit(5)->get()->map(fn ($a) => [
            'id' => $a->id,
            'description' => $a->description,
            'causer_name' => $a->causer?->name ?? 'System',
            'subject_type' => class_basename($a->subject_type),
            'created_at' => $a->created_at->toIso8601String(),
            'created_ago' => $a->created_at->diffForHumans(null, true, true),
        ]);

        // ── Recent reports (scheduled + ad-hoc exports) ────────
        $recentReports = $this->recentReports($siteIds, $user);

        // ── Freshness ──────────────────────────────────────────
        $latestBroadcast = Alert::whereIn('site_id', $siteIds)
            ->latest('triggered_at')
            ->value('triggered_at');
        $freshness = [
            'as_of' => $now->toIso8601String(),
            'last_broadcast' => $latestBroadcast?->toIso8601String(),
            'last_broadcast_ago' => $latestBroadcast?->diffForHumans(null, true, true) ?? '—',
        ];

        // ── Dashboard variant detection ───────────────────────
        $roles = $user->getRoleNames()->toArray();
        $isTechnician = in_array('technician', $roles)
            && ! in_array('client_site_manager', $roles)
            && ! in_array('client_org_admin', $roles)
            && ! in_array('super_admin', $roles);

        $isSiteScoped = (in_array('client_site_manager', $roles) || in_array('client_site_viewer', $roles))
            && ! in_array('client_org_admin', $roles)
            && ! in_array('super_admin', $roles);

        $variant = $isTechnician ? 'technician' : ($isSiteScoped ? 'site' : 'fleet');

        // ── Technician: my assigned WOs with device state ──────
        $myWorkOrders = [];
        if ($isTechnician) {
            $myWorkOrders = WorkOrder::where('assigned_to', $user->id)
                ->whereIn('status', ['open', 'assigned', 'in_progress'])
                ->with(['site:id,name,address', 'device:id,name,model,status,battery_pct,last_reading_at'])
                ->orderByRaw("CASE WHEN status = 'in_progress' THEN 0 WHEN status = 'assigned' THEN 1 ELSE 2 END")
                ->orderBy('created_at')
                ->get()
                ->map(function (WorkOrder $wo) use ($now) {
                    $slaHours = match ($wo->priority) {
                        'urgent' => 2, 'high' => 4, 'medium' => 24, 'low' => 72, default => 24,
                    };
                    $isOverdue = in_array($wo->status, ['open', 'assigned'])
                        && $wo->created_at->copy()->addHours($slaHours)->isPast();
                    $deviceState = null;
                    if ($wo->device) {
                        $lastReading = $wo->device->last_reading_at;
                        $deviceState = [
                            'name' => $wo->device->name,
                            'model' => $wo->device->model,
                            'status' => $wo->device->status,
                            'battery_pct' => $wo->device->battery_pct,
                            'last_reading_at' => $lastReading?->toIso8601String(),
                            'last_reading_ago' => $lastReading?->diffForHumans(null, true, true) ?? null,
                            'is_reporting' => $lastReading && $lastReading->gte($now->copy()->subMinutes(15)),
                        ];
                    }

                    return [
                        'id' => $wo->id,
                        'title' => $wo->title,
                        'description' => $wo->description,
                        'type' => $wo->type,
                        'priority' => $wo->priority,
                        'status' => $wo->status,
                        'site_name' => $wo->site?->name,
                        'site_address' => $wo->site?->address,
                        'device_state' => $deviceState,
                        'is_overdue' => $isOverdue,
                        'created_at' => $wo->created_at?->toIso8601String(),
                        'created_ago' => $wo->created_at?->diffForHumans(null, true, true),
                    ];
                });
        }

        // ── Site manager: zone-level readings ──────────────────
        $zoneReadings = [];
        if ($isSiteScoped && $siteIds->count() <= 3) {
            foreach ($siteIds as $sId) {
                $devices = Device::where('site_id', $sId)
                    ->whereNotNull('zone')
                    ->with('site:id,name')
                    ->get(['id', 'site_id', 'name', 'model', 'zone', 'status', 'battery_pct', 'last_reading_at']);

                $zones = $devices->groupBy('zone');
                foreach ($zones as $zoneName => $zoneDevices) {
                    $latestReading = \App\Models\SensorReading::whereIn('device_id', $zoneDevices->pluck('id'))
                        ->where('metric', 'temperature')
                        ->orderByDesc('time')
                        ->first();

                    $humidityReading = \App\Models\SensorReading::whereIn('device_id', $zoneDevices->pluck('id'))
                        ->where('metric', 'humidity')
                        ->orderByDesc('time')
                        ->first();

                    $activeZoneAlerts = Alert::whereIn('device_id', $zoneDevices->pluck('id'))
                        ->whereIn('status', ['active', 'acknowledged'])
                        ->count();

                    $lowBattery = $zoneDevices->filter(fn ($d) => $d->battery_pct !== null && $d->battery_pct < 20)->first();

                    $zoneReadings[] = [
                        'site_id' => $sId,
                        'site_name' => $zoneDevices->first()->site?->name,
                        'zone' => $zoneName,
                        'device_count' => $zoneDevices->count(),
                        'temperature' => $latestReading ? (float) $latestReading->value : null,
                        'humidity' => $humidityReading ? (float) $humidityReading->value : null,
                        'last_reading_at' => $latestReading?->time?->toIso8601String(),
                        'last_reading_ago' => $latestReading?->time ? Carbon::parse($latestReading->time)->diffForHumans(null, true, true) : null,
                        'active_alerts' => $activeZoneAlerts,
                        'low_battery_device' => $lowBattery ? [
                            'name' => $lowBattery->name,
                            'battery_pct' => $lowBattery->battery_pct,
                        ] : null,
                    ];
                }
            }
        }

        // ── Technician summary stats ───────────────────────────
        $techStats = null;
        if ($isTechnician) {
            $completedThisMonth = WorkOrder::where('assigned_to', $user->id)
                ->where('status', 'completed')
                ->where('completed_at', '>=', $now->copy()->startOfMonth())
                ->count();

            $techStats = [
                'overdue' => collect($myWorkOrders)->where('is_overdue', true)->count(),
                'assigned' => collect($myWorkOrders)->whereIn('status', ['open', 'assigned'])->count(),
                'in_progress' => collect($myWorkOrders)->where('status', 'in_progress')->count(),
                'completed_this_month' => $completedThisMonth,
            ];
        }

        return Inertia::render('dashboard', [
            'kpis' => $kpis,
            'fleet' => $fleetBreakdown,
            'siteStats' => $siteStats,
            'actionCards' => $actionCards,
            'gateways' => $gateways,
            'gatewayStats' => $gatewayStats,
            'recentAlerts' => $recentAlerts,
            'maintenanceUpcoming' => $maintenanceUpcoming,
            'excursions' => $excursions,
            'compliance' => $compliance,
            'recentActivity' => $recentActivity,
            'recentReports' => $recentReports,
            'freshness' => $freshness,
            'range' => $rangeDays,
            // Role-adaptive props
            'variant' => $variant,
            'myWorkOrders' => $myWorkOrders,
            'zoneReadings' => $zoneReadings,
            'techStats' => $techStats,
        ]);
    }

    /**
     * Sparkline buckets matching the selected range.
     * - range=1  → 24 hourly buckets
     * - range=7  → 7 daily buckets
     * - range=30 → 30 daily buckets
     *
     * Returns a callback-shaped helper used by the 4 per-metric methods below.
     *
     * @return array{buckets:int,unit:'hour'|'day'}
     */
    private function sparklineShape(int $range): array
    {
        return match ($range) {
            1 => ['buckets' => 24, 'unit' => 'hour'],
            30 => ['buckets' => 30, 'unit' => 'day'],
            default => ['buckets' => 7, 'unit' => 'day'],
        };
    }

    /**
     * Device count is a cumulative snapshot (count <= bucket end).
     */
    private function sparklineDevices($siteIds, int $range): array
    {
        ['buckets' => $buckets, 'unit' => $unit] = $this->sparklineShape($range);
        $now = now();
        $data = [];
        for ($i = $buckets - 1; $i >= 0; $i--) {
            $end = $unit === 'hour'
                ? $now->copy()->subHours($i)->endOfHour()
                : $now->copy()->subDays($i)->endOfDay();
            $data[] = Device::whereIn('site_id', $siteIds)
                ->where('created_at', '<=', $end)
                ->count();
        }
        return $data;
    }

    private function sparklineOnline($siteIds, int $range): array
    {
        ['buckets' => $buckets, 'unit' => $unit] = $this->sparklineShape($range);
        $now = now();
        $data = [];
        for ($i = $buckets - 1; $i >= 0; $i--) {
            [$start, $end] = $unit === 'hour'
                ? [$now->copy()->subHours($i)->startOfHour(), $now->copy()->subHours($i)->endOfHour()]
                : [$now->copy()->subDays($i)->startOfDay(), $now->copy()->subDays($i)->endOfDay()];
            $data[] = Device::whereIn('site_id', $siteIds)
                ->whereNotNull('last_reading_at')
                ->whereBetween('last_reading_at', [$start, $end])
                ->count();
        }
        return $data;
    }

    private function sparklineAlerts($siteIds, int $range): array
    {
        ['buckets' => $buckets, 'unit' => $unit] = $this->sparklineShape($range);
        $now = now();
        $data = [];
        for ($i = $buckets - 1; $i >= 0; $i--) {
            [$start, $end] = $unit === 'hour'
                ? [$now->copy()->subHours($i)->startOfHour(), $now->copy()->subHours($i)->endOfHour()]
                : [$now->copy()->subDays($i)->startOfDay(), $now->copy()->subDays($i)->endOfDay()];
            $data[] = Alert::whereIn('site_id', $siteIds)
                ->whereBetween('triggered_at', [$start, $end])
                ->count();
        }
        return $data;
    }

    private function sparklineWorkOrders($siteIds, int $range): array
    {
        ['buckets' => $buckets, 'unit' => $unit] = $this->sparklineShape($range);
        $now = now();
        $data = [];
        for ($i = $buckets - 1; $i >= 0; $i--) {
            [$start, $end] = $unit === 'hour'
                ? [$now->copy()->subHours($i)->startOfHour(), $now->copy()->subHours($i)->endOfHour()]
                : [$now->copy()->subDays($i)->startOfDay(), $now->copy()->subDays($i)->endOfDay()];
            $data[] = WorkOrder::whereIn('site_id', $siteIds)
                ->whereBetween('created_at', [$start, $end])
                ->count();
        }
        return $data;
    }

    /**
     * Maintenance windows starting within the next 60 minutes (per-site tz).
     */
    private function upcomingMaintenance($siteIds, Carbon $now): array
    {
        $windows = MaintenanceWindow::whereIn('site_id', $siteIds)
            ->with('site:id,name,timezone')
            ->get();

        $upcoming = [];
        foreach ($windows as $w) {
            $tz = $w->site?->timezone ?? config('app.timezone');
            $siteNow = $now->copy()->setTimezone($tz);
            $start = $siteNow->copy()->setTimeFromTimeString($w->start_time);
            $matchesDay = match ($w->recurrence) {
                'daily', 'once' => true,
                'weekly' => (int) $w->day_of_week === (int) $siteNow->dayOfWeek,
                'monthly' => $siteNow->day === 1,
                default => false,
            };
            if (! $matchesDay) {
                continue;
            }
            $minutesUntil = (int) round($siteNow->diffInMinutes($start, false));
            if ($minutesUntil >= 0 && $minutesUntil <= 60) {
                $upcoming[] = [
                    'id' => $w->id,
                    'site_name' => $w->site?->name ?? '—',
                    'zone' => $w->zone,
                    'title' => $w->title,
                    'start_time' => $w->start_time,
                    'duration_minutes' => $w->duration_minutes,
                    'suppress_alerts' => (bool) $w->suppress_alerts,
                    'minutes_until' => $minutesUntil,
                ];
            }
        }

        return $upcoming;
    }

    /**
     * HACCP compliance: percentage of device zones with zero temperature
     * excursions this month, plus totals for context.
     */
    private function haccpCompliance($siteIds): array
    {
        $monthStart = now()->startOfMonth();

        $totalZones = Device::whereIn('site_id', $siteIds)
            ->whereNotNull('zone')
            ->distinct()
            ->count('zone');

        $excursionZones = Alert::whereIn('site_id', $siteIds)
            ->where('triggered_at', '>=', $monthStart)
            ->whereIn('severity', ['critical', 'high'])
            ->where(function ($q) {
                $q->whereJsonContains('data->metric', 'temperature')
                    ->orWhereJsonContains('data->metric', 'temp');
            })
            ->join('devices', 'alerts.device_id', '=', 'devices.id')
            ->distinct()
            ->pluck('devices.zone')
            ->filter()
            ->unique()
            ->count();

        $compliantZones = max(0, $totalZones - $excursionZones);
        $pct = $totalZones > 0 ? round(($compliantZones / $totalZones) * 100, 1) : 100.0;

        $totalMonthMinutes = (int) $monthStart->diffInMinutes(now());
        $excursionMinutes = Alert::whereIn('site_id', $siteIds)
            ->where('triggered_at', '>=', $monthStart)
            ->whereIn('severity', ['critical', 'high'])
            ->where(function ($q) {
                $q->whereJsonContains('data->metric', 'temperature')
                    ->orWhereJsonContains('data->metric', 'temp');
            })
            ->get()
            ->sum(function ($a) {
                $end = $a->resolved_at ?? now();
                return (int) $a->triggered_at->diffInMinutes($end);
            });
        $excursionFreeMinutes = max(0, $totalMonthMinutes - (int) $excursionMinutes);

        $totalExcursions = Alert::whereIn('site_id', $siteIds)
            ->where('triggered_at', '>=', $monthStart)
            ->whereIn('severity', ['critical', 'high'])
            ->where(function ($q) {
                $q->whereJsonContains('data->metric', 'temperature')
                    ->orWhereJsonContains('data->metric', 'temp');
            })
            ->count();

        return [
            'percentage' => $pct,
            'compliant_zones' => $compliantZones,
            'total_zones' => $totalZones,
            'excursion_free_minutes' => $excursionFreeMinutes,
            'total_month_minutes' => $totalMonthMinutes,
            'total_excursions' => $totalExcursions,
        ];
    }

    /**
     * Recent generated reports — union of dispatched schedules + ad-hoc exports.
     */
    private function recentReports($siteIds, $user): array
    {
        $reports = collect();

        if (class_exists(ReportSchedule::class)) {
            $schedules = ReportSchedule::where('org_id', $user->org_id ?? null)
                ->whereNotNull('last_sent_at')
                ->orderByDesc('last_sent_at')
                ->limit(3)
                ->get();
            foreach ($schedules as $s) {
                $reports->push([
                    'title' => $s->name ?? ucfirst(str_replace('_', ' ', $s->type ?? 'report')),
                    'type' => $s->type ?? 'report',
                    'generated_at' => $s->last_sent_at?->toIso8601String(),
                    'generated_ago' => $s->last_sent_at?->diffForHumans(null, true, true) ?? '—',
                    'source' => 'schedule',
                ]);
            }
        }

        if (class_exists(DataExport::class)) {
            $exports = DataExport::where('org_id', $user->org_id ?? null)
                ->where('status', 'completed')
                ->latest('completed_at')
                ->limit(3)
                ->get();
            foreach ($exports as $e) {
                $reports->push([
                    'title' => $e->type ? ucfirst(str_replace('_', ' ', $e->type)) : 'Export',
                    'type' => $e->type ?? 'export',
                    'generated_at' => $e->completed_at?->toIso8601String(),
                    'generated_ago' => $e->completed_at?->diffForHumans(null, true, true) ?? '—',
                    'source' => 'export',
                ]);
            }
        }

        return $reports
            ->sortByDesc('generated_at')
            ->take(3)
            ->values()
            ->all();
    }
}
