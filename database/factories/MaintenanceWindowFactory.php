<?php

namespace Database\Factories;

use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MaintenanceWindow>
 */
class MaintenanceWindowFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'zone' => fake()->optional(0.6)->randomElement(['Walk-in Cooler', 'Display Case', 'Prep Area', 'Storage Room']),
            'title' => fake()->randomElement([
                'Walk-in cooler cleaning',
                'Display case defrost test',
                'Compressor maintenance',
                'Weekly deep clean',
                'Monthly calibration check',
                'HVAC filter replacement',
            ]),
            'recurrence' => fake()->randomElement(['once', 'daily', 'weekly', 'monthly']),
            'day_of_week' => fn (array $attrs) => $attrs['recurrence'] === 'weekly' ? fake()->numberBetween(0, 6) : null,
            'start_time' => fake()->randomElement(['06:00', '10:00', '14:00', '18:00', '22:00']),
            'duration_minutes' => fake()->randomElement([30, 60, 90, 120, 180]),
            'suppress_alerts' => true,
            'created_by' => User::factory(),
        ];
    }

    public function weekly(): static
    {
        return $this->state(fn () => [
            'recurrence' => 'weekly',
            'day_of_week' => fake()->numberBetween(0, 6),
        ]);
    }

    public function daily(): static
    {
        return $this->state(fn () => [
            'recurrence' => 'daily',
            'day_of_week' => null,
        ]);
    }
}
