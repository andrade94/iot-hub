<?php

namespace App\Http\Controllers;

use App\Jobs\SendWorkOrderNotification;
use App\Models\Site;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\WorkOrders\WorkOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WorkOrderController extends Controller
{
    /**
     * Verify an assignee belongs to the same org as the requester.
     * Super admins bypass the check. Returns true if ok, false otherwise.
     */
    private function canAssignTo(?int $assigneeId, Request $request): bool
    {
        if (! $assigneeId) {
            return true;
        }
        $requester = $request->user();
        if ($requester->hasRole('super_admin')) {
            return true;
        }
        $assignee = User::find($assigneeId);
        if (! $assignee) {
            return false;
        }
        return $assignee->org_id && $requester->org_id && $assignee->org_id === $requester->org_id;
    }


    public function index(Request $request)
    {
        $user = $request->user();
        $siteIds = $user->accessibleSites()->pluck('id');

        $query = WorkOrder::with(['site', 'device', 'assignedUser', 'createdByUser', 'alert'])
            ->whereIn('site_id', $siteIds);

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter by priority
        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }

        // Filter by type
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        // Filter by site
        if ($request->filled('site_id')) {
            $query->where('site_id', $request->input('site_id'));
        }

        // Filter by device
        if ($request->filled('device_id')) {
            $query->where('device_id', $request->input('device_id'));
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereHas('device', fn ($dq) => $dq->where('name', 'like', "%{$search}%"));
            });
        }

        // Date range
        $range = $request->input('range', '30d');
        $from = match ($range) {
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            'all' => null,
            default => now()->subDays(30),
        };
        if ($from) {
            $query->where('created_at', '>=', $from);
        }

        // Filter by assignment state
        if ($request->input('assigned') === 'me') {
            $query->where('assigned_to', $user->id);
        } elseif ($request->input('assigned') === 'unassigned') {
            $query->whereNull('assigned_to');
        }

        // Overdue filter: open WOs past SLA
        // SLA: urgent=2h, high=4h, medium=24h, low=72h
        if ($request->input('overdue') === '1') {
            $query->whereIn('status', ['open', 'assigned'])
                ->where(function ($q) {
                    $q->where(fn ($qq) => $qq->where('priority', 'urgent')->where('created_at', '<=', now()->subHours(2)))
                        ->orWhere(fn ($qq) => $qq->where('priority', 'high')->where('created_at', '<=', now()->subHours(4)))
                        ->orWhere(fn ($qq) => $qq->where('priority', 'medium')->where('created_at', '<=', now()->subDay()))
                        ->orWhere(fn ($qq) => $qq->where('priority', 'low')->where('created_at', '<=', now()->subHours(72)));
                });
        }

        $workOrders = $query->latest()->paginate(20)->withQueryString();

        // Compute age-in-status and SLA status for each work order
        $workOrders->getCollection()->transform(function ($wo) {
            $statusDuration = $this->computeStatusDuration($wo);
            $wo->status_duration = $statusDuration;
            $wo->is_overdue = $this->isOverdueSla($wo);
            return $wo;
        });

        // Count overdue for filter pill — must match the filter query above (includes low)
        $overdueCount = WorkOrder::whereIn('site_id', $siteIds)
            ->whereIn('status', ['open', 'assigned'])
            ->where(function ($q) {
                $q->where(fn ($qq) => $qq->where('priority', 'urgent')->where('created_at', '<=', now()->subHours(2)))
                    ->orWhere(fn ($qq) => $qq->where('priority', 'high')->where('created_at', '<=', now()->subHours(4)))
                    ->orWhere(fn ($qq) => $qq->where('priority', 'medium')->where('created_at', '<=', now()->subDay()))
                    ->orWhere(fn ($qq) => $qq->where('priority', 'low')->where('created_at', '<=', now()->subHours(72)));
            })
            ->count();

        // Counts for KPI header
        $countsQuery = WorkOrder::whereIn('site_id', $siteIds);
        if ($from) {
            $countsQuery->where('created_at', '>=', $from);
        }
        $counts = [
            'total' => (clone $countsQuery)->count(),
            'open' => (clone $countsQuery)->whereIn('status', ['open', 'assigned', 'in_progress'])->count(),
            'urgent' => (clone $countsQuery)->where('priority', 'urgent')->whereIn('status', ['open', 'assigned', 'in_progress'])->count(),
            'overdue' => $overdueCount,
        ];

        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        // Devices for the dropdown — filtered by selected site if any
        $devices = \App\Models\Device::whereIn('site_id', $siteIds)
            ->when($request->filled('site_id'), fn ($q) => $q->where('site_id', $request->input('site_id')))
            ->orderBy('name')
            ->get(['id', 'name', 'site_id'])
            ->map(fn ($d) => ['id' => $d->id, 'name' => $d->name, 'site_id' => $d->site_id]);

        // Get technicians for bulk assign dropdown (site_manager+ only)
        $technicians = [];
        $technicianWorkload = [];
        if ($user->hasAnyRole(['super_admin', 'client_org_admin', 'client_site_manager'])) {
            $techQuery = User::role('technician')
                ->when($user->org_id, fn ($q) => $q->where('org_id', $user->org_id))
                ->select('id', 'name');

            $technicians = (clone $techQuery)->get();

            $technicianWorkload = (clone $techQuery)
                ->withCount(['assignedWorkOrders as open_count' => function ($q) {
                    $q->whereNotIn('status', ['completed', 'cancelled']);
                }])
                ->get()
                ->map(fn ($tech) => [
                    'id' => $tech->id,
                    'name' => $tech->name,
                    'open_count' => $tech->open_count ?? 0,
                ]);
        }

        return Inertia::render('work-orders/index', [
            'workOrders' => $workOrders,
            'sites' => $sites,
            'devices' => $devices,
            'counts' => $counts,
            'filters' => $request->only(['status', 'priority', 'type', 'assigned', 'site_id', 'device_id', 'search', 'range', 'overdue']) + ['range' => $range],
            'isTechnician' => $user->hasRole('technician'),
            'technicians' => $technicians,
            'technicianWorkload' => $technicianWorkload,
        ]);
    }

    /**
     * Compute human-readable duration in current status.
     */
    private function computeStatusDuration(WorkOrder $wo): string
    {
        $since = match ($wo->status) {
            'completed', 'cancelled' => $wo->updated_at,
            default => $wo->updated_at,
        };
        return $since->diffForHumans(null, true, true);
    }

    /**
     * Check if an open/assigned WO is past its SLA.
     */
    private function isOverdueSla(WorkOrder $wo): bool
    {
        if (! in_array($wo->status, ['open', 'assigned'])) {
            return false;
        }
        $slaHours = match ($wo->priority) {
            'urgent' => 2,
            'high' => 4,
            'medium' => 24,
            'low' => 72,
            default => 24,
        };
        return $wo->created_at->addHours($slaHours)->isPast();
    }

    public function show(WorkOrder $workOrder)
    {
        $workOrder->load([
            'site',
            'alert',
            'device',
            'assignedUser',
            'createdByUser',
            'photos.uploadedByUser',
            'notes.user',
        ]);

        $workOrder->status_duration = $this->computeStatusDuration($workOrder);
        $workOrder->is_overdue = $this->isOverdueSla($workOrder);
        $workOrder->open_hours = (int) $workOrder->created_at->diffInHours(now());

        // Build status transition timeline. Prefer the dedicated timestamp
        // columns (assigned_at/started_at/completed_at); fall back to the
        // activity log for historical rows where those columns are null.
        $statusTransitions = [
            'open' => $workOrder->created_at?->toIso8601String(),
            'assigned' => $workOrder->assigned_at?->toIso8601String(),
            'in_progress' => $workOrder->started_at?->toIso8601String(),
            'completed' => $workOrder->completed_at?->toIso8601String(),
        ];
        if (! $statusTransitions['assigned'] || ! $statusTransitions['in_progress'] || ! $statusTransitions['completed']) {
            $fromLog = $this->buildStatusTransitions($workOrder);
            foreach (['assigned', 'in_progress', 'completed'] as $state) {
                if (! $statusTransitions[$state] && isset($fromLog[$state])) {
                    $statusTransitions[$state] = $fromLog[$state];
                }
            }
        }

        // Technicians for the assign dialog
        $user = request()->user();
        $technicians = User::role('technician')
            ->when($user->org_id, fn ($q) => $q->where('org_id', $user->org_id))
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('work-orders/show', [
            'workOrder' => $workOrder,
            'technicians' => $technicians,
            'statusTransitions' => $statusTransitions,
        ]);
    }

    /**
     * Build a status → timestamp map from the Spatie activity log.
     * Returns e.g. ['open' => '2026-04-10T...', 'assigned' => '...', ...].
     */
    private function buildStatusTransitions(WorkOrder $workOrder): array
    {
        $transitions = [
            'open' => $workOrder->created_at?->toIso8601String(),
        ];

        $activities = \Spatie\Activitylog\Models\Activity::where('subject_type', WorkOrder::class)
            ->where('subject_id', $workOrder->id)
            ->where('event', 'updated')
            ->orderBy('created_at')
            ->get();

        foreach ($activities as $activity) {
            $newStatus = data_get($activity->properties, 'attributes.status');
            $oldStatus = data_get($activity->properties, 'old.status');
            if ($newStatus && $newStatus !== $oldStatus && ! isset($transitions[$newStatus])) {
                $transitions[$newStatus] = $activity->created_at?->toIso8601String();
            }
        }

        return $transitions;
    }

    public function store(Request $request, Site $site)
    {
        $this->authorize('create', WorkOrder::class);

        $validated = $request->validate([
            'type' => 'required|string|in:battery_replace,sensor_replace,maintenance,inspection,install',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|string|in:low,medium,high,urgent',
            'device_id' => 'nullable|exists:devices,id',
            'alert_id' => 'nullable|exists:alerts,id',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        if (! $this->canAssignTo($validated['assigned_to'] ?? null, $request)) {
            return back()->with('error', 'Cannot assign work order to a user outside your organization.');
        }

        $validated['site_id'] = $site->id;
        $validated['created_by'] = $request->user()->id;
        if (! empty($validated['assigned_to'])) {
            $validated['status'] = 'assigned';
            $validated['assigned_at'] = now();
        }

        $workOrder = WorkOrder::create($validated);

        if ($workOrder->assigned_to) {
            SendWorkOrderNotification::dispatch($workOrder, 'assigned');
        }

        return back()->with('success', 'Work order created.');
    }

    public function update(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('update', $workOrder);

        $validated = $request->validate([
            'type' => 'required|string|in:battery_replace,sensor_replace,maintenance,inspection,install',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|string|in:low,medium,high,urgent',
        ]);

        $workOrder->update($validated);

        return back()->with('success', 'Work order updated.');
    }

    public function destroy(WorkOrder $workOrder)
    {
        $this->authorize('delete', $workOrder);

        $workOrder->delete();

        return redirect()->route('work-orders.index')->with('success', 'Work order deleted.');
    }

    public function updateStatus(Request $request, WorkOrder $workOrder)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:assigned,in_progress,completed,cancelled',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        // Completing a work order uses the dedicated complete() endpoint
        // which also captures notes + optional sign-off photo.
        if ($validated['status'] === 'completed') {
            return back()->with('error', 'Use the complete endpoint to finalize a work order.');
        }

        $this->authorize('update', $workOrder);

        // Cross-org assignment guard
        if ($validated['status'] === 'assigned' && ! $this->canAssignTo($validated['assigned_to'] ?? null, $request)) {
            return back()->with('error', 'Cannot assign work order to a user outside your organization.');
        }

        $user = $request->user();

        try {
            match ($validated['status']) {
                'assigned' => $workOrder->assign($validated['assigned_to'] ?? $user->id),
                'in_progress' => $workOrder->start(),
                'cancelled' => $workOrder->cancel(),
            };
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        // Notify on state change
        SendWorkOrderNotification::dispatch($workOrder->fresh(), 'status_changed');

        return back()->with('success', 'Work order status updated.');
    }

    public function complete(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('complete', $workOrder);

        $validated = $request->validate([
            'completion_notes' => 'required|string|max:2000',
            'photo' => 'nullable|image|max:5120',
        ]);

        $user = $request->user();
        $service = app(WorkOrderService::class);

        try {
            // Persist completion notes as a work order note first
            $workOrder->notes()->create([
                'user_id' => $user->id,
                'note' => $validated['completion_notes'],
            ]);

            // Optional sign-off photo
            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('work-order-photos', 'public');
                $workOrder->photos()->create([
                    'photo_path' => $path,
                    'caption' => 'Completion sign-off',
                    'uploaded_by' => $user->id,
                    'uploaded_at' => now(),
                ]);
            }

            $service->complete($workOrder, $user->id);
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        SendWorkOrderNotification::dispatch($workOrder->fresh(), 'status_changed');

        return back()->with('success', 'Work order completed.');
    }

    public function export(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', WorkOrder::class);

        $user = $request->user();
        $siteIds = $user->accessibleSites()->pluck('id');

        $query = WorkOrder::with(['site', 'device', 'assignedUser', 'createdByUser', 'alert'])
            ->whereIn('site_id', $siteIds);

        // Mirror the same filters as index()
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }
        if ($request->filled('site_id')) {
            $query->where('site_id', $request->input('site_id'));
        }
        if ($request->filled('device_id')) {
            $query->where('device_id', $request->input('device_id'));
        }
        if ($request->input('assigned') === 'me') {
            $query->where('assigned_to', $user->id);
        } elseif ($request->input('assigned') === 'unassigned') {
            $query->whereNull('assigned_to');
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereHas('device', fn ($dq) => $dq->where('name', 'like', "%{$search}%"));
            });
        }
        $range = $request->input('range', '30d');
        $from = match ($range) {
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            'all' => null,
            default => now()->subDays(30),
        };
        if ($from) {
            $query->where('created_at', '>=', $from);
        }

        $filename = 'work-orders-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'ID', 'Title', 'Type', 'Priority', 'Status', 'Site', 'Device', 'Zone',
                'Alert ID', 'Assigned To', 'Created By', 'Created At', 'Assigned At',
                'Started At', 'Completed At', 'Duration (hours)',
            ]);
            $query->orderBy('created_at', 'desc')->chunk(500, function ($workOrders) use ($out) {
                foreach ($workOrders as $wo) {
                    $durationHours = null;
                    if ($wo->completed_at) {
                        $durationHours = round($wo->created_at->diffInMinutes($wo->completed_at) / 60, 2);
                    }
                    fputcsv($out, [
                        $wo->id,
                        $wo->title,
                        $wo->type,
                        $wo->priority,
                        $wo->status,
                        $wo->site?->name ?? '',
                        $wo->device?->name ?? '',
                        $wo->device?->zone ?? '',
                        $wo->alert_id ?? '',
                        $wo->assignedUser?->name ?? '',
                        $wo->createdByUser?->name ?? '',
                        $wo->created_at?->toIso8601String() ?? '',
                        $wo->assigned_at?->toIso8601String() ?? '',
                        $wo->started_at?->toIso8601String() ?? '',
                        $wo->completed_at?->toIso8601String() ?? '',
                        $durationHours ?? '',
                    ]);
                }
            });
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function bulkAssign(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:50',
            'ids.*' => 'integer|exists:work_orders,id',
            'assigned_to' => 'required|exists:users,id',
        ]);

        if (! $this->canAssignTo($validated['assigned_to'], $request)) {
            return back()->with('error', 'Cannot assign work orders to a user outside your organization.');
        }

        $user = $request->user();
        $succeeded = 0;
        $failed = 0;

        foreach ($validated['ids'] as $id) {
            $wo = WorkOrder::find($id);
            if (! $wo) {
                $failed++;
                continue;
            }
            if (! $user->can('update', $wo)) {
                $failed++;
                continue;
            }
            if (! $user->hasRole('super_admin') && ! $user->canAccessSite($wo->site_id)) {
                $failed++;
                continue;
            }
            try {
                $wo->assign($validated['assigned_to']);
                SendWorkOrderNotification::dispatch($wo->fresh(), 'assigned');
                $succeeded++;
            } catch (\InvalidArgumentException) {
                $failed++;
            }
        }

        $message = "{$succeeded} work order(s) assigned.";
        if ($failed > 0) {
            $message .= " {$failed} skipped.";
        }

        return back()->with('success', $message);
    }

    public function addPhoto(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('update', $workOrder);

        $request->validate([
            'photo' => 'required|image|max:5120',
            'caption' => 'nullable|string|max:255',
        ]);

        $path = $request->file('photo')->store('work-order-photos', 'public');

        $workOrder->photos()->create([
            'photo_path' => $path,
            'caption' => $request->input('caption'),
            'uploaded_by' => $request->user()->id,
            'uploaded_at' => now(),
        ]);

        return back()->with('success', 'Photo uploaded.');
    }

    public function addNote(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('update', $workOrder);

        $request->validate([
            'note' => 'required|string|max:2000',
        ]);

        $workOrder->notes()->create([
            'user_id' => $request->user()->id,
            'note' => $request->input('note'),
        ]);

        return back()->with('success', 'Note added.');
    }
}
