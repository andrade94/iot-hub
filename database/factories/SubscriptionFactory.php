<?php

namespace Database\Factories;

use App\Models\BillingProfile;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Subscription>
 */
class SubscriptionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'org_id' => Organization::factory(),
            'billing_profile_id' => BillingProfile::factory(),
            'base_fee' => fake()->randomFloat(2, 500, 10000),
            'discount_pct' => fake()->randomFloat(2, 0, 30),
            'status' => fake()->randomElement(['active', 'paused', 'cancelled', 'trial']),
            'started_at' => fake()->dateTimeBetween('-1 year'),
            'contract_type' => fake()->randomElement(['monthly', 'annual', 'biannual']),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }

    public function trial(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'trial',
            'started_at' => now()->subDays(fake()->numberBetween(1, 14)),
        ]);
    }
}
