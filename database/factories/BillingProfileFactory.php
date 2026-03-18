<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\BillingProfile>
 */
class BillingProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'org_id' => Organization::factory(),
            'name' => fake()->company() . ' Billing',
            'rfc' => strtoupper(fake()->bothify('????######???')),
            'razon_social' => fake()->company() . ' S.A. de C.V.',
            'regimen_fiscal' => fake()->randomElement(['601', '603', '606', '612', '620', '621', '625', '626']),
            'direccion_fiscal' => [
                'calle' => fake()->streetAddress(),
                'colonia' => fake()->citySuffix(),
                'municipio' => fake()->city(),
                'estado' => fake()->state(),
                'cp' => fake()->postcode(),
                'pais' => 'México',
            ],
            'uso_cfdi' => fake()->randomElement(['G01', 'G03', 'P01']),
            'email_facturacion' => fake()->companyEmail(),
            'is_default' => fake()->boolean(30),
        ];
    }

    public function default(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_default' => true,
        ]);
    }
}
