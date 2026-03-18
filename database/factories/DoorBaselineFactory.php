<?php

namespace Database\Factories;

use App\Models\Device;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DoorBaseline>
 */
class DoorBaselineFactory extends Factory
{
    public function definition(): array
    {
        return [
            'device_id' => Device::factory(),
            'day_of_week' => fake()->numberBetween(0, 6),
            'hour' => fake()->numberBetween(0, 23),
            'avg_opens' => fake()->randomFloat(2, 0, 50),
            'avg_duration' => fake()->randomFloat(2, 1, 30),
            'std_dev_opens' => fake()->randomFloat(2, 0, 10),
        ];
    }
}
