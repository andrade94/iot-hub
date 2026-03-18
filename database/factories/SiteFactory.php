<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Site>
 */
class SiteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'org_id' => Organization::factory(),
            'name' => fake()->company() . ' — ' . fake()->city(),
            'address' => fake()->address(),
            'lat' => fake()->latitude(),
            'lng' => fake()->longitude(),
            'timezone' => fake()->timezone(),
            'opening_hour' => fake()->time('H:i'),
            'segment_override' => null,
            'install_date' => fake()->dateTimeBetween('-1 year'),
            'status' => fake()->randomElement(['active', 'inactive', 'onboarding']),
            'floor_plan_count' => 0,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
        ]);
    }

    public function onboarding(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'onboarding',
        ]);
    }
}
