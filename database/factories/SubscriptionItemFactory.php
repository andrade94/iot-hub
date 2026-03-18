<?php

namespace Database\Factories;

use App\Models\Device;
use App\Models\Subscription;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SubscriptionItem>
 */
class SubscriptionItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'subscription_id' => Subscription::factory(),
            'device_id' => Device::factory(),
            'sensor_model' => fake()->randomElement(['LHT65N', 'EM300-TH', 'EM500-CO2', 'VS121', 'AM319']),
            'monthly_fee' => fake()->randomFloat(2, 50, 500),
        ];
    }
}
