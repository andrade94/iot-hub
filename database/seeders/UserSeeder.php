<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $org1 = Organization::where('slug', 'cadena-frio-demo')->first();
        $org1Sites = Site::where('org_id', $org1->id)->get();

        // Super Admin — no org
        $superAdmin = User::create([
            'name' => 'Astrea Super Admin',
            'email' => 'super@astrea.io',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $superAdmin->assignRole('super_admin');

        // Org Admin — org 1
        $orgAdmin = User::create([
            'name' => 'Admin Cadena Frio',
            'email' => 'admin@cadenademo.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'org_id' => $org1->id,
        ]);
        $orgAdmin->assignRole('org_admin');

        // Site Manager — org 1, sites 1 & 2
        $manager = User::create([
            'name' => 'Manager Norte-Centro',
            'email' => 'manager@cadenademo.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'org_id' => $org1->id,
        ]);
        $manager->assignRole('site_manager');
        $manager->sites()->attach([
            $org1Sites[0]->id => ['assigned_at' => now()],
            $org1Sites[1]->id => ['assigned_at' => now()],
        ]);

        // Site Viewer — org 1, site 1 only
        $viewer = User::create([
            'name' => 'Viewer Norte',
            'email' => 'viewer@cadenademo.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'org_id' => $org1->id,
        ]);
        $viewer->assignRole('site_viewer');
        $viewer->sites()->attach([
            $org1Sites[0]->id => ['assigned_at' => now()],
        ]);

        // Technician — org 1, all 3 sites
        $tech = User::create([
            'name' => 'Técnico Campo',
            'email' => 'tech@cadenademo.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'org_id' => $org1->id,
        ]);
        $tech->assignRole('technician');
        $tech->sites()->attach(
            $org1Sites->mapWithKeys(fn ($site) => [$site->id => ['assigned_at' => now()]])->toArray()
        );

        $this->command->info('✓ Created 5 IoT test users');
        $this->command->info('  Super Admin: super@astrea.io / password');
        $this->command->info('  Org Admin: admin@cadenademo.com / password');
        $this->command->info('  Site Manager: manager@cadenademo.com / password');
        $this->command->info('  Site Viewer: viewer@cadenademo.com / password');
        $this->command->info('  Technician: tech@cadenademo.com / password');
    }
}
