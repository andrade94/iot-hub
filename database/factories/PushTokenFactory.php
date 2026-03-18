<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PushToken>
 */
class PushTokenFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'token' => 'ExponentPushToken[' . fake()->regexify('[A-Za-z0-9]{22}') . ']',
            'device_name' => fake()->randomElement(['iPhone 15', 'iPhone 14 Pro', 'Samsung Galaxy S24', 'Pixel 8', 'iPad Pro']),
            'platform' => fake()->randomElement(['ios', 'android']),
        ];
    }

    public function ios(): static
    {
        return $this->state(fn (array $attributes) => [
            'platform' => 'ios',
            'device_name' => fake()->randomElement(['iPhone 15', 'iPhone 14 Pro', 'iPad Pro']),
        ]);
    }

    public function android(): static
    {
        return $this->state(fn (array $attributes) => [
            'platform' => 'android',
            'device_name' => fake()->randomElement(['Samsung Galaxy S24', 'Pixel 8', 'OnePlus 12']),
        ]);
    }
}
