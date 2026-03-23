<?php

namespace Database\Factories;

use App\Models\Alert;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AlertSnoozeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'alert_id' => Alert::factory(),
            'user_id' => User::factory(),
            'expires_at' => now()->addHours(2),
        ];
    }

    public function expired(): static
    {
        return $this->state(fn () => [
            'expires_at' => now()->subMinutes(5),
        ]);
    }
}
