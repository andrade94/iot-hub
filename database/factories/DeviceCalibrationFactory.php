<?php

namespace Database\Factories;

use App\Models\Device;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DeviceCalibrationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'device_id' => Device::factory(),
            'calibrated_at' => now()->subMonths(6),
            'expires_at' => now()->addMonths(6),
            'calibrated_by' => $this->faker->name(),
            'method' => 'comparison',
            'notes' => 'Verified against CENAM-traceable reference',
            'uploaded_by' => User::factory(),
        ];
    }

    public function expired(): static
    {
        return $this->state(fn () => [
            'calibrated_at' => now()->subMonths(14),
            'expires_at' => now()->subMonths(2),
        ]);
    }

    public function expiringSoon(): static
    {
        return $this->state(fn () => [
            'calibrated_at' => now()->subMonths(10),
            'expires_at' => now()->addDays(15),
        ]);
    }
}
