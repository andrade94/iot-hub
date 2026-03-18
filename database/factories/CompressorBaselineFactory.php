<?php

namespace Database\Factories;

use App\Models\Device;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CompressorBaseline>
 */
class CompressorBaselineFactory extends Factory
{
    public function definition(): array
    {
        return [
            'device_id' => Device::factory(),
            'date' => fake()->dateTimeBetween('-30 days'),
            'duty_cycle_pct' => fake()->randomFloat(2, 20, 80),
            'on_count' => fake()->numberBetween(10, 200),
            'avg_on_duration' => fake()->randomFloat(2, 5, 60),
            'avg_off_duration' => fake()->randomFloat(2, 5, 90),
            'degradation_score' => fake()->randomFloat(2, 0, 100),
        ];
    }

    public function healthy(): static
    {
        return $this->state(fn (array $attributes) => [
            'degradation_score' => fake()->randomFloat(2, 0, 30),
            'duty_cycle_pct' => fake()->randomFloat(2, 30, 50),
        ]);
    }

    public function degraded(): static
    {
        return $this->state(fn (array $attributes) => [
            'degradation_score' => fake()->randomFloat(2, 70, 100),
            'duty_cycle_pct' => fake()->randomFloat(2, 70, 95),
        ]);
    }
}
