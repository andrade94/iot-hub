<?php

namespace App\Http\Controllers;

use App\Models\Module;
use App\Models\Site;
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

        if ($isActive) {
            $site->modules()->detach($module->id);

            return back()->with('success', "Module '{$module->name}' deactivated.");
        }

        $site->modules()->attach($module->id, ['activated_at' => now()]);

        return back()->with('success', "Module '{$module->name}' activated.");
    }
}
