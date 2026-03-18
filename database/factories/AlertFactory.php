<?php

namespace Database\Factories;

use App\Models\AlertRule;
use App\Models\Device;
use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Alert>
 */
class AlertFactory extends Factory
{
    public function definition(): array
    {
        return [
            'rule_id' => AlertRule::factory(),
            'site_id' => Site::factory(),
            'device_id' => Device::factory(),
            'severity' => fake()->randomElement(['info', 'warning', 'critical']),
            'status' => fake()->randomElement(['active', 'acknowledged', 'resolved', 'dismissed']),
            'triggered_at' => fake()->dateTimeBetween('-30 days'),
            'acknowledged_at' => null,
            'resolved_at' => null,
            'resolved_by' => null,
            'resolution_type' => null,
            'data' => [
                'metric' => 'temperature',
                'value' => fake()->randomFloat(2, -10, 50),
                'threshold' => fake()->randomFloat(1, 0, 30),
                'message' => fake()->sentence(),
            ],
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
            'acknowledged_at' => null,
            'resolved_at' => null,
        ]);
    }

    public function acknowledged(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'acknowledged',
            'acknowledged_at' => fake()->dateTimeBetween('-7 days'),
        ]);
    }

    public function resolved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'resolved',
            'acknowledged_at' => fake()->dateTimeBetween('-14 days', '-7 days'),
            'resolved_at' => fake()->dateTimeBetween('-7 days'),
            'resolution_type' => fake()->randomElement(['manual', 'auto', 'dismissed']),
        ]);
    }
}
