<?php

namespace App\Http\Controllers;

use App\Models\FloorPlan;
use App\Models\Site;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FloorPlanController extends Controller
{
    public function store(Request $request, Site $site)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'floor_number' => 'required|integer|min:0',
            'image' => 'required|image|max:10240',
        ]);

        $path = $request->file('image')->store("floor-plans/{$site->id}", 'public');

        // Get image dimensions
        $imageInfo = getimagesize($request->file('image')->getRealPath());
        $widthPx = $imageInfo[0] ?? null;
        $heightPx = $imageInfo[1] ?? null;

        $floorPlan = $site->floorPlans()->create([
            'name' => $validated['name'],
            'floor_number' => $validated['floor_number'],
            'image_path' => $path,
            'width_px' => $widthPx,
            'height_px' => $heightPx,
        ]);

        // Update site floor_plan_count
        $site->update(['floor_plan_count' => $site->floorPlans()->count()]);

        return back()->with('success', "Floor plan '{$floorPlan->name}' uploaded.");
    }

    public function update(Request $request, Site $site, FloorPlan $floorPlan)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'floor_number' => 'sometimes|integer|min:0',
        ]);

        $floorPlan->update($validated);

        return back()->with('success', 'Floor plan updated.');
    }

    public function destroy(Request $request, Site $site, FloorPlan $floorPlan)
    {
        // Remove image file
        if ($floorPlan->image_path) {
            Storage::disk('public')->delete($floorPlan->image_path);
        }

        // Detach devices from this floor plan
        $floorPlan->devices()->update(['floor_id' => null, 'floor_x' => null, 'floor_y' => null]);

        $floorPlan->delete();

        // Update site floor_plan_count
        $site->update(['floor_plan_count' => $site->floorPlans()->count()]);

        return back()->with('success', 'Floor plan removed.');
    }
}
