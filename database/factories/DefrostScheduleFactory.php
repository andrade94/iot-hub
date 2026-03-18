<?php

namespace Database\Factories;

use App\Models\Device;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DefrostSchedule>
 */
class DefrostScheduleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'device_id' => Device::factory(),
            'site_id' => Site::factory(),
            'status' => fake()->randomElement(['detected', 'confirmed', 'rejected']),
            'windows' => [
                [
                    'start' => '02:00',
                    'end' => '02:45',
                    'confidence' => fake()->randomFloat(2, 0.7, 1.0),
                ],
                [
                    'start' => '14:00',
                    'end' => '14:30',
                    'confidence' => fake()->randomFloat(2, 0.7, 1.0),
                ],
            ],
            'detected_at' => fake()->dateTimeBetween('-14 days'),
            'confirmed_by' => null,
            'confirmed_at' => null,
        ];
    }

    public function detected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'detected',
            'confirmed_by' => null,
            'confirmed_at' => null,
        ]);
    }

    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'confirmed',
            'confirmed_by' => User::factory(),
            'confirmed_at' => fake()->dateTimeBetween('-7 days'),
        ]);
    }
}
