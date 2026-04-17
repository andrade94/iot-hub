<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\Site;
use App\Services\Devices\DeviceReplacementService;
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
            'serial' => 'nullable|string|max:255',
            'app_key' => 'nullable|string|max:64',
            'name' => 'required|string|max:255',
            'label' => 'nullable|string|max:255',
            'zone' => 'nullable|string|max:255',
            'gateway_id' => 'nullable|exists:gateways,id',
            'recipe_id' => 'nullable|exists:recipes,id',
            'floor_id' => 'nullable|exists:floor_plans,id',
            'floor_x' => 'nullable|numeric',
            'floor_y' => 'nullable|numeric',
        ]);

        $device = $site->devices()->create(array_merge($validated, [
            'status' => 'pending',
        ]));

        // Auto-provision on ChirpStack when configured
        if (config('services.chirpstack.api_key')) {
            \App\Jobs\ProvisionDeviceOnChirpStack::dispatch($device->id);
        }

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
            'label' => 'nullable|string|max:255',
            'serial' => 'nullable|string|max:255',
            'zone' => 'nullable|string|max:255',
            'gateway_id' => 'nullable|exists:gateways,id',
            'recipe_id' => 'nullable|exists:recipes,id',
            'floor_id' => 'nullable|exists:floor_plans,id',
            'floor_x' => 'nullable|numeric',
            'floor_y' => 'nullable|numeric',
        ]);

        $device->update($validated);

        return back()->with('success', 'Device updated successfully.');
    }

    public function destroy(Request $request, Site $site, Device $device)
    {
        $devEui = $device->dev_eui;

        $device->delete();

        // Remove from ChirpStack when configured
        if ($devEui && config('services.chirpstack.api_key')) {
            \App\Jobs\DeprovisionDeviceFromChirpStack::dispatch($devEui);
        }

        return back()->with('success', 'Device removed successfully.');
    }

    /**
     * Replace a device with a new one — transfers config, marks old as replaced (BR-059-063).
     */
    public function replace(Request $request, Site $site, Device $device, DeviceReplacementService $service)
    {
        $this->authorize('update', $device);

        abort_unless(in_array($device->status, ['active', 'offline']), 422, 'Only active or offline devices can be replaced.');

        $validated = $request->validate([
            'new_dev_eui' => 'required|string|max:32|unique:devices,dev_eui',
            'new_app_key' => 'required|string|max:64',
            'new_model' => 'nullable|string|in:EM300-TH,CT101,WS301,AM307,VS121,EM300-MCS,WS202',
        ]);

        $service->replace($device, $validated);

        return back()->with('success', 'Device replaced. New device pending activation.');
    }
}
