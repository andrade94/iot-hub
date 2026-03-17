<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendWorkOrderNotification;
use App\Models\Site;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class WorkOrderApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => 'nullable|string|in:open,assigned,in_progress,completed,cancelled',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'site_id' => 'nullable|integer|exists:sites,id',
            'assigned_to' => 'nullable|string|in:me',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        /** @var User $user */
        $user = $request->user();
        $siteIds = $user->accessibleSites()->pluck('id');

        $query = WorkOrder::whereIn('site_id', $siteIds)
            ->with([
                'site:id,name',
                'device:id,name,model',
                'assignedTo:id,name',
            ])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('site_id')) {
            if (! $user->canAccessSite((int) $request->site_id)) {
                abort(403, 'You do not have access to this site.');
            }
            $query->where('site_id', $request->site_id);
        }

        if ($request->input('assigned_to') === 'me') {
            $query->where('assigned_to', $user->id);
        }

        $perPage = $request->integer('per_page', 20);
        $workOrders = $query->paginate($perPage);

        $workOrders->getCollection()->transform(fn (WorkOrder $wo) => [
            'id' => $wo->id,
            'title' => $wo->title,
            'type' => $wo->type,
            'status' => $wo->status,
            'priority' => $wo->priority,
            'created_at' => $wo->created_at?->toIso8601String(),
            'site' => [
                'id' => $wo->site->id,
                'name' => $wo->site->name,
            ],
            'device' => $wo->device ? [
                'id' => $wo->device->id,
                'name' => $wo->device->name,
                'model' => $wo->device->model,
            ] : null,
            'assigned_to' => $wo->assignedTo ? [
                'id' => $wo->assignedTo->id,
                'name' => $wo->assignedTo->name,
            ] : null,
        ]);

        return response()->json($workOrders);
    }

    public function show(Request $request, WorkOrder $workOrder): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccessSite($workOrder->site_id)) {
            abort(403, 'You do not have access to this work order.');
        }

        $workOrder->load([
            'site:id,name',
            'device:id,name,model,zone',
            'assignedTo:id,name,email',
            'createdBy:id,name',
            'photos',
            'notes' => fn ($q) => $q->with('user:id,name')->latest(),
        ]);

        return response()->json([
            'data' => [
                'id' => $workOrder->id,
                'title' => $workOrder->title,
                'description' => $workOrder->description,
                'type' => $workOrder->type,
                'status' => $workOrder->status,
                'priority' => $workOrder->priority,
                'created_at' => $workOrder->created_at?->toIso8601String(),
                'updated_at' => $workOrder->updated_at?->toIso8601String(),
                'site' => [
                    'id' => $workOrder->site->id,
                    'name' => $workOrder->site->name,
                ],
                'device' => $workOrder->device ? [
                    'id' => $workOrder->device->id,
                    'name' => $workOrder->device->name,
                    'model' => $workOrder->device->model,
                    'zone' => $workOrder->device->zone,
                ] : null,
                'assigned_to' => $workOrder->assignedTo ? [
                    'id' => $workOrder->assignedTo->id,
                    'name' => $workOrder->assignedTo->name,
                    'email' => $workOrder->assignedTo->email,
                ] : null,
                'created_by' => $workOrder->createdBy ? [
                    'id' => $workOrder->createdBy->id,
                    'name' => $workOrder->createdBy->name,
                ] : null,
                'photos' => $workOrder->photos->map(fn ($photo) => [
                    'id' => $photo->id,
                    'photo_path' => $photo->photo_path,
                    'caption' => $photo->caption,
                    'uploaded_at' => $photo->uploaded_at?->toIso8601String(),
                ]),
                'notes' => $workOrder->notes->map(fn ($note) => [
                    'id' => $note->id,
                    'note' => $note->note,
                    'created_at' => $note->created_at?->toIso8601String(),
                    'user' => $note->user ? [
                        'id' => $note->user->id,
                        'name' => $note->user->name,
                    ] : null,
                ]),
            ],
        ]);
    }

    public function store(Request $request, Site $site): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccessSite($site->id)) {
            abort(403, 'You do not have access to this site.');
        }

        if (! $user->hasAnyRole(['site_manager', 'org_admin', 'super_admin'])) {
            abort(403, 'You do not have permission to create work orders.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'type' => 'required|string|in:battery_replace,sensor_replace,maintenance,inspection,install',
            'priority' => 'required|string|in:low,medium,high,urgent',
            'device_id' => 'nullable|integer|exists:devices,id',
            'assigned_to' => 'nullable|integer|exists:users,id',
        ]);

        $workOrder = $site->workOrders()->create([
            ...$validated,
            'status' => ($validated['assigned_to'] ?? null) ? 'assigned' : 'open',
            'created_by' => $user->id,
        ]);

        $workOrder->load(['site:id,name', 'device:id,name,model', 'assignedTo:id,name']);

        if ($workOrder->assigned_to) {
            SendWorkOrderNotification::dispatch($workOrder, 'assigned');
        }

        return response()->json([
            'data' => [
                'id' => $workOrder->id,
                'title' => $workOrder->title,
                'type' => $workOrder->type,
                'status' => $workOrder->status,
                'priority' => $workOrder->priority,
            ],
        ], 201);
    }

    public function updateStatus(Request $request, WorkOrder $workOrder): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccessSite($workOrder->site_id)) {
            abort(403, 'You do not have access to this work order.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:open,assigned,in_progress,completed,cancelled',
        ]);

        $newStatus = $validated['status'];

        $allowedTransitions = [
            'open' => ['assigned', 'in_progress', 'cancelled'],
            'assigned' => ['in_progress', 'cancelled'],
            'in_progress' => ['completed', 'cancelled'],
            'completed' => [],
            'cancelled' => [],
        ];

        if (! in_array($newStatus, $allowedTransitions[$workOrder->status] ?? [])) {
            return response()->json([
                'message' => "Cannot transition from '{$workOrder->status}' to '{$newStatus}'.",
            ], 422);
        }

        match ($newStatus) {
            'assigned' => $workOrder->assign($user->id),
            'in_progress' => $workOrder->start(),
            'completed' => $workOrder->complete(),
            'cancelled' => $workOrder->cancel(),
            default => $workOrder->update(['status' => $newStatus]),
        };

        SendWorkOrderNotification::dispatch($workOrder, 'status_changed');

        return response()->json([
            'data' => [
                'id' => $workOrder->id,
                'status' => $workOrder->status,
            ],
        ]);
    }

    public function storePhoto(Request $request, WorkOrder $workOrder): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccessSite($workOrder->site_id)) {
            abort(403, 'You do not have access to this work order.');
        }

        $request->validate([
            'photo' => 'required|image|max:10240',
            'caption' => 'nullable|string|max:500',
        ]);

        $path = $request->file('photo')->store("work-orders/{$workOrder->id}", 'public');

        $photo = $workOrder->photos()->create([
            'photo_path' => $path,
            'caption' => $request->input('caption'),
            'uploaded_by' => $user->id,
            'uploaded_at' => now(),
        ]);

        return response()->json([
            'data' => [
                'id' => $photo->id,
                'photo_path' => $photo->photo_path,
                'caption' => $photo->caption,
            ],
        ], 201);
    }

    public function storeNote(Request $request, WorkOrder $workOrder): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccessSite($workOrder->site_id)) {
            abort(403, 'You do not have access to this work order.');
        }

        $validated = $request->validate([
            'note' => 'required|string|max:5000',
        ]);

        $note = $workOrder->notes()->create([
            'user_id' => $user->id,
            'note' => $validated['note'],
        ]);

        $note->load('user:id,name');

        return response()->json([
            'data' => [
                'id' => $note->id,
                'note' => $note->note,
                'created_at' => $note->created_at?->toIso8601String(),
                'user' => [
                    'id' => $note->user->id,
                    'name' => $note->user->name,
                ],
            ],
        ], 201);
    }
}
