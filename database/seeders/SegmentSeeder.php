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
                'name' => 'retail',
                'label' => 'Retail',
                'description' => 'Convenience stores, supermarkets, and retail chains. Temperature monitoring for refrigeration, energy management, and safety.',
                'suggested_modules' => ['cold_chain', 'energy', 'safety'],
                'suggested_sensor_models' => ['EM300-TH', 'CT101', 'GS101', 'WS301'],
                'color' => '#0891b2',
            ],
            [
                'name' => 'logistics',
                'label' => 'Logistics & Distribution',
                'description' => 'Distribution centers (CEDIS), cold transport, and warehouses. Cold chain compliance and door monitoring.',
                'suggested_modules' => ['cold_chain', 'compliance'],
                'suggested_sensor_models' => ['EM300-TH', 'WS301'],
                'color' => '#059669',
            ],
            [
                'name' => 'industrial',
                'label' => 'Industrial & Manufacturing',
                'description' => 'Manufacturing plants, production lines, and industrial facilities. Equipment monitoring, energy optimization.',
                'suggested_modules' => ['industrial', 'energy', 'safety'],
                'suggested_sensor_models' => ['CT101', 'EM310-UDL', 'EM300-TH'],
                'color' => '#7c3aed',
            ],
            [
                'name' => 'hospitality',
                'label' => 'Hospitality & Foodservice',
                'description' => 'Hotels, restaurants, and food service operations. Temperature compliance, gas safety, and energy efficiency.',
                'suggested_modules' => ['cold_chain', 'compliance', 'safety', 'energy'],
                'suggested_sensor_models' => ['EM300-TH', 'WS301', 'CT101', 'GS101'],
                'color' => '#d97706',
            ],
            [
                'name' => 'commercial',
                'label' => 'Commercial & Real Estate',
                'description' => 'Office buildings, shopping centers, and commercial spaces. Indoor air quality, energy, and occupancy.',
                'suggested_modules' => ['iaq', 'energy', 'people'],
                'suggested_sensor_models' => ['AM307', 'CT101', 'VS121'],
                'color' => '#2563eb',
            ],
            [
                'name' => 'pharma',
                'label' => 'Pharmaceutical & Healthcare',
                'description' => 'Pharmacies, laboratories, and hospitals. Strict temperature compliance (NOM-072), calibration tracking.',
                'suggested_modules' => ['cold_chain', 'compliance'],
                'suggested_sensor_models' => ['EM300-TH'],
                'color' => '#dc2626',
            ],
        ];

        foreach ($segments as $segment) {
            Segment::updateOrCreate(
                ['name' => $segment['name']],
                $segment,
            );
        }

        // Remove old segments that are modules, not industry verticals
        Segment::whereIn('name', ['cold_chain', 'energy', 'foodservice'])->delete();
    }
}
