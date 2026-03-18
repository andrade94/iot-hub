<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\IntegrationConfig>
 */
class IntegrationConfigFactory extends Factory
{
    public function definition(): array
    {
        return [
            'org_id' => Organization::factory(),
            'type' => fake()->randomElement(['chirpstack', 'erp_export', 'sftp', 'api_sync']),
            'config' => [
                'host' => fake()->domainName(),
                'port' => fake()->randomElement([22, 443, 8080]),
                'username' => fake()->userName(),
            ],
            'schedule_cron' => fake()->optional(0.5)->randomElement(['0 * * * *', '0 0 * * *', '0 6 * * 1']),
            'last_export_at' => fake()->optional(0.4)->dateTimeBetween('-30 days'),
            'active' => fake()->boolean(70),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => true,
        ]);
    }
}
