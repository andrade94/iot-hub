<?php

namespace Database\Seeders;

use App\Models\Segment;
use Illuminate\Database\Seeder;

class SegmentSeeder extends Seeder
{
    public function run(): void
    {
        $segments = [
            [
                'name' => 'cold_chain',
                'label' => 'Cold Chain',
                'description' => 'Cold chain monitoring: temperature sensors for coolers/freezers, door sensors for access control, COFEPRIS compliance.',
                'suggested_modules' => ['cold_chain', 'compliance', 'safety'],
                'suggested_sensor_models' => ['EM300-TH', 'WS301'],
                'icon' => 'Thermometer',
                'color' => 'blue',
            ],
            [
                'name' => 'energy',
                'label' => 'Energy',
                'description' => 'Energy monitoring: current transformers on circuits for consumption tracking and cost analysis.',
                'suggested_modules' => ['energy'],
                'suggested_sensor_models' => ['CT101'],
                'icon' => 'Zap',
                'color' => 'yellow',
            ],
            [
                'name' => 'industrial',
                'label' => 'Industrial',
                'description' => 'Industrial monitoring: vibration, pressure, compressed air, and energy for production equipment.',
                'suggested_modules' => ['industrial', 'energy', 'safety'],
                'suggested_sensor_models' => ['CT101', 'EM310-UDL', 'EM300-PT'],
                'icon' => 'Factory',
                'color' => 'orange',
            ],
            [
                'name' => 'commercial',
                'label' => 'Commercial',
                'description' => 'Commercial buildings: indoor air quality, energy efficiency, and occupancy tracking.',
                'suggested_modules' => ['iaq', 'energy', 'people'],
                'suggested_sensor_models' => ['AM307', 'CT101', 'VS121'],
                'icon' => 'Building2',
                'color' => 'purple',
            ],
            [
                'name' => 'foodservice',
                'label' => 'Foodservice',
                'description' => 'Food service: temperature monitoring, gas leak detection, door monitoring, and energy tracking.',
                'suggested_modules' => ['cold_chain', 'compliance', 'safety', 'energy'],
                'suggested_sensor_models' => ['EM300-TH', 'WS301', 'CT101', 'GS101'],
                'icon' => 'UtensilsCrossed',
                'color' => 'green',
            ],
        ];

        foreach ($segments as $segment) {
            Segment::updateOrCreate(
                ['name' => $segment['name']],
                $segment,
            );
        }
    }
}
