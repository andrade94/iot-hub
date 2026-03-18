<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Module>
 */
class ModuleFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->randomElement([
            'Cold Chain Monitoring',
            'Indoor Air Quality',
            'People Counting',
            'Energy Monitoring',
            'Predictive Maintenance',
            'Door Monitoring',
            'Defrost Detection',
            'Compressor Analytics',
        ]);

        return [
            'name' => $name,
            'slug' => str($name)->slug()->toString(),
            'description' => fake()->sentence(),
        ];
    }
}
