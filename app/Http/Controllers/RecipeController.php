<?php

namespace App\Http\Controllers;

use App\Models\Recipe;
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
        $recipe->load(['module', 'overrides']);

        return Inertia::render('settings/recipes/show', [
            'recipe' => $recipe,
        ]);
    }
}
