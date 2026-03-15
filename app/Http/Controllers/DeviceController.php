<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\Site;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeviceController extends Controller
{
    public function index(Request $request, Site $site)
    {
        $query = $site->devices()->with(['gateway', 'recipe', 'floorPlan']);

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter by zone
        if ($request->filled('zone')) {
            $query->where('zone', $request->input('zone'));
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('dev_eui', 'like', "%{$search}%")
                    ->orWhere('model', 'like', "%{$search}%");
            });
        }

        $devices = $query->latest()->paginate(20)->withQueryString();

        $zones = $site->devices()->distinct()->whereNotNull('zone')->pluck('zone');

        return Inertia::render('settings/devices/index', [
            'site' => $site,
            'devices' => $devices,
            'zones' => $zones,
            'filters' => $request->only(['status', 'zone', 'search']),
        ]);
    }

    public function store(Request $request, Site $site)
    {
        $validated = $request->validate([
            'model' => 'required|string|max:255',
            'dev_eui' => 'required|string|max:32|unique:devices,dev_eui',
            'app_key' => 'nullable|string|max:64',
            'name' => 'required|string|max:255',
            'zone' => 'nullable|string|max:255',
            'gateway_id' => 'nullable|exists:gateways,id',
            'recipe_id' => 'nullable|exists:recipes,id',
            'floor_id' => 'nullable|exists:floor_plans,id',
            'floor_x' => 'nullable|integer',
            'floor_y' => 'nullable|integer',
        ]);

        $device = $site->devices()->create(array_merge($validated, [
            'status' => 'pending',
        ]));

        return back()->with('success', "Device '{$device->name}' registered successfully.");
    }

    public function show(Request $request, Site $site, Device $device)
    {
        $device->load(['gateway', 'recipe', 'floorPlan', 'provisionedByUser']);

        return Inertia::render('settings/devices/show', [
            'site' => $site,
            'device' => $device,
        ]);
    }

    public function update(Request $request, Site $site, Device $device)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'zone' => 'nullable|string|max:255',
            'gateway_id' => 'nullable|exists:gateways,id',
            'recipe_id' => 'nullable|exists:recipes,id',
            'floor_id' => 'nullable|exists:floor_plans,id',
            'floor_x' => 'nullable|integer',
            'floor_y' => 'nullable|integer',
        ]);

        $device->update($validated);

        return back()->with('success', 'Device updated successfully.');
    }

    public function destroy(Request $request, Site $site, Device $device)
    {
        $device->delete();

        return back()->with('success', 'Device removed successfully.');
    }
}
