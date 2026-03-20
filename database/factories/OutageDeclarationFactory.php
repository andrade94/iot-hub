<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\OutageDeclaration>
 */
class OutageDeclarationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'reason' => fake()->randomElement([
                'ChirpStack Cloud experiencing degraded performance — device data delayed',
                'Twilio API rate limited — WhatsApp alerts may be delayed up to 15 minutes',
                'MQTT broker restart for maintenance — expect 5 minute data gap',
                'ISP outage affecting LoRaWAN gateways in Monterrey region',
                'Scheduled infrastructure upgrade — monitoring temporarily reduced',
            ]),
            'affected_services' => fake()->randomElements(['chirpstack', 'twilio', 'mqtt', 'redis', 'database'], fake()->numberBetween(1, 3)),
            'status' => 'resolved',
            'declared_by' => User::factory(),
            'declared_at' => fake()->dateTimeBetween('-30 days', '-1 day'),
            'resolved_by' => User::factory(),
            'resolved_at' => fn (array $attrs) => fake()->dateTimeBetween($attrs['declared_at'], now()),
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'status' => 'active',
            'declared_at' => now()->subMinutes(fake()->numberBetween(5, 120)),
            'resolved_by' => null,
            'resolved_at' => null,
        ]);
    }
}
