<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ComplianceEvent>
 */
class ComplianceEventFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'org_id' => Organization::factory(),
            'type' => fake()->randomElement(['cofepris_audit', 'certificate_renewal', 'calibration', 'inspection', 'permit_renewal']),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'due_date' => fake()->dateTimeBetween('now', '+6 months'),
            'status' => 'upcoming',
            'completed_at' => null,
            'completed_by' => null,
            'reminders_sent' => [],
        ];
    }

    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'due_date' => fake()->dateTimeBetween('-30 days', '-1 day'),
            'status' => 'overdue',
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'completed_at' => now(),
            'completed_by' => fake()->name(),
        ]);
    }

    public function dueIn(int $days): static
    {
        return $this->state(fn (array $attributes) => [
            'due_date' => now()->addDays($days),
            'status' => 'upcoming',
        ]);
    }
}
