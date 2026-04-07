<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\Site;
use App\Models\ZoneBoundary;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SiteLayoutController extends Controller
{
    public function show(Request $request, Site $site)
    {
        $site->load(['gateways', 'devices', 'floorPlans', 'zoneBoundaries']);

        // Floor plans with devices filtered by floor_id
        $floorPlans = $site->floorPlans->map(function ($fp) use ($site) {
            $floorDevices = $site->devices
                ->filter(fn ($d) => $d->floor_id === $fp->id && $d->floor_x !== null && $d->floor_y !== null)
                ->values();

            return array_merge($fp->toArray(), [
                'devices' => $floorDevices,
            ]);
        });

        // All devices for sidebar (placed and unplaced)
        $allDevices = $site->devices->map(fn ($d) => [
            'id' => $d->id,
            'name' => $d->name,
            'model' => $d->model,
            'zone' => $d->zone,
            'status' => $d->status,
            'floor_id' => $d->floor_id,
            'floor_x' => $d->floor_x,
            'floor_y' => $d->floor_y,
            'battery_pct' => $d->battery_pct,
            'rssi' => $d->rssi,
            'last_reading_at' => $d->last_reading_at?->toISOString(),
        ]);

        return Inertia::render('sites/layout', [
            'site' => $site,
            'floorPlans' => $floorPlans,
            'allDevices' => $allDevices,
            'zoneBoundaries' => $site->zoneBoundaries,
        ]);
    }

    public function save(Request $request, Site $site)
    {
        $validated = $request->validate([
            'device_positions' => 'nullable|array',
            'device_positions.*.device_id' => 'required|integer|exists:devices,id',
            'device_positions.*.floor_id' => 'required|integer|exists:floor_plans,id',
            'device_positions.*.floor_x' => 'required|numeric|min:0|max:1',
            'device_positions.*.floor_y' => 'required|numeric|min:0|max:1',
            'device_positions.*.zone' => 'nullable|string|max:255',

            'zone_boundaries' => 'nullable|array',
            'zone_boundaries.*.id' => 'nullable|integer',
            'zone_boundaries.*.floor_plan_id' => 'required|integer|exists:floor_plans,id',
            'zone_boundaries.*.name' => 'required|string|max:255',
            'zone_boundaries.*.color' => 'required|string|max:7',
            'zone_boundaries.*.x' => 'required|numeric|min:0|max:1',
            'zone_boundaries.*.y' => 'required|numeric|min:0|max:1',
            'zone_boundaries.*.width' => 'required|numeric|min:0.01|max:1',
            'zone_boundaries.*.height' => 'required|numeric|min:0.01|max:1',

            'deleted_zone_ids' => 'nullable|array',
            'deleted_zone_ids.*' => 'integer|exists:zone_boundaries,id',
        ]);

        DB::transaction(function () use ($validated, $site) {
            // 1. Delete removed zones
            if (! empty($validated['deleted_zone_ids'])) {
                ZoneBoundary::where('site_id', $site->id)
                    ->whereIn('id', $validated['deleted_zone_ids'])
                    ->delete();
            }

            // 2. Upsert zone boundaries
            foreach ($validated['zone_boundaries'] ?? [] as $zb) {
                if (! empty($zb['id']) && $zb['id'] > 0) {
                    ZoneBoundary::where('id', $zb['id'])
                        ->where('site_id', $site->id)
                        ->update(Arr::except($zb, ['id']));
                } else {
                    $site->zoneBoundaries()->create(
                        Arr::except($zb, ['id'])
                    );
                }
            }

            // 3. Update device positions + zones
            foreach ($validated['device_positions'] ?? [] as $dp) {
                Device::where('id', $dp['device_id'])
                    ->where('site_id', $site->id)
                    ->update([
                        'floor_id' => $dp['floor_id'],
                        'floor_x' => $dp['floor_x'],
                        'floor_y' => $dp['floor_y'],
                        'zone' => $dp['zone'],
                    ]);
            }
        });

        return back()->with('success', 'Layout saved successfully.');
    }
}
