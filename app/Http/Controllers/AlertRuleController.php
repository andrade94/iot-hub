<?php

namespace App\Http\Controllers;

use App\Models\AlertRule;
use App\Models\Site;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AlertRuleController extends Controller
{
    public function index(Request $request, Site $site)
    {
        $rules = $site->alertRules()
            ->with('device')
            ->latest()
            ->get();

        return Inertia::render('settings/rules/index', [
            'site' => $site,
            'rules' => $rules,
        ]);
    }

    public function create(Request $request, Site $site)
    {
        $devices = $site->devices()->select('id', 'name', 'model', 'zone')->get();

        return Inertia::render('settings/rules/create', [
            'site' => $site,
            'devices' => $devices,
        ]);
    }

    public function edit(Request $request, Site $site, AlertRule $rule)
    {
        $rule->load('device');
        $devices = $site->devices()->select('id', 'name', 'model', 'zone')->get();

        return Inertia::render('settings/rules/edit', [
            'site' => $site,
            'rule' => $rule,
            'devices' => $devices,
        ]);
    }

    public function store(Request $request, Site $site)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'sometimes|string|in:simple,correlation,baseline',
            'device_id' => 'nullable|exists:devices,id',
            'conditions' => 'required|array|min:1',
            'conditions.*.metric' => 'required|string',
            'conditions.*.condition' => 'required|string|in:above,below,equals',
            'conditions.*.threshold' => 'required|numeric',
            'conditions.*.duration_minutes' => 'required|integer|min:0',
            'conditions.*.severity' => 'required|string|in:low,medium,high,critical',
            'severity' => 'required|string|in:low,medium,high,critical',
            'cooldown_minutes' => 'sometimes|integer|min:0|max:1440',
        ]);

        $site->alertRules()->create($validated);

        return back()->with('success', 'Alert rule created.');
    }

    public function show(Request $request, Site $site, AlertRule $rule)
    {
        $rule->load('device');

        return Inertia::render('settings/rules/show', [
            'site' => $site,
            'rule' => $rule,
        ]);
    }

    public function update(Request $request, Site $site, AlertRule $rule)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'conditions' => 'sometimes|array|min:1',
            'conditions.*.metric' => 'required|string',
            'conditions.*.condition' => 'required|string|in:above,below,equals',
            'conditions.*.threshold' => 'required|numeric',
            'conditions.*.duration_minutes' => 'required|integer|min:0',
            'conditions.*.severity' => 'required|string|in:low,medium,high,critical',
            'severity' => 'sometimes|string|in:low,medium,high,critical',
            'cooldown_minutes' => 'sometimes|integer|min:0|max:1440',
            'active' => 'sometimes|boolean',
        ]);

        $rule->update($validated);

        return back()->with('success', 'Alert rule updated.');
    }

    public function destroy(Request $request, Site $site, AlertRule $rule)
    {
        $rule->delete();

        return back()->with('success', 'Alert rule deleted.');
    }
}
