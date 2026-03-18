<?php

namespace Database\Factories;

use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\IaqZoneScore>
 */
class IaqZoneScoreFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'zone' => fake()->randomElement(['kitchen', 'dining', 'storage', 'office', 'entrance', 'warehouse']),
            'date' => fake()->dateTimeBetween('-30 days'),
            'avg_co2' => fake()->randomFloat(2, 350, 1500),
            'avg_temp' => fake()->randomFloat(2, 18, 30),
            'avg_humidity' => fake()->randomFloat(2, 25, 75),
            'avg_tvoc' => fake()->randomFloat(2, 0, 500),
            'comfort_score' => fake()->randomFloat(2, 0, 100),
        ];
    }

    public function good(): static
    {
        return $this->state(fn (array $attributes) => [
            'comfort_score' => fake()->randomFloat(2, 75, 100),
            'avg_co2' => fake()->randomFloat(2, 350, 600),
        ]);
    }

    public function poor(): static
    {
        return $this->state(fn (array $attributes) => [
            'comfort_score' => fake()->randomFloat(2, 0, 30),
            'avg_co2' => fake()->randomFloat(2, 1000, 1500),
        ]);
    }
}
