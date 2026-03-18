<?php

namespace Database\Factories;

use App\Models\Device;
use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AlertRule>
 */
class AlertRuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'device_id' => Device::factory(),
            'name' => fake()->words(3, true) . ' rule',
            'type' => fake()->randomElement(['threshold', 'absence', 'geofence', 'anomaly']),
            'conditions' => [
                [
                    'metric' => fake()->randomElement(['temperature', 'humidity', 'co2']),
                    'condition' => fake()->randomElement(['above', 'below', 'equal']),
                    'threshold' => fake()->randomFloat(1, -10, 50),
                ],
            ],
            'severity' => fake()->randomElement(['info', 'warning', 'critical']),
            'cooldown_minutes' => fake()->randomElement([5, 10, 15, 30, 60]),
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
