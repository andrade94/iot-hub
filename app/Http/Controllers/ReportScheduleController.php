<?php

namespace App\Http\Controllers;

use App\Models\ReportSchedule;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportScheduleController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('manage report schedules'), 403);

        $schedules = ReportSchedule::where('org_id', $user->org_id)
            ->with(['site:id,name', 'createdByUser:id,name'])
            ->orderBy('type')
            ->get();

        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        return Inertia::render('settings/report-schedules/index', [
            'schedules' => $schedules,
            'sites' => $sites,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('manage report schedules'), 403);

        $validated = $request->validate([
            'type' => 'required|string|in:' . implode(',', ReportSchedule::TYPES),
            'site_id' => 'nullable|exists:sites,id',
            'frequency' => 'required|string|in:daily,weekly,monthly',
            'day_of_week' => 'nullable|integer|min:0|max:6',
            'time' => 'required|date_format:H:i',
            'recipients_json' => 'required|array|min:1|max:10',
            'recipients_json.*' => 'email',
            'active' => 'boolean',
        ]);

        ReportSchedule::create([
            ...$validated,
            'org_id' => $user->org_id,
            'active' => $validated['active'] ?? true,
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Report schedule created.');
    }

    public function update(Request $request, ReportSchedule $reportSchedule)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('manage report schedules'), 403);

        $validated = $request->validate([
            'type' => 'required|string|in:' . implode(',', ReportSchedule::TYPES),
            'site_id' => 'nullable|exists:sites,id',
            'frequency' => 'required|string|in:daily,weekly,monthly',
            'day_of_week' => 'nullable|integer|min:0|max:6',
            'time' => 'required|date_format:H:i',
            'recipients_json' => 'required|array|min:1|max:10',
            'recipients_json.*' => 'email',
            'active' => 'boolean',
        ]);

        $reportSchedule->update($validated);

        return back()->with('success', 'Report schedule updated.');
    }

    public function destroy(ReportSchedule $reportSchedule)
    {
        abort_unless(auth()->user()->hasPermissionTo('manage report schedules'), 403);

        $reportSchedule->delete();

        return back()->with('success', 'Report schedule deleted.');
    }
}
