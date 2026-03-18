<?php

namespace Database\Factories;

use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Gateway>
 */
class GatewayFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'model' => fake()->randomElement(['RAK7268', 'RAK7289', 'Milesight UG65', 'Kerlink iStation']),
            'serial' => strtoupper(fake()->unique()->bothify('GW-####-????-####')),
            'chirpstack_id' => fake()->optional()->uuid(),
            'last_seen_at' => fake()->dateTimeBetween('-7 days'),
            'status' => fake()->randomElement(['online', 'offline', 'provisioning']),
            'is_addon' => fake()->boolean(20),
        ];
    }

    public function online(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'online',
            'last_seen_at' => now()->subMinutes(fake()->numberBetween(1, 10)),
        ]);
    }

    public function offline(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'offline',
            'last_seen_at' => now()->subHours(fake()->numberBetween(1, 48)),
        ]);
    }
}
