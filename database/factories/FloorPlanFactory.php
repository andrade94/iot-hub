<?php

namespace Database\Factories;

use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\FloorPlan>
 */
class FloorPlanFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'name' => fake()->randomElement(['Ground Floor', 'First Floor', 'Basement', 'Mezzanine', 'Rooftop']),
            'floor_number' => fake()->numberBetween(0, 5),
            'image_path' => 'floor-plans/' . fake()->uuid() . '.png',
            'width_px' => fake()->randomElement([1200, 1600, 1920, 2400]),
            'height_px' => fake()->randomElement([800, 1000, 1080, 1600]),
        ];
    }
}
