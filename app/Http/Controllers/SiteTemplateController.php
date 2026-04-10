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
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'modules' => $t->modules ?? [],
                'zone_config' => $t->zone_config ?? [],
                'recipe_assignments' => $t->recipe_assignments ?? [],
                'alert_rules' => $t->alert_rules ?? [],
                'maintenance_windows' => $t->maintenance_windows ?? [],
                'escalation_structure' => $t->escalation_structure,
                'created_at' => $t->created_at,
                'created_by_user' => $t->createdByUser ? ['id' => $t->createdByUser->id, 'name' => $t->createdByUser->name] : null,
            ]);

        // Sites with an indicator for existing escalation chains (for conflict warning)
        $accessibleSites = $user->accessibleSites()->filter(fn ($s) => $s->status === 'active');
        $siteIds = $accessibleSites->pluck('id');
        $sitesWithChains = \App\Models\EscalationChain::whereIn('site_id', $siteIds)
            ->pluck('site_id')
            ->unique()
            ->flip();

        $sites = $accessibleSites
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'has_escalation_chain' => $sitesWithChains->has($s->id),
            ])
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

        // Cross-org guard: source must be accessible to this user
        if (! $user->hasRole('super_admin') && ! $user->canAccessSite($sourceSite->id)) {
            abort(403, 'You cannot capture a template from a site outside your organization.');
        }

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
        $user = auth()->user();
        abort_unless($user->hasPermissionTo('manage site templates'), 403);

        // Cross-org guard: template must belong to user's org
        if (! $user->hasRole('super_admin') && $siteTemplate->org_id !== $user->org_id) {
            abort(403, 'You cannot delete a template from another organization.');
        }

        $siteTemplate->delete();

        return back()->with('success', 'Site template deleted.');
    }

    public function apply(Request $request, SiteTemplate $siteTemplate, SiteTemplateService $service)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('manage site templates'), 403);

        // Cross-org guard: template must belong to user's org
        if (! $user->hasRole('super_admin') && $siteTemplate->org_id !== $user->org_id) {
            abort(403, 'You cannot apply a template from another organization.');
        }

        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
        ]);

        $targetSite = Site::findOrFail($validated['site_id']);

        // Cross-org guard: target site must belong to same org as the template
        if (! $user->hasRole('super_admin') && $targetSite->org_id !== $siteTemplate->org_id) {
            abort(403, 'The target site must belong to the same organization as the template.');
        }

        // Additional guard: user must have access to the target site
        if (! $user->hasRole('super_admin') && ! $user->canAccessSite($targetSite->id)) {
            abort(403, 'You cannot apply a template to a site you do not have access to.');
        }

        $summary = $service->applyToSite($siteTemplate, $targetSite, $user->id);

        $parts = [];
        if ($summary['modules'] > 0) {
            $parts[] = "{$summary['modules']} module(s)";
        }
        if ($summary['alert_rules'] > 0) {
            $parts[] = "{$summary['alert_rules']} alert rule(s)";
        }
        if ($summary['maintenance_windows'] > 0) {
            $parts[] = "{$summary['maintenance_windows']} maintenance window(s)";
        }
        if ($summary['escalation_chain']) {
            $parts[] = $summary['escalation_chain_replaced']
                ? 'escalation chain (replaced)'
                : 'escalation chain';
        }
        $detail = empty($parts) ? 'no changes' : implode(', ', $parts);

        return back()->with('success', "Template applied to {$targetSite->name}: {$detail}.");
    }
}
