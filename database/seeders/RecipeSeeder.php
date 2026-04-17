<?php

namespace Database\Seeders;

use App\Models\Module;
use App\Models\Recipe;
use Illuminate\Database\Seeder;

class RecipeSeeder extends Seeder
{
    public function run(): void
    {
        $coldChain = Module::where('slug', 'cold_chain')->first();
        $energy = Module::where('slug', 'energy')->first();
        $safety = Module::where('slug', 'safety')->first();
        $iaq = Module::where('slug', 'iaq')->first();
        $industrial = Module::where('slug', 'industrial')->first();

        $recipes = [
            // Cold Chain recipes
            [
                'module_id' => $coldChain->id,
                'sensor_model' => 'EM300-TH',
                'name' => 'Walk-in Cooler',
                'name_es' => 'Enfriador Walk-in',
                'description' => 'Standard walk-in cooler monitoring (2-8°C)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 10, 'severity' => 'high'],
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => 0, 'duration_minutes' => 10, 'severity' => 'high'],
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 85, 'duration_minutes' => 30, 'severity' => 'medium'],
                ],
            ],
            [
                'module_id' => $coldChain->id,
                'sensor_model' => 'EM300-TH',
                'name' => 'Freezer',
                'name_es' => 'Congelador',
                'description' => 'Freezer monitoring (-18 to -22°C)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => -15, 'duration_minutes' => 10, 'severity' => 'critical'],
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => -25, 'duration_minutes' => 15, 'severity' => 'medium'],
                ],
            ],
            [
                'module_id' => $coldChain->id,
                'sensor_model' => 'EM300-TH',
                'name' => 'Display Case (Vitrina)',
                'name_es' => 'Vitrina Refrigerada',
                'description' => 'Refrigerated display case (2-6°C)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 6, 'duration_minutes' => 5, 'severity' => 'high'],
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => 0, 'duration_minutes' => 10, 'severity' => 'medium'],
                ],
            ],
            [
                'module_id' => $coldChain->id,
                'sensor_model' => 'EM300-TH',
                'name' => 'Dry Storage',
                'name_es' => 'Almacén Seco',
                'description' => 'Dry storage area (15-25°C, humidity < 60%)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 25, 'duration_minutes' => 30, 'severity' => 'medium'],
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 60, 'duration_minutes' => 30, 'severity' => 'medium'],
                ],
            ],
            [
                'module_id' => $coldChain->id,
                'sensor_model' => 'EM300-TH',
                'name' => 'Meat Refrigerator',
                'name_es' => 'Refrigerador de Carnes',
                'description' => 'Meat cold storage per COFEPRIS/FDA (0-4°C)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 4, 'duration_minutes' => 10, 'severity' => 'critical'],
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => -2, 'duration_minutes' => 10, 'severity' => 'high'],
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 90, 'duration_minutes' => 30, 'severity' => 'medium'],
                ],
            ],
            [
                'module_id' => $coldChain->id,
                'sensor_model' => 'EM300-TH',
                'name' => 'Dairy Refrigerator',
                'name_es' => 'Refrigerador de Lácteos',
                'description' => 'Dairy products cold storage (2-4°C)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 4, 'duration_minutes' => 10, 'severity' => 'critical'],
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => 0, 'duration_minutes' => 10, 'severity' => 'high'],
                ],
            ],
            [
                'module_id' => $coldChain->id,
                'sensor_model' => 'EM300-TH',
                'name' => 'Produce Refrigerator',
                'name_es' => 'Refrigerador de Frutas y Verduras',
                'description' => 'Fruits and vegetables storage (7-10°C)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 10, 'duration_minutes' => 15, 'severity' => 'high'],
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => 2, 'duration_minutes' => 15, 'severity' => 'medium'],
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 95, 'duration_minutes' => 30, 'severity' => 'low'],
                ],
            ],
            [
                'module_id' => $coldChain->id,
                'sensor_model' => 'EM300-TH',
                'name' => 'Pharmacy Refrigerator',
                'name_es' => 'Refrigerador Farmacéutico',
                'description' => 'Vaccine and medicine storage per NOM-059 (2-8°C)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'critical'],
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => 2, 'duration_minutes' => 5, 'severity' => 'critical'],
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 80, 'duration_minutes' => 15, 'severity' => 'high'],
                ],
            ],
            [
                'module_id' => $coldChain->id,
                'sensor_model' => 'EM300-TH',
                'name' => 'Kitchen / Prep Area',
                'name_es' => 'Cocina / Área de Preparación',
                'description' => 'Food preparation area (15-21°C)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 25, 'duration_minutes' => 30, 'severity' => 'medium'],
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 80, 'duration_minutes' => 30, 'severity' => 'low'],
                ],
            ],
            [
                'module_id' => $coldChain->id,
                'sensor_model' => 'EM300-TH',
                'name' => 'Warehouse',
                'name_es' => 'Almacén',
                'description' => 'General warehouse ambient monitoring (10-30°C)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 35, 'duration_minutes' => 30, 'severity' => 'medium'],
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 70, 'duration_minutes' => 60, 'severity' => 'low'],
                ],
            ],

            // IAQ — additional
            [
                'module_id' => $iaq->id,
                'sensor_model' => 'AM307',
                'name' => 'Server Room',
                'name_es' => 'Cuarto de Servidores',
                'description' => 'IT equipment room (18-27°C, humidity 40-60%)',
                'default_rules' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 27, 'duration_minutes' => 5, 'severity' => 'critical'],
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => 18, 'duration_minutes' => 10, 'severity' => 'high'],
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 60, 'duration_minutes' => 15, 'severity' => 'high'],
                    ['metric' => 'humidity', 'condition' => 'below', 'threshold' => 40, 'duration_minutes' => 15, 'severity' => 'medium'],
                ],
            ],

            // Energy recipes
            [
                'module_id' => $energy->id,
                'sensor_model' => 'CT101',
                'name' => 'Compressor Circuit',
                'name_es' => 'Circuito de Compresor',
                'description' => 'Compressor current monitoring for efficiency and anomaly detection',
                'default_rules' => [
                    ['metric' => 'current', 'condition' => 'above', 'threshold' => 30, 'duration_minutes' => 5, 'severity' => 'high'],
                    ['metric' => 'current', 'condition' => 'above', 'threshold' => 25, 'duration_minutes' => 15, 'severity' => 'medium'],
                ],
            ],
            [
                'module_id' => $energy->id,
                'sensor_model' => 'CT101',
                'name' => 'General Circuit',
                'name_es' => 'Circuito General',
                'description' => 'General electrical circuit monitoring',
                'default_rules' => [
                    ['metric' => 'current', 'condition' => 'above', 'threshold' => 50, 'duration_minutes' => 5, 'severity' => 'high'],
                ],
            ],
            [
                'module_id' => $energy->id,
                'sensor_model' => 'CT101',
                'name' => 'Lighting Circuit',
                'name_es' => 'Circuito de Iluminación',
                'description' => 'Lighting circuit for night waste detection',
                'default_rules' => [
                    ['metric' => 'current', 'condition' => 'above', 'threshold' => 5, 'duration_minutes' => 60, 'severity' => 'low'],
                ],
            ],

            // Safety recipes
            [
                'module_id' => $safety->id,
                'sensor_model' => 'WS301',
                'name' => 'Cold Room Door',
                'name_es' => 'Puerta de Cuarto Frío',
                'description' => 'Door open/close monitoring for cold rooms',
                'default_rules' => [
                    ['metric' => 'door_status', 'condition' => 'equals', 'threshold' => 1, 'duration_minutes' => 5, 'severity' => 'high'],
                    ['metric' => 'door_status', 'condition' => 'equals', 'threshold' => 1, 'duration_minutes' => 15, 'severity' => 'critical'],
                ],
            ],
            [
                'module_id' => $safety->id,
                'sensor_model' => 'WS301',
                'name' => 'Security Door',
                'name_es' => 'Puerta de Seguridad',
                'description' => 'Security entrance monitoring',
                'default_rules' => [
                    ['metric' => 'door_status', 'condition' => 'equals', 'threshold' => 1, 'duration_minutes' => 10, 'severity' => 'medium'],
                ],
            ],
            [
                'module_id' => $safety->id,
                'sensor_model' => 'GS101',
                'name' => 'Gas Leak Detector',
                'name_es' => 'Detector de Fuga de Gas',
                'description' => 'Gas leak detection and alarm',
                'default_rules' => [
                    ['metric' => 'gas_alarm', 'condition' => 'equals', 'threshold' => 1, 'duration_minutes' => 0, 'severity' => 'critical'],
                    ['metric' => 'gas_concentration', 'condition' => 'above', 'threshold' => 500, 'duration_minutes' => 5, 'severity' => 'high'],
                ],
            ],

            // IAQ recipes
            [
                'module_id' => $iaq->id,
                'sensor_model' => 'AM307',
                'name' => 'Office Space',
                'name_es' => 'Espacio de Oficina',
                'description' => 'Office indoor air quality monitoring',
                'default_rules' => [
                    ['metric' => 'co2', 'condition' => 'above', 'threshold' => 1000, 'duration_minutes' => 15, 'severity' => 'medium'],
                    ['metric' => 'co2', 'condition' => 'above', 'threshold' => 1500, 'duration_minutes' => 5, 'severity' => 'high'],
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 28, 'duration_minutes' => 15, 'severity' => 'low'],
                ],
            ],

            // Industrial recipes
            [
                'module_id' => $industrial->id,
                'sensor_model' => 'EM300-PT',
                'name' => 'Compressed Air',
                'name_es' => 'Aire Comprimido',
                'description' => 'Compressed air pressure monitoring',
                'default_rules' => [
                    ['metric' => 'pressure', 'condition' => 'below', 'threshold' => 600, 'duration_minutes' => 5, 'severity' => 'high'],
                    ['metric' => 'pressure', 'condition' => 'above', 'threshold' => 1000, 'duration_minutes' => 5, 'severity' => 'critical'],
                ],
            ],
            [
                'module_id' => $industrial->id,
                'sensor_model' => 'EM310-UDL',
                'name' => 'Tank Level',
                'name_es' => 'Nivel de Tanque',
                'description' => 'Ultrasonic tank/silo level monitoring',
                'default_rules' => [
                    ['metric' => 'distance', 'condition' => 'above', 'threshold' => 2000, 'duration_minutes' => 30, 'severity' => 'medium'],
                    ['metric' => 'distance', 'condition' => 'above', 'threshold' => 2500, 'duration_minutes' => 10, 'severity' => 'high'],
                ],
            ],
        ];

        foreach ($recipes as $recipe) {
            Recipe::firstOrCreate(
                ['sensor_model' => $recipe['sensor_model'], 'name' => $recipe['name']],
                $recipe,
            );
        }

        $this->command->info('Created ' . Recipe::count() . ' default recipes');
    }
}
