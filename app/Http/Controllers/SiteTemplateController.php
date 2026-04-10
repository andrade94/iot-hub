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
            ->withCount('sites as usage_count')
            ->withMax('sites as last_applied_at', 'template_applied_at')
            ->latest()
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'segment' => $t->segment,
                'modules' => $t->modules ?? [],
                'zone_config' => $t->zone_config ?? [],
                'recipe_assignments' => $t->recipe_assignments ?? [],
                'alert_rules' => $t->alert_rules ?? [],
                'maintenance_windows' => $t->maintenance_windows ?? [],
                'escalation_structure' => $t->escalation_structure,
                'usage_count' => (int) $t->usage_count,
                'last_applied_at' => $t->last_applied_at,
                'created_at' => $t->created_at,
                'created_by_user' => $t->createdByUser ? ['id' => $t->createdByUser->id, 'name' => $t->createdByUser->name] : null,
            ]);

        // Sites with conflict indicators for the Apply dialog
        $accessibleSites = $user->accessibleSites()->filter(fn ($s) => $s->status === 'active');
        $siteIds = $accessibleSites->pluck('id');

        $sitesWithChains = \App\Models\EscalationChain::whereIn('site_id', $siteIds)
            ->pluck('site_id')
            ->unique()
            ->flip();
        $sitesWithRules = \App\Models\AlertRule::whereIn('site_id', $siteIds)
            ->pluck('site_id')
            ->unique()
            ->flip();
        $sitesWithWindows = \App\Models\MaintenanceWindow::whereIn('site_id', $siteIds)
            ->pluck('site_id')
            ->unique()
            ->flip();

        $sites = $accessibleSites
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'has_escalation_chain' => $sitesWithChains->has($s->id),
                'has_rules' => $sitesWithRules->has($s->id),
                'has_windows' => $sitesWithWindows->has($s->id),
                'template_id' => $s->template_id,
            ])
            ->values();

        // Stats bar
        $allSites = Site::where('org_id', $user->org_id)->whereNotNull('template_id')->count();
        $mostUsed = $templates->sortByDesc('usage_count')->first();
        $lastAppliedTemplate = $templates
            ->filter(fn ($t) => $t['last_applied_at'] !== null)
            ->sortByDesc('last_applied_at')
            ->first();

        $stats = [
            'total_templates' => $templates->count(),
            'sites_using' => $allSites,
            'total_sites' => Site::where('org_id', $user->org_id)->count(),
            'most_used' => $mostUsed && $mostUsed['usage_count'] > 0
                ? ['name' => $mostUsed['name'], 'usage_count' => $mostUsed['usage_count']]
                : null,
            'last_applied' => $lastAppliedTemplate
                ? [
                    'template_name' => $lastAppliedTemplate['name'],
                    'at' => $lastAppliedTemplate['last_applied_at'],
                ]
                : null,
            'by_segment' => $templates
                ->groupBy(fn ($t) => $t['segment'] ?? 'unclassified')
                ->map(fn ($group) => $group->count())
                ->toArray(),
        ];

        return Inertia::render('settings/site-templates/index', [
            'templates' => $templates,
            'sites' => $sites,
            'stats' => $stats,
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
