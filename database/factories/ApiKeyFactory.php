<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ApiKey>
 */
class ApiKeyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'org_id' => Organization::factory(),
            'name' => fake()->words(2, true) . ' API key',
            'key_hash' => hash('sha256', Str::random(40)),
            'permissions' => fake()->randomElements(
                ['read:devices', 'read:alerts', 'write:devices', 'read:readings', 'write:work-orders'],
                fake()->numberBetween(1, 5)
            ),
            'rate_limit' => fake()->randomElement([60, 120, 300, 600, 1000]),
            'last_used_at' => fake()->optional(0.6)->dateTimeBetween('-30 days'),
            'active' => fake()->boolean(80),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => true,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }
}
