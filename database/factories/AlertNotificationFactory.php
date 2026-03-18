<?php

namespace Database\Factories;

use App\Models\Alert;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AlertNotification>
 */
class AlertNotificationFactory extends Factory
{
    public function definition(): array
    {
        $sentAt = fake()->dateTimeBetween('-30 days');

        return [
            'alert_id' => Alert::factory(),
            'user_id' => User::factory(),
            'channel' => fake()->randomElement(['email', 'push', 'sms', 'whatsapp']),
            'status' => fake()->randomElement(['pending', 'sent', 'delivered', 'failed']),
            'sent_at' => $sentAt,
            'delivered_at' => fake()->optional(0.7)->dateTimeBetween($sentAt),
            'error' => null,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'sent_at' => null,
            'delivered_at' => null,
        ]);
    }

    public function sent(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'sent',
            'sent_at' => fake()->dateTimeBetween('-30 days'),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'failed',
            'error' => fake()->sentence(),
        ]);
    }
}
