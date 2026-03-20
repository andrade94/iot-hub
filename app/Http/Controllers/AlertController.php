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
        ]);

        return Inertia::render('alerts/show', [
            'alert' => $alert,
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
}
