<?php

namespace App\Http\Controllers;

use App\Models\AlertRule;
use App\Models\Device;
use App\Models\Module;
use App\Models\Recipe;
use App\Models\SensorModel;
use App\Models\Site;
use App\Models\SiteRecipeOverride;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        $recipes = Recipe::with('module')
            ->withCount('devices')
            ->withCount('overrides')
            ->orderBy('module_id')
            ->orderBy('name')
            ->get();

        $modules = Module::orderBy('name')->get(['id', 'name']);
        $sensorModels = SensorModel::orderBy('name')->get(['name as model', 'supported_metrics']);

        return Inertia::render('settings/recipes/index', [
            'recipes' => $recipes,
            'modules' => $modules,
            'sensorModels' => $sensorModels,
        ]);
    }

    public function show(Request $request, Recipe $recipe)
    {
        $recipe->load(['module', 'overrides.site']);

        $user = $request->user();
        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        // Devices using this recipe (with site info)
        $devices = Device::where('recipe_id', $recipe->id)
            ->with('site:id,name')
            ->select('id', 'name', 'model', 'zone', 'site_id', 'last_reading_at', 'status')
            ->get();

        // Alert rules sync status per site
        $sitesWithDevices = $devices->groupBy('site_id');
        $syncStatus = [];

        foreach ($sitesWithDevices as $siteId => $siteDevices) {
            $site = $siteDevices->first()->site;
            $rulesFromRecipe = AlertRule::where('site_id', $siteId)
                ->where('recipe_id', $recipe->id)
                ->get();

            $outdatedCount = 0;
            foreach ($rulesFromRecipe as $rule) {
                // Compare rule conditions against recipe defaults
                $cond = $rule->conditions[0] ?? null;
                if (! $cond) continue;
                $matchingDefault = collect($recipe->default_rules)->first(fn ($dr) =>
                    $dr['metric'] === $cond['metric'] && $dr['condition'] === $cond['condition']
                );
                if ($matchingDefault && (float) $matchingDefault['threshold'] !== (float) $cond['threshold']) {
                    $outdatedCount++;
                }
            }

            $syncStatus[] = [
                'site_id' => $siteId,
                'site_name' => $site->name,
                'rule_count' => $rulesFromRecipe->count(),
                'outdated_count' => $outdatedCount,
                'status' => $rulesFromRecipe->count() === 0
                    ? 'not_generated'
                    : ($outdatedCount > 0 ? 'outdated' : 'synced'),
            ];
        }

        $sensorModel = SensorModel::where('name', $recipe->sensor_model)->first();
        $availableMetrics = $sensorModel?->supported_metrics ?? [];

        return Inertia::render('settings/recipes/show', [
            'recipe' => $recipe,
            'sites' => $sites,
            'overrides' => $recipe->overrides,
            'devices' => $devices,
            'syncStatus' => $syncStatus,
            'availableMetrics' => $availableMetrics,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'module_id' => 'required|exists:modules,id',
            'sensor_model' => 'required|string|max:255',
            'description' => 'nullable|string',
            'default_rules' => 'required|array|min:1',
            'default_rules.*.metric' => 'required|string',
            'default_rules.*.condition' => 'required|string|in:above,below,equals',
            'default_rules.*.threshold' => 'required|numeric',
            'default_rules.*.duration_minutes' => 'required|integer|min:0',
            'default_rules.*.severity' => 'required|string|in:low,medium,high,critical',
            'editable' => 'boolean',
        ]);

        $validated['editable'] = $validated['editable'] ?? true;

        Recipe::create($validated);

        return back()->with('success', 'Recipe created successfully.');
    }

    public function update(Request $request, Recipe $recipe)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'module_id' => 'required|exists:modules,id',
            'sensor_model' => 'required|string|max:255',
            'description' => 'nullable|string',
            'default_rules' => 'required|array|min:1',
            'default_rules.*.metric' => 'required|string',
            'default_rules.*.condition' => 'required|string|in:above,below,equals',
            'default_rules.*.threshold' => 'required|numeric',
            'default_rules.*.duration_minutes' => 'required|integer|min:0',
            'default_rules.*.severity' => 'required|string|in:low,medium,high,critical',
            'editable' => 'boolean',
        ]);

        $validated['editable'] = $validated['editable'] ?? true;

        $recipe->update($validated);

        return back()->with('success', 'Recipe updated successfully.');
    }

    public function destroy(Request $request, Recipe $recipe)
    {
        $deviceCount = Device::where('recipe_id', $recipe->id)->count();

        // Clear recipe_id from devices (don't delete the devices)
        Device::where('recipe_id', $recipe->id)->update(['recipe_id' => null]);

        // Delete overrides
        $recipe->overrides()->delete();

        $recipe->delete();

        return redirect()->route('recipes.index')->with('success', "Recipe deleted. {$deviceCount} device(s) unlinked.");
    }

    public function storeOverride(Request $request, Recipe $recipe)
    {
        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'rules' => 'required|array',
            'rules.*.metric' => 'required|string',
            'rules.*.condition' => 'required|string|in:above,below,equals',
            'rules.*.threshold' => 'required|numeric',
            'rules.*.duration_minutes' => 'required|integer|min:0',
            'rules.*.severity' => 'required|string|in:low,medium,high,critical',
        ]);

        SiteRecipeOverride::updateOrCreate(
            ['site_id' => $validated['site_id'], 'recipe_id' => $recipe->id],
            [
                'overridden_rules' => $validated['rules'],
                'overridden_by' => $request->user()->id,
            ],
        );

        return back()->with('success', 'Recipe overrides saved.');
    }

    public function destroyOverride(Request $request, Recipe $recipe, SiteRecipeOverride $override)
    {
        $override->delete();

        return back()->with('success', 'Override removed. Site will use default recipe thresholds.');
    }

    public function syncRules(Request $request, Recipe $recipe, Site $site)
    {
        $rules = AlertRule::where('site_id', $site->id)
            ->where('recipe_id', $recipe->id)
            ->get();

        $updated = 0;
        foreach ($rules as $rule) {
            $cond = $rule->conditions[0] ?? null;
            if (! $cond) continue;

            // Find matching default rule
            $matchingDefault = collect($recipe->default_rules)->first(fn ($dr) =>
                $dr['metric'] === $cond['metric'] && $dr['condition'] === $cond['condition']
            );

            if ($matchingDefault) {
                // Apply override if exists for this site
                $override = SiteRecipeOverride::where('site_id', $site->id)
                    ->where('recipe_id', $recipe->id)
                    ->first();

                $threshold = $matchingDefault['threshold'];
                $duration = $matchingDefault['duration_minutes'] ?? 0;

                if ($override) {
                    $overrideRule = collect($override->overridden_rules)->first(fn ($or) =>
                        $or['metric'] === $cond['metric'] && $or['condition'] === $cond['condition']
                    );
                    if ($overrideRule) {
                        $threshold = $overrideRule['threshold'];
                        $duration = $overrideRule['duration_minutes'] ?? $duration;
                    }
                }

                $rule->update([
                    'conditions' => [[
                        ...$cond,
                        'threshold' => $threshold,
                        'duration_minutes' => $duration,
                        'severity' => $matchingDefault['severity'] ?? $cond['severity'],
                    ]],
                    'severity' => $matchingDefault['severity'] ?? $rule->severity,
                ]);

                $updated++;
            }
        }

        return back()->with('success', "{$updated} alert rule(s) synced with recipe defaults.");
    }
}
