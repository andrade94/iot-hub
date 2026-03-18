<?php

namespace Database\Factories;

use App\Models\Device;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SensorReading>
 */
class SensorReadingFactory extends Factory
{
    public function definition(): array
    {
        $metrics = [
            ['metric' => 'temperature', 'unit' => '°C', 'min' => -30, 'max' => 50],
            ['metric' => 'humidity', 'unit' => '%', 'min' => 10, 'max' => 99],
            ['metric' => 'co2', 'unit' => 'ppm', 'min' => 300, 'max' => 2000],
            ['metric' => 'battery', 'unit' => '%', 'min' => 0, 'max' => 100],
            ['metric' => 'door_open', 'unit' => 'bool', 'min' => 0, 'max' => 1],
        ];

        $selected = fake()->randomElement($metrics);

        return [
            'device_id' => Device::factory(),
            'metric' => $selected['metric'],
            'value' => fake()->randomFloat(2, $selected['min'], $selected['max']),
            'unit' => $selected['unit'],
            'time' => fake()->dateTimeBetween('-7 days'),
        ];
    }

    public function temperature(): static
    {
        return $this->state(fn (array $attributes) => [
            'metric' => 'temperature',
            'value' => fake()->randomFloat(2, -30, 50),
            'unit' => '°C',
        ]);
    }

    public function humidity(): static
    {
        return $this->state(fn (array $attributes) => [
            'metric' => 'humidity',
            'value' => fake()->randomFloat(2, 10, 99),
            'unit' => '%',
        ]);
    }

    public function co2(): static
    {
        return $this->state(fn (array $attributes) => [
            'metric' => 'co2',
            'value' => fake()->randomFloat(0, 300, 2000),
            'unit' => 'ppm',
        ]);
    }
}
