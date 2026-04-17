<?php

namespace App\Http\Controllers;

use App\Models\ComplianceEvent;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Spatie\Activitylog\Models\Activity;

class ComplianceCalendarController extends Controller
{
    /**
     * Which report type each compliance event type maps to for the
     * "Generate evidence" action chip. Types without a mapping get an
     * "Attach" button instead of evidence generation.
     */
    protected array $eventToReport = [
        'cofepris_audit' => 'temperature',
        'inspection' => 'temperature',
    ];

    public function index(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;

        $filters = [
            'site_id' => $request->input('site_id'),
            'type' => $request->input('type'),
            'status' => $request->input('status'),
            'overdue_only' => $request->boolean('overdue_only'),
        ];

        $query = ComplianceEvent::with('site:id,name')
            ->when($orgId, fn ($q) => $q->forOrg($orgId))
            ->orderBy('due_date');

        if ($filters['site_id']) {
            $query->forSite((int) $filters['site_id']);
        }
        if ($filters['type']) {
            $query->where('type', $filters['type']);
        }
        if ($filters['status']) {
            $query->where('status', $filters['status']);
        }
        if ($filters['overdue_only']) {
            $query->where('status', 'overdue');
        }

        $events = $query->get();

        // Transform and group by month (YYYY-MM).
        $grouped = $events
            ->map(fn (ComplianceEvent $e) => $this->transformEvent($e))
            ->groupBy(fn (array $e) => substr($e['due_date'], 0, 7))
            ->toArray();

        $sites = $user->accessibleSites()->map(fn ($s) => [
            'id' => $s->id,
            'name' => $s->name,
        ])->values();

        $types = [
            'cofepris_audit' => 'COFEPRIS Audit',
            'certificate_renewal' => 'Certificate Renewal',
            'calibration' => 'Calibration',
            'inspection' => 'Inspection',
            'permit_renewal' => 'Permit Renewal',
        ];

        return Inertia::render('settings/compliance/index', [
            'events' => $grouped,
            'sites' => $sites,
            'types' => $types,
            'filters' => $filters,
            'stats' => $this->getStats($orgId),
            'last_generated' => $this->getLastGenerated($orgId),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'type' => 'required|string|in:cofepris_audit,certificate_renewal,calibration,inspection,permit_renewal',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'due_date' => 'required|date|after_or_equal:today',
        ]);

        $validated['org_id'] = $request->user()->org_id;

        ComplianceEvent::create($validated);

        return back()->with('success', "Compliance event '{$validated['title']}' created.");
    }

    public function update(Request $request, ComplianceEvent $complianceEvent)
    {
        abort_unless($request->user()->hasRole('super_admin') || $complianceEvent->org_id === $request->user()->org_id, 403);

        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'type' => 'required|string|in:cofepris_audit,certificate_renewal,calibration,inspection,permit_renewal',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'due_date' => 'required|date',
        ]);

        $complianceEvent->update($validated);

        return back()->with('success', 'Compliance event updated.');
    }

    public function complete(Request $request, ComplianceEvent $complianceEvent)
    {
        abort_unless($request->user()->hasRole('super_admin') || $complianceEvent->org_id === $request->user()->org_id, 403);

        $complianceEvent->update([
            'status' => 'completed',
            'completed_at' => now(),
            'completed_by' => $request->user()->name,
        ]);

        return back()->with('success', "'{$complianceEvent->title}' marked as completed.");
    }

    public function attach(Request $request, ComplianceEvent $complianceEvent)
    {
        abort_unless($request->user()->hasRole('super_admin') || $complianceEvent->org_id === $request->user()->org_id, 403);

        $request->validate([
            'attachment' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        // Delete the old attachment if it exists.
        if ($complianceEvent->attachment_path) {
            Storage::disk('public')->delete($complianceEvent->attachment_path);
        }

        $file = $request->file('attachment');
        $path = $file->store('compliance-events', 'public');

        $complianceEvent->update([
            'attachment_path' => $path,
            'attachment_name' => $file->getClientOriginalName(),
        ]);

        return back()->with('success', "Evidence attached to '{$complianceEvent->title}'.");
    }

    public function detach(Request $request, ComplianceEvent $complianceEvent)
    {
        abort_unless($request->user()->hasRole('super_admin') || $complianceEvent->org_id === $request->user()->org_id, 403);

        if ($complianceEvent->attachment_path) {
            Storage::disk('public')->delete($complianceEvent->attachment_path);
            $complianceEvent->update([
                'attachment_path' => null,
                'attachment_name' => null,
            ]);
        }

        return back()->with('success', 'Evidence removed.');
    }

    public function destroy(Request $request, ComplianceEvent $complianceEvent)
    {
        abort_unless($request->user()->hasRole('super_admin') || $complianceEvent->org_id === $request->user()->org_id, 403);

        $title = $complianceEvent->title;
        $complianceEvent->delete();

        return back()->with('success', "Compliance event '{$title}' deleted.");
    }

    // ─────────────────────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────────────────────

    private function transformEvent(ComplianceEvent $event): array
    {
        $dueDate = $event->due_date;
        $today = now()->startOfDay();
        $diffDays = $today->diffInDays($dueDate, false);

        return [
            'id' => $event->id,
            'site_id' => $event->site_id,
            'site' => $event->site ? ['id' => $event->site->id, 'name' => $event->site->name] : null,
            'type' => $event->type,
            'title' => $event->title,
            'description' => $event->description,
            'due_date' => $dueDate->toDateString(),
            'status' => $event->status,
            'completed_at' => $event->completed_at?->toDateString(),
            'completed_by' => $event->completed_by,
            'attachment_path' => $event->attachment_path
                ? Storage::disk('public')->url($event->attachment_path)
                : null,
            'attachment_name' => $event->attachment_name,
            'days_until_due' => (int) $diffDays,
            'can_generate_evidence' => array_key_exists($event->type, $this->eventToReport),
            'evidence_report_type' => $this->eventToReport[$event->type] ?? null,
        ];
    }

    private function getStats(?int $orgId): array
    {
        $now = now();
        $monthEnd = $now->copy()->endOfMonth();
        $yearStart = $now->copy()->startOfYear();

        $overdueCount = ComplianceEvent::when($orgId, fn ($q) => $q->forOrg($orgId))->where('status', 'overdue')->count();

        $dueThisMonthCount = ComplianceEvent::when($orgId, fn ($q) => $q->forOrg($orgId))
            ->whereIn('status', ['upcoming', 'overdue'])
            ->whereBetween('due_date', [$now->copy()->startOfDay(), $monthEnd])
            ->count();

        $dueNext7Count = ComplianceEvent::when($orgId, fn ($q) => $q->forOrg($orgId))
            ->whereIn('status', ['upcoming', 'overdue'])
            ->whereBetween('due_date', [$now->copy()->startOfDay(), $now->copy()->addDays(7)->endOfDay()])
            ->count();

        // YTD compliance = completed-on-time / (completed + overdue) since Jan 1.
        $ytdEvents = ComplianceEvent::when($orgId, fn ($q) => $q->forOrg($orgId))
            ->whereIn('status', ['completed', 'overdue'])
            ->where('due_date', '>=', $yearStart)
            ->select('status', 'due_date', 'completed_at')
            ->get();

        $ytdTotal = $ytdEvents->count();
        $ytdOnTime = $ytdEvents->filter(function ($e) {
            if ($e->status !== 'completed' || ! $e->completed_at) {
                return false;
            }
            return $e->completed_at->lte($e->due_date);
        })->count();
        $ytdCompliancePct = $ytdTotal > 0
            ? round(($ytdOnTime / $ytdTotal) * 100, 1)
            : 100.0;

        // Next audit = closest upcoming COFEPRIS/inspection event.
        $nextAudit = ComplianceEvent::with('site:id,name')
            ->when($orgId, fn ($q) => $q->forOrg($orgId))
            ->whereIn('type', ['cofepris_audit', 'inspection'])
            ->where('status', 'upcoming')
            ->where('due_date', '>=', $now->copy()->startOfDay())
            ->orderBy('due_date')
            ->first();

        $overdueExample = ComplianceEvent::when($orgId, fn ($q) => $q->forOrg($orgId))
            ->where('status', 'overdue')
            ->orderBy('due_date')
            ->first();

        return [
            'overdue_count' => $overdueCount,
            'overdue_example' => $overdueExample ? [
                'title' => $overdueExample->title,
                'days_overdue' => (int) $overdueExample->due_date->diffInDays(now()->startOfDay()),
            ] : null,
            'due_this_month_count' => $dueThisMonthCount,
            'due_next_7_count' => $dueNext7Count,
            'ytd_compliance_pct' => $ytdCompliancePct,
            'ytd_on_time' => $ytdOnTime,
            'ytd_total' => $ytdTotal,
            'next_audit' => $nextAudit ? [
                'id' => $nextAudit->id,
                'title' => $nextAudit->title,
                'type' => $nextAudit->type,
                'due_date' => $nextAudit->due_date->toDateString(),
                'days_until' => (int) now()->startOfDay()->diffInDays($nextAudit->due_date, false),
                'site_name' => $nextAudit->site?->name,
            ] : null,
        ];
    }

    /**
     * Look up the most recent "report_generated" activity row per report type.
     * Returns ['temperature' => ['at' => ISO, 'site' => 'X'], ...] or nulls.
     */
    private function getLastGenerated(?int $orgId): array
    {
        $types = ['temperature', 'energy', 'inventory'];
        $out = [];

        foreach ($types as $type) {
            $activity = Activity::query()
                ->where('log_name', 'reports')
                ->where('description', 'like', "report_generated:{$type}%")
                ->when($orgId, fn ($q) => $q->whereJsonContains('properties->org_id', $orgId))
                ->latest()
                ->first();

            if ($activity) {
                $props = $activity->properties->toArray();
                $out[$type] = [
                    'at' => $activity->created_at?->toIso8601String(),
                    'site' => $props['site_name'] ?? null,
                ];
            } else {
                $out[$type] = null;
            }
        }

        return $out;
    }
}
