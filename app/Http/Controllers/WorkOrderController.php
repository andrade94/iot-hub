<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Models\WorkOrder;
use App\Services\WorkOrders\WorkOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WorkOrderController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = WorkOrder::with(['site', 'device', 'assignedTo', 'createdBy']);

        // Scope by user's accessible sites
        if (! $user->hasRole('super_admin')) {
            $siteIds = $user->accessibleSites()->pluck('id');
            $query->whereIn('site_id', $siteIds);
        }

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

        // Filter by assigned to current user
        if ($request->input('assigned') === 'me') {
            $query->where('assigned_to', $user->id);
        }

        $workOrders = $query->latest()->paginate(20)->withQueryString();

        // Get technicians for bulk assign dropdown (site_manager+ only)
        $technicians = [];
        if ($user->hasAnyRole(['super_admin', 'org_admin', 'site_manager'])) {
            $technicians = \App\Models\User::role('technician')
                ->where('org_id', $user->org_id)
                ->select('id', 'name')
                ->get();
        }

        return Inertia::render('work-orders/index', [
            'workOrders' => $workOrders,
            'filters' => $request->only(['status', 'priority', 'type', 'assigned']),
            'isTechnician' => $user->hasRole('technician'),
            'technicians' => $technicians,
        ]);
    }

    public function show(WorkOrder $workOrder)
    {
        $workOrder->load([
            'site',
            'alert',
            'device',
            'assignedTo',
            'createdBy',
            'photos.uploadedByUser',
            'notes.user',
        ]);

        return Inertia::render('work-orders/show', [
            'workOrder' => $workOrder,
        ]);
    }

    public function store(Request $request, Site $site)
    {
        $validated = $request->validate([
            'type' => 'required|string|in:battery_replace,sensor_replace,maintenance,inspection,install',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|string|in:low,medium,high,urgent',
            'device_id' => 'nullable|exists:devices,id',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $validated['site_id'] = $site->id;
        $validated['created_by'] = $request->user()->id;

        WorkOrder::create($validated);

        return redirect()->route('work-orders.index')
            ->with('success', 'Work order created.');
    }

    public function updateStatus(Request $request, WorkOrder $workOrder)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:assigned,in_progress,completed,cancelled',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $user = $request->user();
        $service = app(WorkOrderService::class);

        try {
            match ($validated['status']) {
                'assigned' => $workOrder->assign($validated['assigned_to'] ?? $user->id),
                'in_progress' => $workOrder->start(),
                'completed' => $service->complete($workOrder, $user->id),
                'cancelled' => $workOrder->cancel(),
            };
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Work order status updated.');
    }

    public function bulkAssign(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:50',
            'ids.*' => 'integer|exists:work_orders,id',
            'assigned_to' => 'required|exists:users,id',
        ]);

        $user = $request->user();
        $succeeded = 0;
        $failed = 0;

        foreach ($validated['ids'] as $id) {
            $wo = WorkOrder::find($id);
            if (! $wo) {
                $failed++;
                continue;
            }
            // Check site access
            if (! $user->hasRole('super_admin') && ! $user->canAccessSite($wo->site_id)) {
                $failed++;
                continue;
            }
            try {
                $wo->assign($validated['assigned_to']);
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
