<?php

namespace App\Services\Sites;

use App\Models\AlertRule;
use App\Models\Device;
use App\Models\EscalationChain;
use App\Models\MaintenanceWindow;
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

        // Alert rules — capture the configurable fields. We intentionally skip
        // device_id/recipe_id because those IDs won't map cleanly to a new site.
        $alertRules = AlertRule::where('site_id', $sourceSite->id)
            ->get(['name', 'type', 'conditions', 'severity', 'cooldown_minutes', 'active'])
            ->map(fn ($r) => [
                'name' => $r->name,
                'type' => $r->type,
                'conditions' => $r->conditions,
                'severity' => $r->severity,
                'cooldown_minutes' => $r->cooldown_minutes,
                'active' => $r->active,
            ])
            ->toArray();

        // Maintenance windows — capture recurring schedules
        $maintenanceWindows = MaintenanceWindow::where('site_id', $sourceSite->id)
            ->get(['zone', 'title', 'recurrence', 'day_of_week', 'start_time', 'duration_minutes', 'suppress_alerts'])
            ->map(fn ($w) => [
                'zone' => $w->zone,
                'title' => $w->title,
                'recurrence' => $w->recurrence,
                'day_of_week' => $w->day_of_week,
                'start_time' => $w->start_time,
                'duration_minutes' => $w->duration_minutes,
                'suppress_alerts' => $w->suppress_alerts,
            ])
            ->toArray();

        // Escalation chain structure
        $escalation = EscalationChain::where('site_id', $sourceSite->id)
            ->first()
            ?->levels;

        return [
            'modules' => $modules,
            'zone_config' => $zones,
            'recipe_assignments' => $recipes,
            'alert_rules' => $alertRules,
            'maintenance_windows' => $maintenanceWindows,
            'escalation_structure' => $escalation,
        ];
    }

    /**
     * Apply template config to a target site (BR-090).
     *
     * Returns a summary of what was applied so callers can show feedback.
     */
    public function applyToSite(SiteTemplate $template, Site $targetSite, ?int $actingUserId = null): array
    {
        $summary = [
            'modules' => 0,
            'alert_rules' => 0,
            'maintenance_windows' => 0,
            'escalation_chain' => false,
            'escalation_chain_replaced' => false,
        ];

        // Activate modules
        foreach ($template->modules ?? [] as $slug) {
            SiteModule::updateOrCreate(
                ['site_id' => $targetSite->id, 'module_slug' => $slug],
                ['active' => true],
            );
            $summary['modules']++;
        }

        // Create alert rules — skip rules whose name already exists on target
        foreach ($template->alert_rules ?? [] as $rule) {
            $exists = AlertRule::where('site_id', $targetSite->id)
                ->where('name', $rule['name'])
                ->exists();
            if ($exists) {
                continue;
            }
            AlertRule::create([
                'site_id' => $targetSite->id,
                'name' => $rule['name'],
                'type' => $rule['type'] ?? null,
                'conditions' => $rule['conditions'] ?? [],
                'severity' => $rule['severity'] ?? 'medium',
                'cooldown_minutes' => $rule['cooldown_minutes'] ?? 15,
                'active' => $rule['active'] ?? true,
            ]);
            $summary['alert_rules']++;
        }

        // Create maintenance windows — skip if identical title+zone exists
        foreach ($template->maintenance_windows ?? [] as $window) {
            $exists = MaintenanceWindow::where('site_id', $targetSite->id)
                ->where('title', $window['title'] ?? '')
                ->where('zone', $window['zone'] ?? null)
                ->exists();
            if ($exists) {
                continue;
            }
            MaintenanceWindow::create([
                'site_id' => $targetSite->id,
                'zone' => $window['zone'] ?? null,
                'title' => $window['title'] ?? 'Maintenance',
                'recurrence' => $window['recurrence'] ?? 'once',
                'day_of_week' => $window['day_of_week'] ?? null,
                'start_time' => $window['start_time'] ?? '00:00:00',
                'duration_minutes' => $window['duration_minutes'] ?? 60,
                'suppress_alerts' => $window['suppress_alerts'] ?? true,
                'created_by' => $actingUserId,
            ]);
            $summary['maintenance_windows']++;
        }

        // Apply escalation chain structure if present
        if ($template->escalation_structure) {
            $existing = EscalationChain::where('site_id', $targetSite->id)->first();
            $summary['escalation_chain_replaced'] = $existing !== null;
            EscalationChain::updateOrCreate(
                ['site_id' => $targetSite->id],
                [
                    'name' => "{$targetSite->name} Escalation",
                    'levels' => $template->escalation_structure,
                    'org_id' => $targetSite->org_id,
                ],
            );
            $summary['escalation_chain'] = true;
        }

        return $summary;
    }
}
