<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Site;
use App\Models\SiteTemplate;
use App\Services\Sites\SiteTemplateService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SiteSettingsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $org = $this->resolveOrganization($request);
        $allOrgsMode = $org === null;

        if ($allOrgsMode) {
            // Super admin with no org context — show sites from ALL organizations
            $sites = Site::with('organization:id,name')
                ->withCount(['devices', 'gateways'])
                ->orderBy('name')
                ->get()
                ->map(fn ($site) => [
                    'id' => $site->id,
                    'name' => $site->name,
                    'address' => $site->address,
                    'lat' => $site->lat,
                    'lng' => $site->lng,
                    'status' => $site->status,
                    'timezone' => $site->timezone,
                    'opening_hour' => $site->opening_hour?->format('H:i'),
                    'device_count' => $site->devices_count,
                    'gateway_count' => $site->gateways_count,
                    'organization_name' => $site->organization?->name,
                    'created_at' => $site->created_at->toIso8601String(),
                ]);
        } else {
            $sites = Site::where('org_id', $org->id)
                ->withCount(['devices', 'gateways'])
                ->orderBy('name')
                ->get()
                ->map(fn ($site) => [
                    'id' => $site->id,
                    'name' => $site->name,
                    'address' => $site->address,
                    'lat' => $site->lat,
                    'lng' => $site->lng,
                    'status' => $site->status,
                    'timezone' => $site->timezone,
                    'opening_hour' => $site->opening_hour?->format('H:i'),
                    'device_count' => $site->devices_count,
                    'gateway_count' => $site->gateways_count,
                    'created_at' => $site->created_at->toIso8601String(),
                ]);
        }

        $timezones = timezone_identifiers_list(\DateTimeZone::AMERICA);

        return Inertia::render('settings/sites/index', [
            'sites' => $sites,
            'timezones' => $timezones,
            'allOrgsMode' => $allOrgsMode,
        ]);
    }

    public function store(Request $request)
    {
        $org = $this->resolveOrganization($request);

        // Super_admin can pass org_id explicitly when creating sites in all-orgs mode
        if (! $org && $request->user()->hasRole('super_admin') && $request->filled('org_id')) {
            $org = Organization::findOrFail($request->input('org_id'));
        }

        if (! $org) {
            return back()->with('error', 'Select an organization before creating sites.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'timezone' => 'nullable|string|timezone',
            'opening_hour' => 'nullable|date_format:H:i',
            'status' => 'required|string|in:draft,active,suspended',
        ]);

        $site = Site::create([
            ...$validated,
            'org_id' => $org->id,
        ]);

        return back()->with('success', "Site '{$validated['name']}' created.")
            ->with('created_id', $site->id);
    }

    public function update(Request $request, Site $site)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'timezone' => 'nullable|string|timezone',
            'opening_hour' => 'nullable|date_format:H:i',
            'status' => 'required|string|in:draft,active,suspended',
        ]);

        $site->update($validated);

        return back()->with('success', "Site '{$site->name}' updated.");
    }

    public function batchImport(Request $request)
    {
        $org = $this->resolveOrganization($request);

        if (! $org) {
            return redirect()->route('sites.settings.index')
                ->with('error', 'Select an organization before importing sites.');
        }

        $templates = SiteTemplate::where('org_id', $org->id)
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
        $org = $this->resolveOrganization($request);

        if (! $org) {
            return back()->with('error', 'Select an organization before importing sites.');
        }

        $request->validate([
            'sites' => 'required|array|min:1',
            'sites.*.name' => 'required|string|max:255',
            'sites.*.address' => 'nullable|string|max:500',
            'sites.*.timezone' => 'nullable|string|timezone',
            'sites.*.template_name' => 'nullable|string|max:255',
        ]);

        $created = 0;

        $templateService = app(SiteTemplateService::class);

        foreach ($request->input('sites') as $siteData) {
            $site = Site::create([
                'org_id' => $org->id,
                'name' => $siteData['name'],
                'address' => $siteData['address'] ?? null,
                'timezone' => $siteData['timezone'] ?? null,
                'status' => 'draft',
            ]);

            // Apply template if specified
            if (! empty($siteData['template_name'])) {
                $template = SiteTemplate::where('org_id', $org->id)
                    ->where('name', $siteData['template_name'])
                    ->first();
                if ($template) {
                    $templateService->applyToSite($site, $template);
                }
            }

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

    private function resolveOrganization(Request $request): ?Organization
    {
        if (app()->bound('current_organization')) {
            return app('current_organization');
        }

        $user = $request->user();

        if ($user->org_id) {
            return Organization::findOrFail($user->org_id);
        }

        // super_admin without org_id — try session org switcher, return null for all-orgs mode
        if ($user->hasRole('super_admin')) {
            $sessionOrgId = session('current_org_id');
            if ($sessionOrgId) {
                return Organization::findOrFail($sessionOrgId);
            }

            return null; // All orgs mode
        }

        abort(403, 'No organization selected.');
    }
}
