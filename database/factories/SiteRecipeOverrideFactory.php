<?php

namespace Database\Factories;

use App\Models\Recipe;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SiteRecipeOverride>
 */
class SiteRecipeOverrideFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'recipe_id' => Recipe::factory(),
            'overridden_rules' => [
                [
                    'metric' => 'temperature',
                    'condition' => 'above',
                    'threshold' => 10,
                    'severity' => 'warning',
                ],
            ],
            'overridden_by' => User::factory(),
        ];
    }
}
