<?php

namespace App\Http\Controllers;

use App\Models\Module;
use App\Models\SensorModel;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ModuleCatalogController extends Controller
{
    public function index()
    {
        $modules = Module::orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Module $module) => [
                'id' => $module->id,
                'slug' => $module->slug,
                'name' => $module->name,
                'description' => $module->description,
                'monthly_fee' => $module->monthly_fee,
                'required_sensor_models' => $module->required_sensor_models ?? [],
                'report_types' => $module->report_types ?? [],
                'icon' => $module->icon,
                'color' => $module->color,
                'active' => $module->active,
                'sort_order' => $module->sort_order,
                'sites_count' => $module->sites_count,
                'created_at' => $module->created_at->toIso8601String(),
                'updated_at' => $module->updated_at->toIso8601String(),
            ]);

        $sensorModels = SensorModel::orderBy('name')->pluck('name');

        return Inertia::render('settings/modules/catalog', [
            'modules' => $modules,
            'sensorModels' => $sensorModels,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'slug' => 'required|string|max:255|unique:modules,slug|regex:/^[a-z0-9_]+$/',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'monthly_fee' => 'nullable|numeric|min:0|max:99999999.99',
            'required_sensor_models' => 'nullable|array',
            'required_sensor_models.*' => 'string|max:100',
            'report_types' => 'nullable|array',
            'report_types.*' => 'string|max:100',
            'icon' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        Module::create($validated);

        return back()->with('success', "Module '{$validated['name']}' created.");
    }

    public function update(Request $request, Module $module)
    {
        $validated = $request->validate([
            'slug' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9_]+$/', Rule::unique('modules', 'slug')->ignore($module->id)],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'monthly_fee' => 'nullable|numeric|min:0|max:99999999.99',
            'required_sensor_models' => 'nullable|array',
            'required_sensor_models.*' => 'string|max:100',
            'report_types' => 'nullable|array',
            'report_types.*' => 'string|max:100',
            'icon' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $module->update($validated);

        return back()->with('success', "Module '{$module->name}' updated.");
    }

    public function destroy(Module $module)
    {
        $sitesCount = $module->sites_count;

        if ($sitesCount > 0) {
            return back()->with('error', "Cannot delete module '{$module->name}' — {$sitesCount} site(s) still use it.");
        }

        $module->delete();

        return back()->with('success', "Module '{$module->name}' deleted.");
    }
}
