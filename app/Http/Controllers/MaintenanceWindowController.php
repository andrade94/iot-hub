<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceWindow;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MaintenanceWindowController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        abort_unless($user->hasPermissionTo('manage maintenance windows'), 403);

        $siteIds = $user->accessibleSites()->pluck('id');
        $filterSiteId = $request->input('site_id');

        $windows = MaintenanceWindow::whereIn('site_id', $siteIds)
            ->when($filterSiteId, fn ($q) => $q->where('site_id', $filterSiteId))
            ->with(['site:id,name,timezone', 'createdByUser:id,name'])
            ->orderBy('site_id')
            ->orderBy('start_time')
            ->get();

        $sites = $user->accessibleSites()->map(fn ($s) => [
            'id' => $s->id,
            'name' => $s->name,
            'zones' => \App\Models\Device::where('site_id', $s->id)
                ->whereNotNull('zone')
                ->distinct()
                ->pluck('zone')
                ->sort()
                ->values(),
        ]);

        return Inertia::render('settings/maintenance-windows/index', [
            'windows' => $windows,
            'sites' => $sites,
            'filters' => [
                'site_id' => $filterSiteId,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('manage maintenance windows'), 403);

        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'zone' => 'nullable|string|max:255',
            'title' => 'required|string|max:255',
            'recurrence' => 'required|string|in:once,daily,weekly,monthly',
            'day_of_week' => 'nullable|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'duration_minutes' => 'required|integer|min:15|max:480',
            'suppress_alerts' => 'boolean',
        ]);

        MaintenanceWindow::create([
            ...$validated,
            'suppress_alerts' => $validated['suppress_alerts'] ?? true,
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Maintenance window created.');
    }

    public function update(Request $request, MaintenanceWindow $maintenanceWindow)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('manage maintenance windows'), 403);

        $validated = $request->validate([
            'zone' => 'nullable|string|max:255',
            'title' => 'required|string|max:255',
            'recurrence' => 'required|string|in:once,daily,weekly,monthly',
            'day_of_week' => 'nullable|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'duration_minutes' => 'required|integer|min:15|max:480',
            'suppress_alerts' => 'boolean',
        ]);

        $maintenanceWindow->update($validated);

        return back()->with('success', 'Maintenance window updated.');
    }

    public function destroy(MaintenanceWindow $maintenanceWindow)
    {
        abort_unless(auth()->user()->hasPermissionTo('manage maintenance windows'), 403);

        $maintenanceWindow->delete();

        return back()->with('success', 'Maintenance window deleted.');
    }
}
