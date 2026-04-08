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

        // Get available metrics from sensor models at this site
        $metricUnits = [
            'temperature' => '°C', 'humidity' => '%', 'co2' => 'ppm', 'current' => 'A',
            'door_status' => '0/1', 'battery_pct' => '%', 'gas_level' => '', 'distance' => 'mm',
            'pressure' => '', 'people_count' => '', 'pm2_5' => '',
        ];
        $availableMetrics = \App\Models\SensorModel::whereIn('model', $site->devices()->distinct()->pluck('model'))
            ->pluck('supported_metrics')
            ->flatten()
            ->unique()
            ->values()
            ->map(fn ($m) => ['key' => $m, 'unit' => $metricUnits[$m] ?? '']);

        return Inertia::render('settings/rules/create', [
            'site' => $site,
            'devices' => $devices,
            'availableMetrics' => $availableMetrics,
        ]);
    }

    public function edit(Request $request, Site $site, AlertRule $rule)
    {
        $rule->load('device');
        $devices = $site->devices()->select('id', 'name', 'model', 'zone')->get();

        $availableMetrics = \App\Models\SensorModel::whereIn('model', $site->devices()->distinct()->pluck('model'))
            ->get()
            ->flatMap(fn ($sm) => collect($sm->supported_metrics)->map(fn ($m) => [
                'key' => $m['key'],
                'unit' => $m['unit'] ?? '',
                'label' => $m['label'] ?? $m['key'],
            ]))
            ->unique('key')
            ->values();

        return Inertia::render('settings/rules/edit', [
            'site' => $site,
            'rule' => $rule,
            'devices' => $devices,
            'availableMetrics' => $availableMetrics,
        ]);
    }

    public function store(Request $request, Site $site)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'device_id' => 'nullable|exists:devices,id',
            'conditions' => 'required|array|min:1',
            'conditions.*.metric' => 'required|string',
            'conditions.*.condition' => 'required|string|in:above,below,equals',
            'conditions.*.threshold' => 'required|numeric',
            'conditions.*.duration_minutes' => 'required|integer|min:0',
            'conditions.*.severity' => 'required|string|in:low,medium,high,critical',
            'severity' => 'required|string|in:low,medium,high,critical',
            'cooldown_minutes' => 'sometimes|integer|min:0|max:1440',
            'active' => 'sometimes|boolean',
        ]);

        $site->alertRules()->create($validated);

        return redirect()->route('rules.index', $site)->with('success', 'Alert rule created.');
    }

    public function show(Request $request, Site $site, AlertRule $rule)
    {
        $rule->load('device');

        // Recent alerts triggered by this rule
        $recentAlerts = $site->alerts()
            ->where('rule_id', $rule->id)
            ->with('device:id,name')
            ->latest('triggered_at')
            ->limit(5)
            ->get();

        $alertsTriggeredCount = $site->alerts()->where('rule_id', $rule->id)->count();

        return Inertia::render('settings/rules/show', [
            'site' => $site,
            'rule' => $rule,
            'recentAlerts' => $recentAlerts,
            'alertsTriggeredCount' => $alertsTriggeredCount,
        ]);
    }

    public function update(Request $request, Site $site, AlertRule $rule)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'device_id' => 'nullable|exists:devices,id',
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
