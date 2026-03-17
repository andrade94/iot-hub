<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'severity' => 'nullable|string|in:critical,high,medium,low',
            'status' => 'nullable|string|in:active,acknowledged,resolved,dismissed',
            'site_id' => 'nullable|integer|exists:sites,id',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        /** @var User $user */
        $user = $request->user();
        $siteIds = $user->accessibleSites()->pluck('id');

        $query = Alert::whereIn('site_id', $siteIds)
            ->with(['device:id,name,model,zone', 'site:id,name'])
            ->latest('triggered_at');

        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('site_id')) {
            if (! $user->canAccessSite((int) $request->site_id)) {
                abort(403, 'You do not have access to this site.');
            }
            $query->where('site_id', $request->site_id);
        }

        $perPage = $request->integer('per_page', 20);
        $alerts = $query->paginate($perPage);

        $alerts->getCollection()->transform(fn (Alert $alert) => [
            'id' => $alert->id,
            'severity' => $alert->severity,
            'status' => $alert->status,
            'triggered_at' => $alert->triggered_at?->toIso8601String(),
            'acknowledged_at' => $alert->acknowledged_at?->toIso8601String(),
            'resolved_at' => $alert->resolved_at?->toIso8601String(),
            'data' => $alert->data,
            'device' => $alert->device ? [
                'id' => $alert->device->id,
                'name' => $alert->device->name,
                'model' => $alert->device->model,
                'zone' => $alert->device->zone,
            ] : null,
            'site' => [
                'id' => $alert->site->id,
                'name' => $alert->site->name,
            ],
        ]);

        return response()->json($alerts);
    }

    public function show(Request $request, Alert $alert): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccessSite($alert->site_id)) {
            abort(403, 'You do not have access to this alert.');
        }

        $alert->load([
            'device:id,name,model,zone,battery_pct,rssi,last_reading_at',
            'site:id,name',
            'rule:id,name,type,conditions,severity',
            'notifications' => fn ($q) => $q->with('user:id,name')->latest('sent_at'),
            'resolvedByUser:id,name',
        ]);

        return response()->json([
            'data' => [
                'id' => $alert->id,
                'severity' => $alert->severity,
                'status' => $alert->status,
                'triggered_at' => $alert->triggered_at?->toIso8601String(),
                'acknowledged_at' => $alert->acknowledged_at?->toIso8601String(),
                'resolved_at' => $alert->resolved_at?->toIso8601String(),
                'resolution_type' => $alert->resolution_type,
                'resolved_by' => $alert->resolvedByUser ? [
                    'id' => $alert->resolvedByUser->id,
                    'name' => $alert->resolvedByUser->name,
                ] : null,
                'data' => $alert->data,
                'device' => $alert->device ? [
                    'id' => $alert->device->id,
                    'name' => $alert->device->name,
                    'model' => $alert->device->model,
                    'zone' => $alert->device->zone,
                    'battery_pct' => $alert->device->battery_pct,
                    'rssi' => $alert->device->rssi,
                    'last_reading_at' => $alert->device->last_reading_at?->toIso8601String(),
                ] : null,
                'site' => [
                    'id' => $alert->site->id,
                    'name' => $alert->site->name,
                ],
                'rule' => $alert->rule ? [
                    'id' => $alert->rule->id,
                    'name' => $alert->rule->name,
                    'type' => $alert->rule->type,
                    'conditions' => $alert->rule->conditions,
                ] : null,
                'notifications' => $alert->notifications->map(fn ($n) => [
                    'id' => $n->id,
                    'channel' => $n->channel,
                    'status' => $n->status,
                    'sent_at' => $n->sent_at?->toIso8601String(),
                    'delivered_at' => $n->delivered_at?->toIso8601String(),
                    'user' => $n->user ? [
                        'id' => $n->user->id,
                        'name' => $n->user->name,
                    ] : null,
                ]),
            ],
        ]);
    }

    public function acknowledge(Request $request, Alert $alert): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccessSite($alert->site_id)) {
            abort(403, 'You do not have access to this alert.');
        }

        if (! $user->hasAnyRole(['site_manager', 'technician', 'org_admin', 'super_admin'])) {
            abort(403, 'You do not have permission to acknowledge alerts.');
        }

        if ($alert->status !== 'active') {
            return response()->json([
                'message' => 'Alert can only be acknowledged when active.',
            ], 422);
        }

        $alert->acknowledge($user->id);

        return response()->json([
            'data' => [
                'id' => $alert->id,
                'status' => $alert->status,
                'acknowledged_at' => $alert->acknowledged_at?->toIso8601String(),
            ],
        ]);
    }

    public function resolve(Request $request, Alert $alert): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->canAccessSite($alert->site_id)) {
            abort(403, 'You do not have access to this alert.');
        }

        if (! $user->hasAnyRole(['site_manager', 'technician', 'org_admin', 'super_admin'])) {
            abort(403, 'You do not have permission to resolve alerts.');
        }

        if (in_array($alert->status, ['resolved', 'dismissed'])) {
            return response()->json([
                'message' => 'Alert is already resolved.',
            ], 422);
        }

        $alert->resolve($user->id);

        return response()->json([
            'data' => [
                'id' => $alert->id,
                'status' => $alert->status,
                'resolved_at' => $alert->resolved_at?->toIso8601String(),
            ],
        ]);
    }
}
