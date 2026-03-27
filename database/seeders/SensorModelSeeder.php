<?php

namespace Database\Seeders;

use App\Models\SensorModel;
use Illuminate\Database\Seeder;

class SensorModelSeeder extends Seeder
{
    public function run(): void
    {
        $models = [
            [
                'name' => 'EM300-TH',
                'label' => 'Temperature & Humidity Sensor',
                'manufacturer' => 'Milesight',
                'description' => 'Industrial-grade temperature and humidity sensor for cold chain, warehousing, and indoor environment monitoring.',
                'supported_metrics' => ['temperature', 'humidity'],
                'valid_ranges' => ['temperature' => [-40, 85], 'humidity' => [0, 100]],
                'monthly_fee' => 150.00,
                'decoder_class' => 'MilesightDecoder',
                'sort_order' => 1,
            ],
            [
                'name' => 'CT101',
                'label' => 'Current Transformer',
                'manufacturer' => 'Milesight',
                'description' => 'Single-phase current transformer for energy monitoring and power consumption tracking.',
                'supported_metrics' => ['current', 'temperature'],
                'valid_ranges' => ['current' => [0, 100], 'temperature' => [-20, 60]],
                'monthly_fee' => 200.00,
                'decoder_class' => 'MilesightDecoder',
                'sort_order' => 2,
            ],
            [
                'name' => 'WS301',
                'label' => 'Door/Window Sensor',
                'manufacturer' => 'Milesight',
                'description' => 'Magnetic contact sensor for door and window open/close detection.',
                'supported_metrics' => ['door_status'],
                'valid_ranges' => ['door_status' => [0, 1]],
                'monthly_fee' => 100.00,
                'decoder_class' => 'MilesightDecoder',
                'sort_order' => 3,
            ],
            [
                'name' => 'AM307',
                'label' => 'Indoor Air Quality Sensor',
                'manufacturer' => 'Milesight',
                'description' => 'Multi-parameter indoor air quality sensor measuring CO2, PM2.5, humidity, and temperature.',
                'supported_metrics' => ['co2', 'pm2_5', 'humidity', 'temperature'],
                'valid_ranges' => ['co2' => [0, 5000], 'pm2_5' => [0, 1000], 'humidity' => [0, 100], 'temperature' => [-20, 60]],
                'monthly_fee' => 175.00,
                'decoder_class' => 'MilesightDecoder',
                'sort_order' => 4,
            ],
            [
                'name' => 'VS121',
                'label' => 'People Counter',
                'manufacturer' => 'Milesight',
                'description' => 'AI-powered people counting sensor for occupancy monitoring and traffic analysis.',
                'supported_metrics' => ['people_count'],
                'valid_ranges' => ['people_count' => [0, 500]],
                'monthly_fee' => 125.00,
                'decoder_class' => 'MilesightDecoder',
                'sort_order' => 5,
            ],
            [
                'name' => 'GS101',
                'label' => 'Gas Leak Detector',
                'manufacturer' => 'Milesight',
                'description' => 'Combustible gas leak detector for industrial safety and hazard monitoring.',
                'supported_metrics' => ['gas_level'],
                'valid_ranges' => ['gas_level' => [0, 100]],
                'monthly_fee' => 150.00,
                'decoder_class' => 'MilesightDecoder',
                'sort_order' => 6,
            ],
            [
                'name' => 'EM300-MCS',
                'label' => 'Magnetic Contact Switch',
                'manufacturer' => 'Milesight',
                'description' => 'Magnetic contact switch with temperature sensing for door/window monitoring in temperature-controlled environments.',
                'supported_metrics' => ['temperature', 'door_status'],
                'valid_ranges' => ['temperature' => [-40, 85]],
                'monthly_fee' => 100.00,
                'decoder_class' => 'MilesightDecoder',
                'sort_order' => 7,
            ],
            [
                'name' => 'EM310-UDL',
                'label' => 'Ultrasonic Distance Sensor',
                'manufacturer' => 'Milesight',
                'description' => 'Ultrasonic distance/level sensor for tank level monitoring and waste bin fill detection.',
                'supported_metrics' => ['distance'],
                'valid_ranges' => ['distance' => [0, 5000]],
                'monthly_fee' => 200.00,
                'decoder_class' => 'MilesightDecoder',
                'sort_order' => 8,
            ],
            [
                'name' => 'EM300-PT',
                'label' => 'Pressure & Temperature Sensor',
                'manufacturer' => 'Milesight',
                'description' => 'Combined pressure and temperature sensor for HVAC, pneumatic, and hydraulic system monitoring.',
                'supported_metrics' => ['pressure', 'temperature'],
                'valid_ranges' => ['pressure' => [0, 1000], 'temperature' => [-40, 85]],
                'monthly_fee' => 200.00,
                'decoder_class' => 'MilesightDecoder',
                'sort_order' => 9,
            ],
            [
                'name' => 'WS202',
                'label' => 'Temperature Sensor (Probe)',
                'manufacturer' => 'Milesight',
                'description' => 'External probe temperature sensor for precise temperature measurement in refrigeration and cold storage.',
                'supported_metrics' => ['temperature'],
                'valid_ranges' => ['temperature' => [-40, 85]],
                'monthly_fee' => 120.00,
                'decoder_class' => 'MilesightDecoder',
                'sort_order' => 10,
            ],
        ];

        foreach ($models as $model) {
            SensorModel::updateOrCreate(
                ['name' => $model['name']],
                $model,
            );
        }
    }
}
