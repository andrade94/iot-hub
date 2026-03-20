<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DataExport>
 */
class DataExportFactory extends Factory
{
    public function definition(): array
    {
        return [
            'org_id' => Organization::factory(),
            'status' => 'completed',
            'date_from' => fake()->dateTimeBetween('-6 months', '-3 months'),
            'date_to' => fake()->dateTimeBetween('-1 month'),
            'file_path' => null,
            'file_size' => fake()->numberBetween(1024 * 100, 1024 * 1024 * 50),
            'attempts' => 1,
            'error' => null,
            'completed_at' => fake()->dateTimeBetween('-7 days'),
            'expires_at' => fn (array $attrs) => $attrs['completed_at'] ? now()->addHours(48) : null,
            'requested_by' => User::factory(),
        ];
    }

    public function queued(): static
    {
        return $this->state(fn () => [
            'status' => 'queued',
            'file_path' => null,
            'file_size' => null,
            'completed_at' => null,
            'expires_at' => null,
            'attempts' => 0,
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn () => [
            'status' => 'failed',
            'error' => 'Disk space exceeded during ZIP generation',
            'file_path' => null,
            'file_size' => null,
            'completed_at' => null,
        ]);
    }
}
