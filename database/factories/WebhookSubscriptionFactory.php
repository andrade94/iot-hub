<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WebhookSubscription>
 */
class WebhookSubscriptionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'org_id' => Organization::factory(),
            'url' => fake()->url() . '/webhook',
            'events' => fake()->randomElements(
                ['alert.created', 'alert.resolved', 'device.offline', 'reading.threshold', 'work_order.created'],
                fake()->numberBetween(1, 5)
            ),
            'secret' => Str::random(32),
            'active' => fake()->boolean(80),
            'last_triggered_at' => fake()->optional(0.5)->dateTimeBetween('-30 days'),
            'failure_count' => fake()->numberBetween(0, 5),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => true,
            'failure_count' => 0,
        ]);
    }

    public function failing(): static
    {
        return $this->state(fn (array $attributes) => [
            'failure_count' => fake()->numberBetween(3, 10),
        ]);
    }
}
