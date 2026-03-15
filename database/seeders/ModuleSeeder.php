<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        $modules = [
            ['slug' => 'cold_chain', 'name' => 'Cold Chain', 'description' => 'Temperature monitoring for refrigeration, freezers, and cold storage. HACCP/COFEPRIS compliance.'],
            ['slug' => 'energy', 'name' => 'Energy', 'description' => 'Electrical consumption monitoring, baseline analysis, cost calculation, and anomaly detection.'],
            ['slug' => 'compliance', 'name' => 'Compliance', 'description' => 'Continuous temperature logging, excursion reports, and audit-ready documentation.'],
            ['slug' => 'industrial', 'name' => 'Industrial', 'description' => 'Vibration analysis, compressed air monitoring, and production line status tracking.'],
            ['slug' => 'iaq', 'name' => 'Indoor Air Quality', 'description' => 'CO2, temperature, humidity, and TVOC monitoring. LEED/WELL scoring.'],
            ['slug' => 'safety', 'name' => 'Safety', 'description' => 'Gas leak detection, door/window monitoring, and environmental hazard alerts.'],
            ['slug' => 'people', 'name' => 'People & Flow', 'description' => 'Occupancy tracking, traffic patterns, and staffing recommendations.'],
        ];

        foreach ($modules as $module) {
            Module::firstOrCreate(['slug' => $module['slug']], $module);
        }

        $this->command->info('Created 7 IoT modules');
    }
}
