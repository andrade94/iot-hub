<?php

namespace App\Http\Controllers;

use App\Jobs\EscalateAlert;
use App\Models\Alert;
use App\Models\EscalationChain;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AlertController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Alert::class);

        $user = $request->user();
        $siteIds = $user->accessibleSites()->pluck('id');

        $query = Alert::with(['device', 'site', 'rule'])
            ->whereIn('site_id', $siteIds);

        // Filter by severity
        if ($request->filled('severity')) {
            $query->where('severity', $request->input('severity'));
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        } else {
            // Default: show active + acknowledged
            $query->whereIn('status', ['active', 'acknowledged']);
        }

        // Filter by site
        if ($request->filled('site_id')) {
            $query->where('site_id', $request->input('site_id'));
        }

        // Filter by device
        if ($request->filled('device_id')) {
            $query->where('device_id', $request->input('device_id'));
        }

        // Filter by "assigned to me" — alerts the user has triaged
        if ($request->input('assigned') === 'me') {
            $query->where('resolved_by', $user->id);
        }

        // Search by rule name, device name, or zone
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('device', fn ($dq) => $dq
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('zone', 'like', "%{$search}%"))
                    ->orWhereHas('rule', fn ($rq) => $rq->where('name', 'like', "%{$search}%"));
            });
        }

        // Date range filter via preset
        $range = $request->input('range', '7d');
        $from = match ($range) {
            '24h' => now()->subHours(24),
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            'all' => null,
            default => now()->subDays(7),
        };
        if ($from) {
            $query->where('triggered_at', '>=', $from);
        }

        $alerts = $query->latest('triggered_at')->paginate(20)->withQueryString();

        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        // Devices for the dropdown — filtered by selected site if any
        $devices = \App\Models\Device::whereIn('site_id', $siteIds)
            ->when($request->filled('site_id'), fn ($q) => $q->where('site_id', $request->input('site_id')))
            ->orderBy('name')
            ->get(['id', 'name', 'site_id'])
            ->map(fn ($d) => ['id' => $d->id, 'name' => $d->name, 'site_id' => $d->site_id]);

        // Counts for KPI header
        $countsQuery = Alert::whereIn('site_id', $siteIds);
        if ($from) {
            $countsQuery->where('triggered_at', '>=', $from);
        }
        $counts = [
            'critical' => (clone $countsQuery)->where('severity', 'critical')->whereIn('status', ['active', 'acknowledged'])->count(),
            'high' => (clone $countsQuery)->where('severity', 'high')->whereIn('status', ['active', 'acknowledged'])->count(),
            'resolved' => (clone $countsQuery)->where('status', 'resolved')->count(),
            'active' => (clone $countsQuery)->where('status', 'active')->count(),
        ];

        return Inertia::render('alerts/index', [
            'alerts' => $alerts,
            'sites' => $sites,
            'devices' => $devices,
            'counts' => $counts,
            'filters' => $request->only(['severity', 'status', 'site_id', 'device_id', 'search', 'range', 'assigned']) + ['range' => $range],
        ]);
    }

    public function show(Request $request, Alert $alert)
    {
        $this->authorize('view', $alert);

        $alert->load([
            'device',
            'site',
            'rule',
            'notifications.user',
            'resolvedByUser',
            'acknowledgedByUser',
            'escalatedByUser',
            'correctiveActions.takenByUser',
            'correctiveActions.verifiedByUser',
            'workOrders.assignedUser',
        ]);

        $userSnooze = $alert->snoozes()
            ->where('user_id', $request->user()->id)
            ->active()
            ->first();

        // Similar alerts: same rule+device in last 30 days
        $similarAlerts = Alert::where('id', '!=', $alert->id)
            ->where('rule_id', $alert->rule_id)
            ->where('device_id', $alert->device_id)
            ->where('triggered_at', '>=', now()->subDays(30))
            ->count();

        // Build audit trail from known state transitions + notifications + corrective actions
        $ruleName = $alert->data['rule_name'] ?? $alert->rule?->name ?? 'unknown rule';
        $audit = collect();
        $audit->push([
            'user' => 'System',
            'action' => "triggered alert from rule \"{$ruleName}\"",
            'time' => $alert->triggered_at,
            'type' => 'system',
        ]);
        foreach ($alert->notifications as $n) {
            $audit->push([
                'user' => $n->user?->name ?? 'Unknown',
                'action' => "was notified via {$n->channel} (".($n->status ?? 'sent').")",
                'time' => $n->sent_at ?? $n->created_at,
                'type' => 'notification',
            ]);
        }
        foreach ($alert->correctiveActions as $ca) {
            $audit->push([
                'user' => $ca->takenByUser?->name ?? 'Unknown',
                'action' => 'logged corrective action',
                'time' => $ca->taken_at ?? $ca->created_at,
                'type' => 'corrective',
            ]);
            if ($ca->verified_at) {
                $audit->push([
                    'user' => $ca->verifiedByUser?->name ?? 'Unknown',
                    'action' => 'verified corrective action',
                    'time' => $ca->verified_at,
                    'type' => 'corrective',
                ]);
            }
        }
        if ($alert->acknowledged_at) {
            $audit->push([
                'user' => $alert->acknowledgedByUser?->name ?? 'Unknown',
                'action' => 'acknowledged alert',
                'time' => $alert->acknowledged_at,
                'type' => 'state',
            ]);
        }
        if ($alert->escalated_at) {
            $audit->push([
                'user' => $alert->escalatedByUser?->name ?? 'System',
                'action' => "manually escalated to level {$alert->escalated_to_level}",
                'time' => $alert->escalated_at,
                'type' => 'state',
            ]);
        }
        if ($alert->resolved_at && $alert->status === 'resolved') {
            $audit->push([
                'user' => $alert->resolvedByUser?->name ?? 'Unknown',
                'action' => 'resolved alert',
                'time' => $alert->resolved_at,
                'type' => 'state',
            ]);
        }
        if ($alert->resolved_at && $alert->status === 'dismissed') {
            $audit->push([
                'user' => $alert->resolvedByUser?->name ?? 'Unknown',
                'action' => 'dismissed alert',
                'time' => $alert->resolved_at,
                'type' => 'state',
            ]);
        }
        $audit = $audit->sortBy('time')->values();

        // Reading chart: ±2h around trigger
        $chartData = [];
        if ($alert->device_id && isset($alert->data['metric'])) {
            $metric = $alert->data['metric'];
            $from = $alert->triggered_at->copy()->subHours(2);
            $to = $alert->triggered_at->copy()->addHours(2);
            $chartData = \App\Models\SensorReading::where('device_id', $alert->device_id)
                ->where('metric', $metric)
                ->whereBetween('time', [$from, $to])
                ->orderBy('time')
                ->get(['time', 'value'])
                ->map(fn ($r) => [
                    'time' => $r->time->format('H:i'),
                    'value' => (float) $r->value,
                    'is_trigger' => $r->time->equalTo($alert->triggered_at) || $r->time->between($alert->triggered_at->copy()->subMinutes(5), $alert->triggered_at->copy()->addMinutes(5)),
                ])
                ->toArray();
        }

        // Data for "Create Work Order" dialog
        $sites = collect([['id' => $alert->site_id, 'name' => $alert->site?->name ?? 'Site']]);
        $devices = $alert->device_id
            ? collect([[
                'id' => $alert->device_id,
                'name' => $alert->device?->name ?? 'Device',
                'site_id' => $alert->site_id,
            ]])
            : collect();
        $technicians = \App\Models\User::role('technician')
            ->when($request->user()->org_id, fn ($q) => $q->where('org_id', $request->user()->org_id))
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        // Linked work orders (already spawned from this alert)
        $linkedWorkOrders = $alert->workOrders
            ->map(fn ($wo) => [
                'id' => $wo->id,
                'title' => $wo->title,
                'status' => $wo->status,
                'priority' => $wo->priority,
                'assigned_user' => $wo->assignedUser ? ['id' => $wo->assignedUser->id, 'name' => $wo->assignedUser->name] : null,
                'created_at' => $wo->created_at,
            ])
            ->values();

        return Inertia::render('alerts/show', [
            'alert' => $alert,
            'userSnooze' => $userSnooze,
            'similarAlerts' => $similarAlerts,
            'audit' => $audit,
            'chartData' => $chartData,
            'sites' => $sites,
            'devices' => $devices,
            'technicians' => $technicians,
            'linkedWorkOrders' => $linkedWorkOrders,
        ]);
    }

    public function acknowledge(Request $request, Alert $alert)
    {
        $this->authorize('acknowledge', $alert);

        try {
            $alert->acknowledge($request->user()->id);
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Alert acknowledged.');
    }

    public function resolve(Request $request, Alert $alert)
    {
        $this->authorize('resolve', $alert);

        try {
            $alert->resolve($request->user()->id, 'manual');
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Alert resolved.');
    }

    public function dismiss(Request $request, Alert $alert)
    {
        $this->authorize('dismiss', $alert);

        try {
            $alert->dismiss($request->user()->id);
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Alert dismissed.');
    }

    public function snooze(Request $request, Alert $alert)
    {
        $this->authorize('acknowledge', $alert);

        $validated = $request->validate([
            // Accept any duration from 5 minutes up to 7 days
            'duration_minutes' => 'required|integer|min:5|max:10080',
        ]);

        \App\Models\AlertSnooze::updateOrCreate(
            ['alert_id' => $alert->id, 'user_id' => $request->user()->id],
            ['expires_at' => now()->addMinutes($validated['duration_minutes'])]
        );

        return back()->with('success', "Alert snoozed for {$validated['duration_minutes']} minutes.");
    }

    public function bulkAcknowledge(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer|exists:alerts,id',
        ]);

        $user = $request->user();
        $succeeded = 0;
        $failed = 0;

        foreach ($validated['ids'] as $id) {
            $alert = Alert::find($id);
            if (! $alert || ! $user->can('acknowledge', $alert)) {
                $failed++;
                continue;
            }
            try {
                $alert->acknowledge($user->id);
                $succeeded++;
            } catch (\InvalidArgumentException) {
                $failed++;
            }
        }

        $message = "{$succeeded} alert(s) acknowledged.";
        if ($failed > 0) {
            $message .= " {$failed} skipped (already processed or unauthorized).";
        }

        return back()->with('success', $message);
    }

    public function bulkResolve(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer|exists:alerts,id',
        ]);

        $user = $request->user();
        $succeeded = 0;
        $failed = 0;

        foreach ($validated['ids'] as $id) {
            $alert = Alert::find($id);
            if (! $alert || ! $user->can('resolve', $alert)) {
                $failed++;
                continue;
            }
            try {
                $alert->resolve($user->id, 'manual');
                $succeeded++;
            } catch (\InvalidArgumentException) {
                $failed++;
            }
        }

        $message = "{$succeeded} alert(s) resolved.";
        if ($failed > 0) {
            $message .= " {$failed} skipped.";
        }

        return back()->with('success', $message);
    }

    public function unsnooze(Request $request, Alert $alert)
    {
        \App\Models\AlertSnooze::where('alert_id', $alert->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return back()->with('success', 'Snooze cancelled.');
    }

    public function bulkDismiss(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer|exists:alerts,id',
        ]);

        $user = $request->user();
        $succeeded = 0;
        $failed = 0;

        foreach ($validated['ids'] as $id) {
            $alert = Alert::find($id);
            if (! $alert || ! $user->can('dismiss', $alert)) {
                $failed++;
                continue;
            }
            try {
                $alert->dismiss($user->id);
                $succeeded++;
            } catch (\InvalidArgumentException) {
                $failed++;
            }
        }

        $message = "{$succeeded} alert(s) dismissed.";
        if ($failed > 0) {
            $message .= " {$failed} skipped (already processed or unauthorized).";
        }

        return back()->with('success', $message);
    }

    public function export(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', Alert::class);

        $user = $request->user();
        $siteIds = $user->accessibleSites()->pluck('id');

        $query = Alert::with(['device', 'site', 'rule', 'acknowledgedByUser', 'resolvedByUser'])
            ->whereIn('site_id', $siteIds);

        // Mirror the same filters as index()
        if ($request->filled('severity')) {
            $query->where('severity', $request->input('severity'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('site_id')) {
            $query->where('site_id', $request->input('site_id'));
        }
        if ($request->filled('device_id')) {
            $query->where('device_id', $request->input('device_id'));
        }
        if ($request->input('assigned') === 'me') {
            $query->where('resolved_by', $user->id);
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('device', fn ($dq) => $dq
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('zone', 'like', "%{$search}%"))
                    ->orWhereHas('rule', fn ($rq) => $rq->where('name', 'like', "%{$search}%"));
            });
        }
        $range = $request->input('range', '7d');
        $from = match ($range) {
            '24h' => now()->subHours(24),
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            'all' => null,
            default => now()->subDays(7),
        };
        if ($from) {
            $query->where('triggered_at', '>=', $from);
        }

        $filename = 'alerts-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'ID', 'Triggered At', 'Severity', 'Status', 'Rule', 'Site', 'Device', 'Zone',
                'Metric', 'Value', 'Threshold', 'Acknowledged At', 'Acknowledged By',
                'Resolved At', 'Resolved By', 'Resolution Type',
            ]);
            $query->orderBy('triggered_at', 'desc')->chunk(500, function ($alerts) use ($out) {
                foreach ($alerts as $a) {
                    fputcsv($out, [
                        $a->id,
                        $a->triggered_at?->toIso8601String(),
                        $a->severity,
                        $a->status,
                        $a->rule?->name ?? $a->data['rule_name'] ?? '',
                        $a->site?->name ?? '',
                        $a->device?->name ?? '',
                        $a->device?->zone ?? '',
                        $a->data['metric'] ?? '',
                        $a->data['value'] ?? '',
                        $a->data['threshold'] ?? '',
                        $a->acknowledged_at?->toIso8601String() ?? '',
                        $a->acknowledgedByUser?->name ?? '',
                        $a->resolved_at?->toIso8601String() ?? '',
                        $a->resolvedByUser?->name ?? '',
                        $a->resolution_type ?? '',
                    ]);
                }
            });
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function escalate(Request $request, Alert $alert)
    {
        $this->authorize('escalate', $alert);

        if (! in_array($alert->status, ['active', 'acknowledged'])) {
            return back()->with('error', 'Only active or acknowledged alerts can be escalated.');
        }

        $chain = EscalationChain::where('site_id', $alert->site_id)->first();
        if (! $chain || empty($chain->levels)) {
            return back()->with('error', 'No escalation chain configured for this site.');
        }

        $levels = collect($chain->levels)->pluck('level')->sort()->values();
        if ($levels->isEmpty()) {
            return back()->with('error', 'Escalation chain has no levels defined.');
        }
        $targetLevel = (int) $levels->last();

        EscalateAlert::dispatch($alert, $chain, $targetLevel);

        // Record for audit trail
        $alert->update([
            'escalated_at' => now(),
            'escalated_by' => $request->user()->id,
            'escalated_to_level' => $targetLevel,
        ]);

        return back()->with('success', "Alert escalated to level {$targetLevel}.");
    }
}
