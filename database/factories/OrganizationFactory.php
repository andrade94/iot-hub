<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Organization>
 */
class OrganizationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'slug' => fake()->unique()->slug(),
            'segment' => fake()->randomElement(['retail', 'logistics', 'industrial', 'hospitality', 'commercial', 'pharma']),
            'plan' => fake()->randomElement(['starter', 'professional', 'enterprise']),
            'settings' => [],
            'logo' => null,
            'branding' => [],
            'default_timezone' => fake()->timezone(),
        ];
    }
}
