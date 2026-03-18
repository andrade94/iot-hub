<?php

namespace Database\Factories;

use App\Models\Module;
use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SiteModule>
 */
class SiteModuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'site_id' => Site::factory(),
            'module_id' => Module::factory(),
            'activated_at' => fake()->dateTimeBetween('-6 months'),
            'config' => [],
        ];
    }
}
