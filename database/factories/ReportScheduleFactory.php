<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\ReportSchedule;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ReportSchedule>
 */
class ReportScheduleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'org_id' => Organization::factory(),
            'site_id' => fake()->optional(0.7)->passthrough(Site::factory()),
            'type' => fake()->randomElement(ReportSchedule::TYPES),
            'frequency' => fake()->randomElement(['daily', 'weekly', 'monthly']),
            'day_of_week' => fn (array $attrs) => $attrs['frequency'] === 'weekly' ? fake()->numberBetween(0, 6) : null,
            'time' => fake()->randomElement(['06:00', '07:00', '08:00', '09:00']),
            'recipients_json' => fn () => [fake()->safeEmail(), fake()->optional(0.5)->safeEmail()],
            'active' => true,
            'created_by' => User::factory(),
        ];
    }

    public function weekly(): static
    {
        return $this->state(fn () => [
            'frequency' => 'weekly',
            'day_of_week' => 1, // Monday
            'time' => '08:00',
        ]);
    }

    public function temperatureCompliance(): static
    {
        return $this->state(fn () => [
            'type' => 'temperature_compliance',
        ]);
    }
}
