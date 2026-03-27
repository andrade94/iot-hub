<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class OrganizationCatalogController extends Controller
{
    public function index()
    {
        $organizations = Organization::withCount(['sites', 'users'])
            ->addSelect([
                'devices_count' => \App\Models\Device::selectRaw('COUNT(*)')
                    ->join('sites', 'sites.id', '=', 'devices.site_id')
                    ->whereColumn('sites.org_id', 'organizations.id'),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn ($org) => [
                'id' => $org->id,
                'name' => $org->name,
                'slug' => $org->slug,
                'logo' => $org->logo,
                'segment' => $org->segment,
                'plan' => $org->plan,
                'status' => $org->status ?? 'active',
                'sites_count' => $org->sites_count,
                'devices_count' => (int) $org->devices_count,
                'users_count' => $org->users_count,
                'created_at' => $org->created_at->toIso8601String(),
            ]);

        return Inertia::render('settings/organizations/index', [
            'organizations' => $organizations,
            'segments' => \App\Models\Segment::active()->pluck('name'),
        ]);
    }

    public function show(Organization $organization)
    {
        $organization->load([
            'sites' => function ($query) {
                $query->withCount(['devices', 'gateways'])->orderBy('name');
            },
            'users' => function ($query) {
                $query->orderBy('name');
            },
            'subscriptions' => function ($query) {
                $query->latest()->limit(1);
            },
        ]);

        $sites = $organization->sites->map(fn ($site) => [
            'id' => $site->id,
            'name' => $site->name,
            'status' => $site->status,
            'timezone' => $site->timezone,
            'devices_count' => $site->devices_count,
            'gateways_count' => $site->gateways_count,
        ]);

        $users = $organization->users->map(fn ($user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name ?? 'none',
            'status' => $user->isDeactivated() ? 'inactive' : 'active',
        ]);

        $timezones = timezone_identifiers_list(\DateTimeZone::AMERICA);

        return Inertia::render('settings/organizations/show', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'segment' => $organization->segment,
                'plan' => $organization->plan,
                'status' => $organization->status ?? 'active',
                'logo' => $organization->logo,
                'branding' => $organization->branding,
                'default_timezone' => $organization->default_timezone,
                'default_opening_hour' => $organization->default_opening_hour?->format('H:i'),
                'created_at' => $organization->created_at->toIso8601String(),
            ],
            'sites' => $sites,
            'users' => $users,
            'subscription' => $organization->subscriptions->first(),
            'timezones' => $timezones,
            'segments' => \App\Models\Segment::active()->pluck('name'),
        ]);
    }

    public function update(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:organizations,slug,' . $organization->id,
            'segment' => ['required', 'string', Rule::in(\App\Models\Segment::active()->pluck('name'))],
            'plan' => 'required|string|in:starter,standard,enterprise',
            'default_timezone' => 'nullable|string|max:50',
            'default_opening_hour' => 'nullable|date_format:H:i',
            'branding' => 'nullable|array',
            'branding.primary_color' => 'nullable|string|max:20',
            'branding.secondary_color' => 'nullable|string|max:20',
            'branding.accent_color' => 'nullable|string|max:20',
            'logo' => 'nullable|string|max:500',
        ]);

        // Merge branding with existing values
        if (isset($validated['branding'])) {
            $validated['branding'] = array_merge(
                $organization->branding ?? [],
                array_filter($validated['branding'])
            );
        }

        $organization->update($validated);

        return back()->with('success', "Organization '{$organization->name}' updated.");
    }

    public function suspend(Organization $organization)
    {
        if (! $organization->canTransitionTo('suspended')) {
            return back()->with('error', "Cannot suspend organization in '{$organization->status}' status.");
        }

        $organization->suspend();

        return back()->with('success', "Organization '{$organization->name}' suspended.");
    }

    public function reactivate(Organization $organization)
    {
        if ($organization->status !== 'suspended') {
            return back()->with('error', 'Only suspended organizations can be reactivated.');
        }

        $organization->reactivate();

        return back()->with('success', "Organization '{$organization->name}' reactivated.");
    }

    public function destroy(Organization $organization)
    {
        if (! $organization->canTransitionTo('archived')) {
            return back()->with('error', "Cannot archive organization in '{$organization->status}' status.");
        }

        $organization->archive();

        return redirect()->route('organizations.index')->with('success', "Organization '{$organization->name}' archived.");
    }
}
