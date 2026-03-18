<?php

namespace App\Http\Controllers;

use App\Models\Site;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SiteSettingsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;

        $sites = Site::where('org_id', $orgId)
            ->withCount(['devices', 'gateways'])
            ->orderBy('name')
            ->get()
            ->map(fn ($site) => [
                'id' => $site->id,
                'name' => $site->name,
                'address' => $site->address,
                'status' => $site->status,
                'timezone' => $site->timezone,
                'opening_hour' => $site->opening_hour?->format('H:i'),
                'device_count' => $site->devices_count,
                'gateway_count' => $site->gateways_count,
                'created_at' => $site->created_at->toIso8601String(),
            ]);

        $timezones = timezone_identifiers_list(\DateTimeZone::AMERICA);

        return Inertia::render('settings/sites/index', [
            'sites' => $sites,
            'timezones' => $timezones,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'timezone' => 'nullable|string|timezone',
            'opening_hour' => 'nullable|date_format:H:i',
            'status' => 'required|string|in:draft,active,suspended',
        ]);

        $user = $request->user();

        Site::create([
            ...$validated,
            'org_id' => $user->org_id,
        ]);

        return back()->with('success', "Site '{$validated['name']}' created.");
    }

    public function update(Request $request, Site $site)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'timezone' => 'nullable|string|timezone',
            'opening_hour' => 'nullable|date_format:H:i',
            'status' => 'required|string|in:draft,active,suspended',
        ]);

        $site->update($validated);

        return back()->with('success', "Site '{$site->name}' updated.");
    }

    public function destroy(Site $site)
    {
        $name = $site->name;
        $site->delete();

        return back()->with('success', "Site '{$name}' deleted.");
    }
}
