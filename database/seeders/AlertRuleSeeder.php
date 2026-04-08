<?php

namespace Database\Seeders;

use App\Models\AlertRule;
use App\Models\Device;
use App\Models\Site;
use Illuminate\Database\Seeder;

class AlertRuleSeeder extends Seeder
{
    public function run(): void
    {
        $sites = Site::with('devices.recipe')->get();

        foreach ($sites as $site) {
            $this->generateRulesForSite($site);
        }
    }

    public static function generateRulesForSite(Site $site): int
    {
        $devices = $site->devices()->with('recipe')->whereNotNull('recipe_id')->get();
        $created = 0;

        // Group devices by recipe to avoid duplicate rules
        $byRecipe = $devices->groupBy('recipe_id');

        foreach ($byRecipe as $recipeId => $recipeDevices) {
            $recipe = $recipeDevices->first()->recipe;
            if (! $recipe || empty($recipe->default_rules)) {
                continue;
            }

            // Check if rules from this recipe already exist for this site
            // (match by name pattern to avoid duplicates)
            $existingNames = AlertRule::where('site_id', $site->id)
                ->pluck('name')
                ->map(fn ($n) => strtolower($n))
                ->toArray();

            foreach ($recipe->default_rules as $defaultRule) {
                $ruleName = $recipe->name.' — '.ucfirst($defaultRule['metric']).' '.ucfirst($defaultRule['condition']).' '.$defaultRule['threshold'];

                if (in_array(strtolower($ruleName), $existingNames)) {
                    continue; // Skip if already exists
                }

                AlertRule::create([
                    'site_id' => $site->id,
                    'name' => $ruleName,
                    'type' => 'simple',
                    'severity' => $defaultRule['severity'] ?? 'medium',
                    'cooldown_minutes' => 30,
                    'active' => true,
                    'conditions' => [
                        [
                            'metric' => $defaultRule['metric'],
                            'condition' => $defaultRule['condition'],
                            'threshold' => $defaultRule['threshold'],
                            'duration_minutes' => $defaultRule['duration_minutes'] ?? 0,
                            'severity' => $defaultRule['severity'] ?? 'medium',
                        ],
                    ],
                ]);

                $created++;
            }
        }

        // Always add a battery low rule if not exists
        if (! in_array('battery low', array_map('strtolower', AlertRule::where('site_id', $site->id)->pluck('name')->toArray()))) {
            AlertRule::create([
                'site_id' => $site->id,
                'name' => 'Battery Low',
                'type' => 'simple',
                'severity' => 'low',
                'cooldown_minutes' => 1440,
                'active' => true,
                'conditions' => [
                    [
                        'metric' => 'battery_pct',
                        'condition' => 'below',
                        'threshold' => 15,
                        'duration_minutes' => 0,
                        'severity' => 'low',
                    ],
                ],
            ]);
            $created++;
        }

        return $created;
    }
}
