<?php

namespace Database\Factories;

use App\Models\BillingProfile;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Invoice>
 */
class InvoiceFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 1000, 50000);
        $iva = round($subtotal * 0.16, 2);

        return [
            'org_id' => Organization::factory(),
            'billing_profile_id' => BillingProfile::factory(),
            'period' => fake()->dateTimeBetween('-6 months')->format('Y-m'),
            'subtotal' => $subtotal,
            'iva' => $iva,
            'total' => round($subtotal + $iva, 2),
            'status' => fake()->randomElement(['draft', 'issued', 'paid', 'overdue', 'cancelled']),
            'cfdi_uuid' => fake()->optional(0.5)->uuid(),
            'cfdi_api_id' => fake()->optional(0.5)->uuid(),
            'pdf_path' => fake()->optional(0.5)->filePath(),
            'xml_path' => fake()->optional(0.5)->filePath(),
            'paid_at' => fake()->optional(0.4)->dateTimeBetween('-3 months'),
            'payment_method' => fake()->optional(0.4)->randomElement(['transfer', 'card', 'cash', 'check']),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'draft',
            'cfdi_uuid' => null,
            'paid_at' => null,
        ]);
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'paid',
            'paid_at' => fake()->dateTimeBetween('-3 months'),
            'payment_method' => fake()->randomElement(['transfer', 'card']),
        ]);
    }

    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'overdue',
            'paid_at' => null,
        ]);
    }
}
