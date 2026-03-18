<?php

namespace App\Services\Recipes;

use App\Models\AlertRule;
use App\Models\Device;
use App\Models\Module;
use App\Models\Recipe;
use App\Models\Site;
use Illuminate\Support\Facades\Log;

class RecipeApplicationService
{
    /**
     * Apply all recipes for a module to a site's devices.
     * Creates AlertRules from Recipe.default_rules for matching sensor models.
     */
    public function applyModuleRecipes(Site $site, Module $module): int
    {
        $recipes = Recipe::where('module_id', $module->id)->get();
        $devices = Device::where('site_id', $site->id)->get();
        $rulesCreated = 0;

        foreach ($recipes as $recipe) {
            // Find devices matching this recipe's sensor model
            $matchingDevices = $devices->filter(
                fn (Device $d) => $d->model === $recipe->sensor_model
            );

            if ($matchingDevices->isEmpty()) {
                continue;
            }

            foreach ($matchingDevices as $device) {
                $rulesCreated += $this->applyRecipeToDevice($site, $recipe, $device);
            }
        }

        Log::info('Module recipes applied', [
            'site_id' => $site->id,
            'module' => $module->slug,
            'rules_created' => $rulesCreated,
        ]);

        return $rulesCreated;
    }

    /**
     * Apply a single recipe's default rules to a device.
     * Skips if a rule from this recipe already exists for this device.
     */
    public function applyRecipeToDevice(Site $site, Recipe $recipe, Device $device): int
    {
        $defaultRules = $recipe->default_rules;

        if (empty($defaultRules) || ! is_array($defaultRules)) {
            return 0;
        }

        // Check for existing rule with same recipe for this device
        $existing = AlertRule::where('site_id', $site->id)
            ->where('device_id', $device->id)
            ->where('name', 'like', "%{$recipe->name}%")
            ->exists();

        if ($existing) {
            return 0;
        }

        // Wrap all default_rules into a single AlertRule with multiple conditions
        $conditions = array_map(fn (array $rule) => [
            'metric' => $rule['metric'],
            'condition' => $rule['condition'] ?? 'above',
            'threshold' => $rule['threshold'],
            'duration_minutes' => $rule['duration_minutes'] ?? 0,
            'severity' => $rule['severity'] ?? 'medium',
        ], $defaultRules);

        AlertRule::create([
            'site_id' => $site->id,
            'device_id' => $device->id,
            'name' => "{$recipe->name} — {$device->name}",
            'conditions' => $conditions,
            'severity' => $conditions[0]['severity'] ?? 'medium',
            'cooldown_minutes' => 15,
            'active' => true,
        ]);

        return 1;
    }

    /**
     * Remove auto-created rules when a module is deactivated.
     */
    public function removeModuleRules(Site $site, Module $module): int
    {
        $recipeNames = Recipe::where('module_id', $module->id)->pluck('name');

        $deleted = 0;
        foreach ($recipeNames as $name) {
            $deleted += AlertRule::where('site_id', $site->id)
                ->where('name', 'like', "%{$name}%")
                ->delete();
        }

        return $deleted;
    }
}
