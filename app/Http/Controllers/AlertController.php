<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AlertController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Alert::with(['device', 'site', 'rule']);

        // Scope by user's accessible sites
        if (! $user->hasRole('super_admin')) {
            $siteIds = $user->accessibleSites()->pluck('id');
            $query->whereIn('site_id', $siteIds);
        }

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

        // Filter by date range
        if ($request->filled('from')) {
            $query->where('triggered_at', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $query->where('triggered_at', '<=', $request->input('to'));
        }

        $alerts = $query->latest('triggered_at')->paginate(20)->withQueryString();

        return Inertia::render('alerts/index', [
            'alerts' => $alerts,
            'filters' => $request->only(['severity', 'status', 'site_id', 'from', 'to']),
        ]);
    }

    public function show(Request $request, Alert $alert)
    {
        $alert->load([
            'device',
            'site',
            'rule',
            'notifications.user',
            'resolvedByUser',
            'correctiveActions.takenByUser',
            'correctiveActions.verifiedByUser',
        ]);

        $userSnooze = $alert->snoozes()
            ->where('user_id', $request->user()->id)
            ->active()
            ->first();

        return Inertia::render('alerts/show', [
            'alert' => $alert,
            'userSnooze' => $userSnooze,
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
            'duration_minutes' => 'required|integer|in:30,60,120,240,480',
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
}
