<?php

namespace App\Http\Controllers;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    /**
     * Allowed models for activity log queries
     */
    protected array $allowedModels = [
        'user' => \App\Models\User::class,
        'organization' => \App\Models\Organization::class,
        'site' => \App\Models\Site::class,
    ];

    /**
     * Entities whose hard-deletion should be flagged for review.
     */
    protected array $criticalDeletes = [
        \App\Models\User::class,
        \App\Models\Organization::class,
        \App\Models\Site::class,
    ];

    /**
     * Display a listing of activity logs.
     */
    public function index(Request $request): Response
    {
        $perPage = (int) $request->input('per_page', 15);
        $perPage = max(1, min($perPage, 100));

        $filters = $this->buildFilters($request);
        $since = $this->rangeToSince($filters['range']);

        // Base query with every filter except `event` applied — used for per-event pill counts.
        $base = $this->buildQuery($filters, $since, includeEvent: false);

        $eventCounts = (clone $base)
            ->select('event', DB::raw('count(*) as total'))
            ->groupBy('event')
            ->pluck('total', 'event')
            ->toArray();

        $eventCounts['all'] = array_sum($eventCounts);

        // Count flagged in the current filter scope (for the Flagged pill badge).
        $flaggedCount = (clone $base)
            ->where('event', 'deleted')
            ->whereIn('subject_type', $this->criticalDeletes)
            ->count();

        // Apply the event filter for the actual listing.
        $query = (clone $base)->with(['causer', 'subject'])->latest();
        if ($filters['event']) {
            $query->where('event', $filters['event']);
        }

        $activities = $query->paginate($perPage)->withQueryString();

        $activities->getCollection()->transform(function (Activity $a) {
            return [
                'id' => $a->id,
                'log_name' => $a->log_name,
                'description' => $a->description,
                'event' => $a->event,
                'subject_type' => $a->subject_type,
                'subject_id' => $a->subject_id,
                'subject_label' => $this->labelForSubject($a),
                'causer_id' => $a->causer_id,
                'causer_name' => $a->causer?->name,
                'causer_email' => $a->causer instanceof User ? $a->causer->email : null,
                'causer_initials' => $this->initials($a->causer?->name),
                'properties' => $a->properties->toArray(),
                'batch_uuid' => $a->batch_uuid,
                'created_at' => $a->created_at?->toIso8601String(),
                'is_flagged' => $this->isFlagged($a),
            ];
        });

        return Inertia::render('activity-log', [
            'activities' => $activities,
            'filters' => $filters,
            'event_counts' => $eventCounts,
            'flagged_count' => $flaggedCount,
            'stats' => $this->getStats($since, $filters),
            'options' => $this->getFilterOptions($since),
        ]);
    }

    /**
     * Stream a CSV export of the filtered activity log.
     *
     * Uses streamDownload so memory stays flat on large exports.
     */
    public function export(Request $request): StreamedResponse
    {
        $filters = $this->buildFilters($request);
        $since = $this->rangeToSince($filters['range']);

        $query = $this->buildQuery($filters, $since, includeEvent: true)
            ->with(['causer', 'subject'])
            ->latest();

        $filename = sprintf('activity-log-%s.csv', now()->format('Y-m-d-His'));

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            // BOM so Excel opens UTF-8 cleanly.
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Timestamp',
                'Actor',
                'Actor Email',
                'Event',
                'Entity Type',
                'Entity ID',
                'Entity Label',
                'Description',
                'Flagged',
                'Batch UUID',
            ], ',', '"', '\\');

            $query->chunk(500, function ($chunk) use ($out) {
                foreach ($chunk as $activity) {
                    fputcsv($out, [
                        $activity->created_at?->toIso8601String(),
                        $activity->causer?->name ?? 'System',
                        $activity->causer instanceof \App\Models\User ? $activity->causer->email : '',
                        $activity->event ?? '',
                        $activity->subject_type ? class_basename($activity->subject_type) : '',
                        $activity->subject_id ?? '',
                        $this->labelForSubject($activity) ?? '',
                        $activity->description ?? '',
                        $this->isFlagged($activity) ? 'yes' : 'no',
                        $activity->batch_uuid ?? '',
                    ], ',', '"', '\\');
                }
            });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ]);
    }

    /**
     * Get recent activity for a specific user (API endpoint for the profile page).
     */
    public function userActivity(Request $request, int $userId)
    {
        $currentUser = $request->user();

        if ($currentUser->id !== $userId && ! $currentUser->hasAnyRole(['super_admin', 'client_org_admin'])) {
            abort(403, 'You can only view your own activity.');
        }

        $activities = Activity::query()
            ->where('causer_id', $userId)
            ->where('causer_type', \App\Models\User::class)
            ->with(['subject'])
            ->latest()
            ->limit(10)
            ->get();

        return response()->json($activities);
    }

    /**
     * Get activity for a specific model.
     */
    public function modelActivity(Request $request, string $model, string $id)
    {
        $modelKey = strtolower($model);

        if (! array_key_exists($modelKey, $this->allowedModels)) {
            abort(404, 'Model not found');
        }

        $modelClass = $this->allowedModels[$modelKey];
        $currentUser = $request->user();

        if ($modelKey === 'user') {
            if ((string) $currentUser->id !== $id && ! $currentUser->hasRole('admin')) {
                abort(403, 'You can only view your own activity.');
            }
        } elseif (! $currentUser->hasAnyRole(['super_admin', 'client_org_admin'])) {
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

    // ─────────────────────────────────────────────────────────────
    //  Filter / query builders (shared by index + export)
    // ─────────────────────────────────────────────────────────────

    /**
     * Read the request, sanitize it, and return a normalized filters array.
     */
    private function buildFilters(Request $request): array
    {
        $range = $request->input('range', '7d');
        if (! in_array($range, ['24h', '7d', '30d', 'all'], true)) {
            $range = '7d';
        }

        // Validate causer / subject_id as integers. `integer()` returns 0 when missing
        // or non-numeric, so preserve null for "not filtered".
        $causer = $request->filled('causer') && ctype_digit((string) $request->input('causer'))
            ? (int) $request->input('causer')
            : null;

        $subjectId = $request->filled('subject_id') && ctype_digit((string) $request->input('subject_id'))
            ? (int) $request->input('subject_id')
            : null;

        $subjectType = $request->input('subject_type') ?: null;
        if ($subjectType && ! str_starts_with($subjectType, 'App\\Models\\')) {
            // Reject arbitrary class strings — only allow the App\Models namespace.
            $subjectType = null;
        }

        $event = $request->input('event') ?: null;
        if ($event && ! in_array($event, ['created', 'updated', 'deleted'], true)) {
            $event = null;
        }

        return [
            'causer' => $causer,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'event' => $event,
            'search' => $request->input('search') ?: null,
            'flagged' => $request->boolean('flagged') ?: null,
            'range' => $range,
        ];
    }

    /**
     * Build the Activity query with filters applied, optionally excluding the event filter.
     */
    private function buildQuery(array $filters, ?Carbon $since, bool $includeEvent): \Illuminate\Database\Eloquent\Builder
    {
        $q = Activity::query();

        if ($since) {
            $q->where('created_at', '>=', $since);
        }
        if ($filters['causer']) {
            $q->where('causer_id', $filters['causer'])
                ->where('causer_type', \App\Models\User::class);
        }
        if ($filters['subject_type']) {
            $q->where('subject_type', $filters['subject_type']);
        }
        if ($filters['subject_id']) {
            $q->where('subject_id', $filters['subject_id']);
        }
        if ($filters['search']) {
            $needle = '%'.$filters['search'].'%';
            $q->where(function ($inner) use ($needle) {
                $inner->where('description', 'like', $needle)
                    ->orWhere('subject_type', 'like', $needle);
            });
        }
        if ($filters['flagged']) {
            $q->where('event', 'deleted')
                ->whereIn('subject_type', $this->criticalDeletes);
        }
        if ($includeEvent && $filters['event']) {
            $q->where('event', $filters['event']);
        }

        return $q;
    }

    // ─────────────────────────────────────────────────────────────
    //  Stats & filter options
    // ─────────────────────────────────────────────────────────────

    private function getStats(?Carbon $since, array $filters): array
    {
        $windowQuery = Activity::query();
        if ($since) {
            $windowQuery->where('created_at', '>=', $since);
        }

        $total = (clone $windowQuery)->count();

        $uniqueActors = (clone $windowQuery)
            ->whereNotNull('causer_id')
            ->distinct('causer_id')
            ->count('causer_id');

        // Most-active entity type (grouped by subject_type, top 1).
        $mostActive = (clone $windowQuery)
            ->whereNotNull('subject_type')
            ->select('subject_type', DB::raw('count(*) as total'))
            ->groupBy('subject_type')
            ->orderByDesc('total')
            ->first();

        $deletions = (clone $windowQuery)->where('event', 'deleted')->count();

        // 7-bucket sparkline — even splits of the window.
        $sparkline = $this->buildSparkline($since, $windowQuery);

        // Total pool of users for a "X of Y" subtitle.
        $totalUsers = User::count();

        // Trend delta vs previous equal window (only when a window is active).
        $deltaPct = null;
        if ($since) {
            $windowDays = now()->diffInDays($since);
            $prevSince = $since->copy()->subDays((int) round($windowDays));
            $prevTotal = Activity::query()
                ->whereBetween('created_at', [$prevSince, $since])
                ->count();
            if ($prevTotal > 0) {
                $deltaPct = round((($total - $prevTotal) / $prevTotal) * 100, 1);
            }
        }

        return [
            'total' => $total,
            'total_delta_pct' => $deltaPct,
            'unique_actors' => $uniqueActors,
            'total_users' => $totalUsers,
            'most_active_type' => $mostActive?->subject_type,
            'most_active_count' => $mostActive ? (int) $mostActive->total : 0,
            'deletions' => $deletions,
            'sparkline' => $sparkline,
        ];
    }

    private function getFilterOptions(?Carbon $since): array
    {
        $q = Activity::query();
        if ($since) {
            $q->where('created_at', '>=', $since);
        }

        // Distinct causers in window, with count.
        $causerRows = (clone $q)
            ->whereNotNull('causer_id')
            ->where('causer_type', \App\Models\User::class)
            ->select('causer_id', DB::raw('count(*) as total'))
            ->groupBy('causer_id')
            ->orderByDesc('total')
            ->limit(50)
            ->get();

        $causers = [];
        if ($causerRows->isNotEmpty()) {
            $users = User::whereIn('id', $causerRows->pluck('causer_id'))->get(['id', 'name'])->keyBy('id');
            foreach ($causerRows as $row) {
                $user = $users->get($row->causer_id);
                if ($user) {
                    $causers[] = [
                        'id' => $user->id,
                        'name' => $user->name,
                        'count' => (int) $row->total,
                    ];
                }
            }
        }

        // Distinct subject types in window.
        $subjectTypes = (clone $q)
            ->whereNotNull('subject_type')
            ->select('subject_type', DB::raw('count(*) as total'))
            ->groupBy('subject_type')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'value' => $row->subject_type,
                'label' => class_basename($row->subject_type),
                'count' => (int) $row->total,
            ])
            ->toArray();

        return [
            'causers' => $causers,
            'subject_types' => $subjectTypes,
        ];
    }

    private function buildSparkline(?Carbon $since, $baseQuery): array
    {
        $buckets = 7;
        $out = array_fill(0, $buckets, 0);

        if (! $since) {
            // For "all" range, sample the last 30 days into 7 buckets.
            $since = now()->copy()->subDays(30);
        }

        $totalSeconds = max(1, $since->diffInSeconds(now()));
        $bucketSeconds = (int) ceil($totalSeconds / $buckets);

        $rows = (clone $baseQuery)
            ->select('created_at')
            ->get();

        foreach ($rows as $row) {
            if (! $row->created_at || $row->created_at->lt($since)) {
                continue;
            }
            $elapsed = $since->diffInSeconds($row->created_at);
            $idx = min($buckets - 1, (int) floor($elapsed / $bucketSeconds));
            $out[$idx]++;
        }

        return $out;
    }

    private function isFlagged(Activity $activity): bool
    {
        if ($activity->event === 'deleted' && in_array($activity->subject_type, $this->criticalDeletes, true)) {
            return true;
        }

        return false;
    }

    private function labelForSubject(Activity $activity): ?string
    {
        $subject = $activity->subject;
        if (! $subject) {
            return null;
        }

        foreach (['name', 'title', 'email', 'identifier'] as $attr) {
            if (isset($subject->{$attr}) && is_string($subject->{$attr})) {
                return $subject->{$attr};
            }
        }

        return null;
    }

    private function rangeToSince(string $range): ?Carbon
    {
        return match ($range) {
            '24h' => now()->copy()->subHours(24),
            '7d' => now()->copy()->subDays(7),
            '30d' => now()->copy()->subDays(30),
            'all' => null,
            default => now()->copy()->subDays(7),
        };
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
