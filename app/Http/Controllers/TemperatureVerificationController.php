<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Models\TemperatureVerification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TemperatureVerificationController extends Controller
{
    public function index(Request $request, Site $site)
    {
        $verifications = TemperatureVerification::where('site_id', $site->id)
            ->with('verifiedBy')
            ->latest('verified_at')
            ->paginate(25)
            ->withQueryString();

        // Get unique zones from site devices for the form dropdown
        $zones = $site->devices()
            ->whereNotNull('zone')
            ->distinct()
            ->pluck('zone')
            ->sort()
            ->values();

        // Get latest sensor readings per zone for auto-fill
        $latestReadings = $site->devices()
            ->whereNotNull('zone')
            ->with(['readings' => fn ($q) => $q->where('metric', 'temperature')->latest('time')->limit(1)])
            ->get()
            ->groupBy('zone')
            ->map(function ($devices) {
                $latestReading = $devices
                    ->flatMap(fn ($d) => $d->readings)
                    ->sortByDesc('time')
                    ->first();

                return $latestReading?->value;
            })
            ->filter();

        return Inertia::render('sites/verifications', [
            'site' => $site,
            'verifications' => $verifications,
            'zones' => $zones,
            'latestReadings' => $latestReadings,
        ]);
    }

    public function store(Request $request, Site $site)
    {
        $validated = $request->validate([
            'zone' => 'required|string|max:255',
            'manual_reading' => 'required|numeric|between:-100,100',
            'sensor_reading' => 'nullable|numeric|between:-100,100',
            'notes' => 'nullable|string|max:2000',
        ]);

        $discrepancy = null;
        if (($validated['sensor_reading'] ?? null) !== null) {
            $discrepancy = abs((float) $validated['manual_reading'] - (float) $validated['sensor_reading']);
        }

        TemperatureVerification::create([
            'site_id' => $site->id,
            'zone' => $validated['zone'],
            'manual_reading' => $validated['manual_reading'],
            'sensor_reading' => $validated['sensor_reading'] ?? null,
            'discrepancy' => $discrepancy,
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('sites.verifications', $site)
            ->with('success', 'Temperature verification recorded.');
    }
}
