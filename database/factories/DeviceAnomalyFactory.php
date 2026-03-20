<?php

namespace Database\Factories;

use App\Models\Device;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DeviceAnomaly>
 */
class DeviceAnomalyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'device_id' => Device::factory(),
            'metric' => fake()->randomElement(['temperature', 'humidity', 'co2']),
            'value' => fake()->randomFloat(1, 100, 999),
            'valid_min' => -40,
            'valid_max' => 85,
            'unit' => '°C',
            'recorded_at' => fake()->dateTimeBetween('-7 days'),
            'created_at' => now(),
        ];
    }
}
