<?php

namespace Database\Factories;

use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TrafficSnapshot>
 */
class TrafficSnapshotFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'zone' => fake()->randomElement(['entrance', 'checkout', 'aisle_1', 'aisle_2', 'deli', 'produce']),
            'date' => fake()->dateTimeBetween('-30 days'),
            'hour' => fake()->numberBetween(0, 23),
            'occupancy_avg' => fake()->randomFloat(2, 0, 200),
            'occupancy_peak' => fake()->numberBetween(0, 300),
        ];
    }
}
