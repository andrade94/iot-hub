<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Models\SiteTemplate;
use App\Services\Sites\SiteTemplateService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SiteTemplateController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('manage site templates'), 403);

        $templates = SiteTemplate::forOrg($user->org_id)
            ->with('createdByUser:id,name')
            ->latest()
            ->get();

        $sites = $user->accessibleSites()
            ->filter(fn ($s) => $s->status === 'active')
            ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])
            ->values();

        return Inertia::render('settings/site-templates/index', [
            'templates' => $templates,
            'sites' => $sites,
        ]);
    }

    public function store(Request $request, SiteTemplateService $service)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('manage site templates'), 403);

        $validated = $request->validate([
            'source_site_id' => 'required|exists:sites,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $sourceSite = Site::findOrFail($validated['source_site_id']);
        $config = $service->capture($sourceSite);

        SiteTemplate::create([
            'org_id' => $user->org_id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            ...$config,
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Site template created.');
    }

    public function destroy(SiteTemplate $siteTemplate)
    {
        abort_unless(auth()->user()->hasPermissionTo('manage site templates'), 403);

        $siteTemplate->delete();

        return back()->with('success', 'Site template deleted.');
    }

    public function apply(Request $request, SiteTemplate $siteTemplate, SiteTemplateService $service)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('manage site templates'), 403);

        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
        ]);

        $targetSite = Site::findOrFail($validated['site_id']);
        $service->applyToSite($siteTemplate, $targetSite);

        return back()->with('success', "Template applied to {$targetSite->name}.");
    }
}
