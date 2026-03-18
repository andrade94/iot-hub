<?php

namespace Database\Factories;

use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Recipe>
 */
class RecipeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'module_id' => Module::factory(),
            'sensor_model' => fake()->randomElement(['LHT65N', 'EM300-TH', 'EM500-CO2', 'VS121', 'AM319']),
            'name' => fake()->words(3, true) . ' recipe',
            'default_rules' => [
                [
                    'metric' => 'temperature',
                    'condition' => 'above',
                    'threshold' => 8,
                    'severity' => 'warning',
                ],
                [
                    'metric' => 'temperature',
                    'condition' => 'above',
                    'threshold' => 12,
                    'severity' => 'critical',
                ],
            ],
            'description' => fake()->sentence(),
            'editable' => fake()->boolean(70),
        ];
    }

    public function editable(): static
    {
        return $this->state(fn (array $attributes) => [
            'editable' => true,
        ]);
    }

    public function readonly(): static
    {
        return $this->state(fn (array $attributes) => [
            'editable' => false,
        ]);
    }
}
