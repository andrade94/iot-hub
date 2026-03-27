<?php

namespace App\Http\Controllers;

use App\Models\Module;
use App\Models\Recipe;
use App\Models\Site;
use App\Models\SiteRecipeOverride;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        $recipes = Recipe::with('module')
            ->orderBy('module_id')
            ->orderBy('name')
            ->get();

        $modules = Module::orderBy('name')->get(['id', 'name']);

        return Inertia::render('settings/recipes/index', [
            'recipes' => $recipes,
            'modules' => $modules,
        ]);
    }

    public function show(Request $request, Recipe $recipe)
    {
        $recipe->load(['module', 'overrides.site']);

        $user = $request->user();
        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        return Inertia::render('settings/recipes/show', [
            'recipe' => $recipe,
            'sites' => $sites,
            'overrides' => $recipe->overrides,
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
        // Block deletion if sites have overrides referencing this recipe
        if ($recipe->overrides()->exists()) {
            return back()->with('error', 'Cannot delete recipe — sites have overrides referencing it. Remove overrides first.');
        }

        $recipe->delete();

        return redirect()->route('recipes.index')->with('success', 'Recipe deleted successfully.');
    }

    public function storeOverride(Request $request, Recipe $recipe)
    {
        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'overrides' => 'required|array',
            'overrides.*.metric' => 'required|string',
            'overrides.*.threshold' => 'required|numeric',
            'overrides.*.duration_minutes' => 'required|integer|min:0',
        ]);

        SiteRecipeOverride::updateOrCreate(
            ['site_id' => $validated['site_id'], 'recipe_id' => $recipe->id],
            ['overrides' => $validated['overrides']],
        );

        return back()->with('success', 'Recipe overrides saved.');
    }
}
