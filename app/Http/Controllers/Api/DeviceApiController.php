<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\Site;
use App\Services\Readings\ReadingQueryService;
use App\Services\Readings\ReadingStorageService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceApiController extends Controller
{
    public function index(Request $request, Site $site): JsonResponse
    {
        $devices = $site->devices()
            ->with(['gateway', 'recipe'])
            ->get()
            ->map(fn (Device $device) => [
                'id' => $device->id,
                'name' => $device->name,
                'dev_eui' => $device->dev_eui,
                'model' => $device->model,
                'zone' => $device->zone,
                'status' => $device->status,
                'battery_pct' => $device->battery_pct,
                'rssi' => $device->rssi,
                'last_reading_at' => $device->last_reading_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $devices]);
    }

    public function show(Request $request, Device $device, ReadingStorageService $storageService): JsonResponse
    {
        $device->load(['gateway', 'recipe', 'site:id,name']);
        $latest = $storageService->getLatest($device->id);

        return response()->json([
            'data' => [
                'id' => $device->id,
                'name' => $device->name,
                'dev_eui' => $device->dev_eui,
                'model' => $device->model,
                'zone' => $device->zone,
                'status' => $device->status,
                'online' => $device->isOnline(),
                'battery_pct' => $device->battery_pct,
                'rssi' => $device->rssi,
                'last_reading_at' => $device->last_reading_at?->toIso8601String(),
                'installed_at' => $device->installed_at?->toIso8601String(),
                'latest_readings' => $latest,
                'site' => $device->site ? [
                    'id' => $device->site->id,
                    'name' => $device->site->name,
                ] : null,
                'gateway' => $device->gateway ? [
                    'id' => $device->gateway->id,
                    'model' => $device->gateway->model,
                    'status' => $device->gateway->status,
                    'last_seen_at' => $device->gateway->last_seen_at?->toIso8601String(),
                ] : null,
                'recipe' => $device->recipe ? [
                    'id' => $device->recipe->id,
                    'name' => $device->recipe->name,
                ] : null,
            ],
        ]);
    }

    public function readings(Request $request, Device $device, ReadingQueryService $queryService): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to' => 'required|date|after:from',
            'metric' => 'nullable|string',
            'resolution' => 'nullable|string|in:1m,5m,15m,1h,6h,1d',
        ]);

        $from = Carbon::parse($request->input('from'));
        $to = Carbon::parse($request->input('to'));
        $metric = $request->input('metric', 'temperature');
        $resolution = $request->input('resolution');

        $readings = $queryService->getReadings($device->id, $metric, $from, $to, $resolution);

        return response()->json(['data' => $readings]);
    }

    public function status(Request $request, Device $device, ReadingStorageService $storageService): JsonResponse
    {
        $latest = $storageService->getLatest($device->id);

        return response()->json([
            'data' => [
                'id' => $device->id,
                'name' => $device->name,
                'status' => $device->status,
                'online' => $device->isOnline(),
                'battery_pct' => $device->battery_pct,
                'rssi' => $device->rssi,
                'last_reading_at' => $device->last_reading_at?->toIso8601String(),
                'latest_readings' => $latest,
            ],
        ]);
    }
}
