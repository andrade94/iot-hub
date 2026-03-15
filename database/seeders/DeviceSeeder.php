<?php

namespace Database\Seeders;

use App\Models\Device;
use App\Models\Gateway;
use App\Models\Recipe;
use App\Models\Site;
use Illuminate\Database\Seeder;

class DeviceSeeder extends Seeder
{
    public function run(): void
    {
        $sites = Site::where('status', 'active')->with('gateways')->get();

        // Pre-load recipes
        $walkinCooler = Recipe::where('name', 'Walk-in Cooler')->first();
        $freezer = Recipe::where('name', 'Freezer')->first();
        $vitrina = Recipe::where('name', 'Display Case (Vitrina)')->first();
        $compressor = Recipe::where('name', 'Compressor Circuit')->first();
        $coldRoomDoor = Recipe::where('name', 'Cold Room Door')->first();
        $gasDetector = Recipe::where('name', 'Gas Leak Detector')->first();
        $office = Recipe::where('name', 'Office Space')->first();

        $deviceTemplates = [
            ['model' => 'EM300-TH', 'zone' => 'Cooler A', 'recipe' => $walkinCooler, 'battery' => rand(60, 100)],
            ['model' => 'EM300-TH', 'zone' => 'Cooler B', 'recipe' => $walkinCooler, 'battery' => rand(60, 100)],
            ['model' => 'EM300-TH', 'zone' => 'Freezer', 'recipe' => $freezer, 'battery' => rand(60, 100)],
            ['model' => 'EM300-TH', 'zone' => 'Vitrina 1', 'recipe' => $vitrina, 'battery' => rand(60, 100)],
            ['model' => 'CT101', 'zone' => 'Compressor 1', 'recipe' => $compressor, 'battery' => rand(70, 100)],
            ['model' => 'CT101', 'zone' => 'Compressor 2', 'recipe' => $compressor, 'battery' => rand(70, 100)],
            ['model' => 'WS301', 'zone' => 'Cooler A', 'recipe' => $coldRoomDoor, 'battery' => rand(80, 100)],
            ['model' => 'WS301', 'zone' => 'Freezer', 'recipe' => $coldRoomDoor, 'battery' => rand(80, 100)],
            ['model' => 'GS101', 'zone' => 'Kitchen', 'recipe' => $gasDetector, 'battery' => null],
            ['model' => 'AM307', 'zone' => 'Office', 'recipe' => $office, 'battery' => rand(70, 100)],
        ];

        $euiCounter = 1;

        foreach ($sites as $site) {
            $gateway = $site->gateways->first();

            foreach ($deviceTemplates as $template) {
                $devEui = sprintf('A81758FFFE%06X', $euiCounter++);

                Device::firstOrCreate(
                    ['dev_eui' => $devEui],
                    [
                        'site_id' => $site->id,
                        'gateway_id' => $gateway?->id,
                        'model' => $template['model'],
                        'dev_eui' => $devEui,
                        'name' => "{$template['model']} - {$template['zone']}",
                        'zone' => $template['zone'],
                        'recipe_id' => $template['recipe']?->id,
                        'installed_at' => now()->subDays(rand(30, 180)),
                        'battery_pct' => $template['battery'],
                        'rssi' => rand(-100, -60),
                        'last_reading_at' => now()->subMinutes(rand(1, 12)),
                        'status' => 'active',
                        'provisioned_at' => now()->subDays(rand(30, 180)),
                    ],
                );
            }
        }

        $totalDevices = Device::count();
        $this->command->info("Created {$totalDevices} demo devices across active sites");
    }
}
