<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class OrganizationSettingsController extends Controller
{
    public function edit(Request $request)
    {
        $organization = $this->resolveOrganization($request);

        return Inertia::render('settings/organization', [
            'organization' => $organization,
        ]);
    }

    public function update(Request $request)
    {
        $organization = $this->resolveOrganization($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'default_timezone' => 'nullable|string|max:100|timezone:all',
            'logo' => 'nullable|string|max:500',
            'branding' => 'nullable|array',
            'branding.primary_color' => 'nullable|string|max:20',
            'branding.secondary_color' => 'nullable|string|max:20',
            'branding.accent_color' => 'nullable|string|max:20',
            'branding.font_family' => 'nullable|string|max:100',
        ]);

        // Merge new branding keys with any existing ones to avoid losing data
        if (isset($validated['branding'])) {
            $existingBranding = $organization->branding ?? [];
            $validated['branding'] = array_merge($existingBranding, $validated['branding']);
        }

        $organization->update($validated);

        return back()->with('success', 'Organization settings updated.');
    }

    private function resolveOrganization(Request $request): \App\Models\Organization
    {
        if (app()->bound('current_organization')) {
            return app('current_organization');
        }

        $user = $request->user();

        if ($user->org_id) {
            return \App\Models\Organization::findOrFail($user->org_id);
        }

        abort(403, 'No organization selected.');
    }
}
