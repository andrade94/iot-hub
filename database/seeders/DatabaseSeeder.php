<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            SegmentSeeder::class,
            SensorModelSeeder::class,
            OrganizationSeeder::class,
            SiteSeeder::class,
            UserSeeder::class,
            ModuleSeeder::class,
            RecipeSeeder::class,
            GatewaySeeder::class,
            DeviceSeeder::class,
            Phase10DemoSeeder::class,
        ]);
    }
}
