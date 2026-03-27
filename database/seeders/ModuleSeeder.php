<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        $modules = [
            [
                'slug' => 'cold_chain',
                'name' => 'Cold Chain',
                'description' => 'Temperature monitoring for refrigeration, freezers, and cold storage. HACCP/COFEPRIS compliance.',
                'monthly_fee' => 200,
                'required_sensor_models' => ['EM300-TH', 'WS301'],
                'report_types' => ['temperature'],
                'color' => '#0891b2',
                'sort_order' => 1,
            ],
            [
                'slug' => 'energy',
                'name' => 'Energy',
                'description' => 'Electrical consumption monitoring, baseline analysis, cost calculation, and anomaly detection.',
                'monthly_fee' => 150,
                'required_sensor_models' => ['CT101'],
                'report_types' => ['energy'],
                'color' => '#d97706',
                'sort_order' => 2,
            ],
            [
                'slug' => 'compliance',
                'name' => 'Compliance',
                'description' => 'Continuous temperature logging, excursion reports, and audit-ready documentation.',
                'monthly_fee' => 100,
                'required_sensor_models' => ['EM300-TH'],
                'report_types' => ['temperature'],
                'color' => '#059669',
                'sort_order' => 3,
            ],
            [
                'slug' => 'industrial',
                'name' => 'Industrial',
                'description' => 'Vibration analysis, compressed air monitoring, and production line status tracking.',
                'monthly_fee' => 250,
                'required_sensor_models' => ['CT101', 'EM310-UDL'],
                'report_types' => ['energy'],
                'color' => '#7c3aed',
                'sort_order' => 4,
            ],
            [
                'slug' => 'iaq',
                'name' => 'Indoor Air Quality',
                'description' => 'CO2, temperature, humidity, and TVOC monitoring. LEED/WELL scoring.',
                'monthly_fee' => 175,
                'required_sensor_models' => ['AM307'],
                'report_types' => [],
                'color' => '#2563eb',
                'sort_order' => 5,
            ],
            [
                'slug' => 'safety',
                'name' => 'Safety',
                'description' => 'Gas leak detection, door/window monitoring, and environmental hazard alerts.',
                'monthly_fee' => 125,
                'required_sensor_models' => ['GS101', 'WS301'],
                'report_types' => [],
                'color' => '#dc2626',
                'sort_order' => 6,
            ],
            [
                'slug' => 'people',
                'name' => 'People & Flow',
                'description' => 'Occupancy tracking, traffic patterns, and staffing recommendations.',
                'monthly_fee' => 150,
                'required_sensor_models' => ['VS121'],
                'report_types' => [],
                'color' => '#8b5cf6',
                'sort_order' => 7,
            ],
        ];

        foreach ($modules as $module) {
            Module::updateOrCreate(
                ['slug' => $module['slug']],
                $module,
            );
        }

        $this->command->info('Created/updated 7 IoT modules with catalog fields');
    }
}
