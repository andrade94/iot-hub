<?php

namespace App\Services\Sites;

use App\Models\Device;
use App\Models\EscalationChain;
use App\Models\Site;
use App\Models\SiteModule;
use App\Models\SiteTemplate;

class SiteTemplateService
{
    /**
     * Capture configuration from an existing site to create a template (BR-089).
     */
    public function capture(Site $sourceSite): array
    {
        // Activated modules
        $modules = SiteModule::where('site_id', $sourceSite->id)
            ->where('active', true)
            ->pluck('module_slug')
            ->toArray();

        // Zone config (unique zone names with device counts)
        $zones = Device::where('site_id', $sourceSite->id)
            ->whereNotNull('zone')
            ->select('zone')
            ->distinct()
            ->pluck('zone')
            ->map(fn ($z) => ['name' => $z])
            ->toArray();

        // Recipe assignments by zone
        $recipes = Device::where('site_id', $sourceSite->id)
            ->whereNotNull('zone')
            ->whereNotNull('recipe_id')
            ->select('zone', 'recipe_id')
            ->distinct()
            ->get()
            ->map(fn ($d) => ['zone' => $d->zone, 'recipe_id' => $d->recipe_id])
            ->toArray();

        // Escalation chain structure
        $escalation = EscalationChain::where('site_id', $sourceSite->id)
            ->first()
            ?->levels;

        return [
            'modules' => $modules,
            'zone_config' => $zones,
            'recipe_assignments' => $recipes,
            'escalation_structure' => $escalation,
        ];
    }

    /**
     * Apply template config to a target site (BR-090).
     */
    public function applyToSite(SiteTemplate $template, Site $targetSite): void
    {
        // Activate modules
        foreach ($template->modules as $slug) {
            SiteModule::updateOrCreate(
                ['site_id' => $targetSite->id, 'module_slug' => $slug],
                ['active' => true],
            );
        }

        // Apply escalation chain structure if present
        if ($template->escalation_structure) {
            EscalationChain::updateOrCreate(
                ['site_id' => $targetSite->id],
                [
                    'name' => "{$targetSite->name} Escalation",
                    'levels' => $template->escalation_structure,
                    'org_id' => $targetSite->org_id,
                ],
            );
        }
    }
}
