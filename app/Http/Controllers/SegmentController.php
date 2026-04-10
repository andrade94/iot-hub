<?php

namespace App\Http\Controllers;

use App\Models\Module;
use App\Models\Organization;
use App\Models\Segment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SegmentController extends Controller
{
    public function index()
    {
        $segments = Segment::orderBy('name')
            ->get()
            ->map(fn (Segment $segment) => [
                'id' => $segment->id,
                'name' => $segment->name,
                'label' => $segment->label,
                'description' => $segment->description,
                'suggested_modules' => $segment->suggested_modules ?? [],
                'suggested_sensor_models' => $segment->suggested_sensor_models ?? [],
                'icon' => $segment->icon,
                'color' => $segment->color,
                'active' => $segment->active,
                'organizations_count' => Organization::where('segment', $segment->name)->count(),
                'created_at' => $segment->created_at->toIso8601String(),
                'updated_at' => $segment->updated_at->toIso8601String(),
            ]);

        $modules = Module::active()->orderBy('sort_order')->get(['id', 'slug', 'name', 'icon']);

        return Inertia::render('settings/segments/index', [
            'segments' => $segments,
            'modules' => $modules,
        ]);
    }

    public function show(Segment $segment)
    {
        // Get module details for suggested modules
        $modules = Module::active()
            ->withCount('recipes')
            ->get()
            ->map(fn ($m) => [
                'slug' => $m->slug,
                'name' => $m->name,
                'recipes_count' => $m->recipes_count,
                'required_sensor_models' => $m->required_sensor_models ?? [],
            ]);

        // Get organizations in this segment
        $organizations = Organization::where('segment', $segment->name)
            ->withCount('sites')
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'name' => $o->name,
                'slug' => $o->slug,
                'sites_count' => $o->sites_count,
            ]);

        return Inertia::render('settings/segments/show', [
            'segment' => $segment,
            'modules' => $modules,
            'organizations' => $organizations,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:segments,name|regex:/^[a-z0-9_]+$/',
            'label' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'suggested_modules' => 'nullable|array',
            'suggested_modules.*' => 'string|max:100',
            'suggested_sensor_models' => 'nullable|array',
            'suggested_sensor_models.*' => 'string|max:100',
            'icon' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'active' => 'boolean',
        ]);

        Segment::create($validated);

        return back()->with('success', "Segment '{$validated['label']}' created.");
    }

    public function update(Request $request, Segment $segment)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9_]+$/', Rule::unique('segments', 'name')->ignore($segment->id)],
            'label' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'suggested_modules' => 'nullable|array',
            'suggested_modules.*' => 'string|max:100',
            'suggested_sensor_models' => 'nullable|array',
            'suggested_sensor_models.*' => 'string|max:100',
            'icon' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'active' => 'boolean',
        ]);

        // If the name changed and orgs reference the old name, update them
        if ($segment->name !== $validated['name']) {
            Organization::where('segment', $segment->name)->update(['segment' => $validated['name']]);
        }

        $segment->update($validated);

        return back()->with('success', "Segment '{$segment->label}' updated.");
    }

    public function destroy(Segment $segment)
    {
        $orgCount = Organization::where('segment', $segment->name)->count();

        if ($orgCount > 0) {
            return back()->with('error', "Cannot delete segment '{$segment->label}' — {$orgCount} organization(s) still reference it.");
        }

        $segment->delete();

        return back()->with('success', "Segment '{$segment->label}' deleted.");
    }
}
