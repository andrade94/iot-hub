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
        // Only show active modules (Bug fix #2)
        $modules = Module::active()
            ->with('recipes')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $activatedIds = $site->modules()->pluck('modules.id')->toArray();

        // Count matching devices per module for this site
        $siteDeviceModels = $site->devices()->distinct()->pluck('model')->toArray();
        $moduleDeviceCounts = [];
        foreach ($modules as $mod) {
            $required = $mod->required_sensor_models ?? [];
            $matching = $site->devices()->whereIn('model', $required)->count();
            $moduleDeviceCounts[$mod->id] = $matching;
        }

        // Monthly total for active modules
        $monthlyTotal = $modules->filter(fn ($m) => in_array($m->id, $activatedIds))
            ->sum(fn ($m) => (float) ($m->monthly_fee ?? 0));

        return Inertia::render('settings/modules', [
            'site' => $site,
            'modules' => $modules,
            'activatedModuleIds' => $activatedIds,
            'moduleDeviceCounts' => $moduleDeviceCounts,
            'monthlyTotal' => number_format($monthlyTotal, 2),
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
