<?php

namespace App\Http\Controllers;

use App\Models\Module;
use App\Models\Site;
use App\Services\Recipes\RecipeApplicationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ModuleController extends Controller
{
    public function index(Request $request, Site $site)
    {
        $modules = Module::with('recipes')->get();
        $activatedIds = $site->modules()->pluck('modules.id')->toArray();

        return Inertia::render('settings/modules', [
            'site' => $site,
            'modules' => $modules,
            'activatedModuleIds' => $activatedIds,
        ]);
    }

    public function toggle(Request $request, Site $site, Module $module)
    {
        $isActive = $site->modules()->where('modules.id', $module->id)->exists();
        $service = app(RecipeApplicationService::class);

        if ($isActive) {
            $site->modules()->detach($module->id);
            $rulesRemoved = $service->removeModuleRules($site, $module);
            $message = "Module '{$module->name}' deactivated.";
            if ($rulesRemoved > 0) {
                $message .= " {$rulesRemoved} alert rule(s) removed.";
            }

            return back()->with('success', $message);
        }

        $site->modules()->attach($module->id, ['activated_at' => now()]);
        $rulesCreated = $service->applyModuleRecipes($site, $module);
        $message = "Module '{$module->name}' activated.";
        if ($rulesCreated > 0) {
            $message .= " {$rulesCreated} alert rule(s) auto-created.";
        }

        return back()->with('success', $message);
    }
}
