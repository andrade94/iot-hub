<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed roles and permissions first
        $this->call([
            RolesAndPermissionsSeeder::class,
        ]);

        // Then seed test users (which will be assigned roles)
        $this->call([
            UserSeeder::class,
        ]);

        // Seed categories and products for demo
        $this->call([
            CategorySeeder::class,
            ProductSeeder::class,
        ]);

        // Optionally seed test notifications (uncomment to use)
        // $this->call([
        //     NotificationSeeder::class,
        // ]);
    }
}
