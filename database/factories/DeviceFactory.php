<?php

namespace Database\Factories;

use App\Models\Gateway;
use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Device>
 */
class DeviceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'gateway_id' => Gateway::factory(),
            'model' => fake()->randomElement(['LHT65N', 'EM300-TH', 'EM500-CO2', 'VS121', 'AM319', 'EM300-MCS']),
            'dev_eui' => strtoupper(fake()->unique()->bothify('################')),
            'app_key' => strtoupper(fake()->bothify('################################')),
            'name' => fake()->words(2, true) . ' sensor',
            'zone' => fake()->randomElement(['kitchen', 'storage', 'display', 'entrance', 'office', 'warehouse']),
            'floor_id' => null,
            'floor_x' => fake()->optional()->randomFloat(2, 0, 100),
            'floor_y' => fake()->optional()->randomFloat(2, 0, 100),
            'recipe_id' => null,
            'installed_at' => fake()->dateTimeBetween('-6 months'),
            'battery_pct' => fake()->numberBetween(10, 100),
            'rssi' => fake()->numberBetween(-120, -30),
            'last_reading_at' => fake()->dateTimeBetween('-24 hours'),
            'status' => fake()->randomElement(['active', 'inactive', 'maintenance', 'provisioning']),
            'provisioned_at' => fake()->optional(0.8)->dateTimeBetween('-6 months'),
            'provisioned_by' => null,
            'replaced_device_id' => null,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
            'last_reading_at' => now()->subMinutes(fake()->numberBetween(1, 10)),
        ]);
    }

    public function offline(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
            'last_reading_at' => now()->subHours(fake()->numberBetween(2, 48)),
        ]);
    }

    public function lowBattery(): static
    {
        return $this->state(fn (array $attributes) => [
            'battery_pct' => fake()->numberBetween(1, 19),
        ]);
    }
}
