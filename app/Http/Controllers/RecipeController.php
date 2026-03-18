<?php

namespace App\Http\Controllers;

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

        return Inertia::render('settings/recipes/index', [
            'recipes' => $recipes,
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
