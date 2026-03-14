<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    /**
     * Allowed models for activity log queries
     */
    protected array $allowedModels = [
        'product' => \App\Models\Product::class,
        'category' => \App\Models\Category::class,
        'user' => \App\Models\User::class,
    ];

    /**
     * Display a listing of activity logs
     */
    public function index(Request $request): Response
    {
        // Validate and clamp per_page to prevent DoS via large queries
        $perPage = (int) $request->input('per_page', 15);
        $perPage = max(1, min($perPage, 100));

        $causerFilter = $request->input('causer');
        $subjectFilter = $request->input('subject');
        $eventFilter = $request->input('event');

        $query = Activity::query()
            ->with(['causer', 'subject'])
            ->latest();

        // Filter by causer (who performed the action)
        if ($causerFilter) {
            $query->where('causer_id', $causerFilter)
                ->where('causer_type', 'App\\Models\\User');
        }

        // Filter by subject (what was affected)
        if ($subjectFilter) {
            $query->where('subject_type', $subjectFilter);
        }

        // Filter by event type (created, updated, deleted)
        if ($eventFilter) {
            $query->where('event', $eventFilter);
        }

        $activities = $query->paginate($perPage);

        return Inertia::render('activity-log', [
            'activities' => $activities,
            'filters' => [
                'causer' => $causerFilter,
                'subject' => $subjectFilter,
                'event' => $eventFilter,
            ],
        ]);
    }

    /**
     * Get recent activity for a specific user
     */
    public function userActivity(Request $request, int $userId)
    {
        $currentUser = $request->user();

        // Authorization: Users can only view their own activity unless they have admin role
        if ($currentUser->id !== $userId && ! $currentUser->hasRole('admin')) {
            abort(403, 'You can only view your own activity.');
        }

        $activities = Activity::query()
            ->where('causer_id', $userId)
            ->where('causer_type', 'App\\Models\\User')
            ->with(['subject'])
            ->latest()
            ->limit(10)
            ->get();

        return response()->json($activities);
    }

    /**
     * Get activity for a specific model
     */
    public function modelActivity(Request $request, string $model, string $id)
    {
        $modelKey = strtolower($model);

        if (! array_key_exists($modelKey, $this->allowedModels)) {
            abort(404, 'Model not found');
        }

        $modelClass = $this->allowedModels[$modelKey];
        $currentUser = $request->user();

        // Authorization: For user activity, users can only view their own
        // For other models, require admin role
        if ($modelKey === 'user') {
            if ((string) $currentUser->id !== $id && ! $currentUser->hasRole('admin')) {
                abort(403, 'You can only view your own activity.');
            }
        } elseif (! $currentUser->hasRole('admin')) {
            // For other models (product, category), require admin role
            abort(403, 'Admin access required to view this activity.');
        }

        $activities = Activity::query()
            ->where('subject_id', $id)
            ->where('subject_type', $modelClass)
            ->with(['causer'])
            ->latest()
            ->get();

        return response()->json($activities);
    }
}
