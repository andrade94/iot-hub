<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SiteTemplate>
 */
class SiteTemplateFactory extends Factory
{
    public function definition(): array
    {
        return [
            'org_id' => Organization::factory(),
            'name' => fake()->randomElement([
                'Standard Cold Chain',
                'Convenience Store',
                'Pharmacy Cold Room',
                'Industrial Warehouse',
                'Restaurant Kitchen',
                'Supermarket',
            ]) . ' Template',
            'description' => fake()->optional(0.7)->sentence(),
            'modules' => fake()->randomElements(['cold_chain', 'energy', 'compliance', 'industrial', 'iaq', 'safety'], fake()->numberBetween(1, 4)),
            'zone_config' => [
                ['name' => 'Walk-in Cooler'],
                ['name' => 'Display Case'],
                ['name' => 'Prep Area'],
            ],
            'recipe_assignments' => [
                ['zone' => 'Walk-in Cooler', 'recipe_id' => 1],
                ['zone' => 'Display Case', 'recipe_id' => 1],
            ],
            'escalation_structure' => null,
            'created_by' => User::factory(),
        ];
    }
}
