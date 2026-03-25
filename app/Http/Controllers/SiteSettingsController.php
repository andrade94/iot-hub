<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Models\SiteTemplate;
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
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
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
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'timezone' => 'nullable|string|timezone',
            'opening_hour' => 'nullable|date_format:H:i',
            'status' => 'required|string|in:draft,active,suspended',
        ]);

        $site->update($validated);

        return back()->with('success', "Site '{$site->name}' updated.");
    }

    public function batchImport(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;

        $templates = SiteTemplate::where('org_id', $orgId)
            ->orderBy('name')
            ->get(['id', 'name']);

        $timezones = timezone_identifiers_list(\DateTimeZone::AMERICA);

        return Inertia::render('settings/sites/batch-import', [
            'templates' => $templates,
            'timezones' => $timezones,
        ]);
    }

    public function processBatchImport(Request $request)
    {
        $request->validate([
            'sites' => 'required|array|min:1',
            'sites.*.name' => 'required|string|max:255',
            'sites.*.address' => 'nullable|string|max:500',
            'sites.*.timezone' => 'nullable|string|timezone',
            'sites.*.template_name' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $orgId = $user->org_id;
        $created = 0;

        foreach ($request->input('sites') as $siteData) {
            Site::create([
                'org_id' => $orgId,
                'name' => $siteData['name'],
                'address' => $siteData['address'] ?? null,
                'timezone' => $siteData['timezone'] ?? null,
                'status' => 'draft',
            ]);
            $created++;
        }

        return redirect()->route('sites.settings.index')
            ->with('success', "{$created} site(s) imported successfully.");
    }

    public function destroy(Site $site)
    {
        $name = $site->name;
        $site->delete();

        return back()->with('success', "Site '{$name}' deleted.");
    }
}
