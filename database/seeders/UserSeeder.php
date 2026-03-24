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
            'email' => 'super@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $superAdmin->assignRole('super_admin');

        // Org Admin — org 1
        $orgAdmin = User::create([
            'name' => 'Admin Cadena Frio',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'org_id' => $org1->id,
        ]);
        $orgAdmin->assignRole('client_org_admin');

        // Site Manager — org 1, sites 1 & 2
        $manager = User::create([
            'name' => 'Manager Norte-Centro',
            'email' => 'manager@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'org_id' => $org1->id,
        ]);
        $manager->assignRole('client_site_manager');
        $manager->sites()->attach([
            $org1Sites[0]->id => ['assigned_at' => now()],
            $org1Sites[1]->id => ['assigned_at' => now()],
        ]);

        // Site Viewer — org 1, site 1 only
        $viewer = User::create([
            'name' => 'Viewer Norte',
            'email' => 'viewer@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'org_id' => $org1->id,
        ]);
        $viewer->assignRole('client_site_viewer');
        $viewer->sites()->attach([
            $org1Sites[0]->id => ['assigned_at' => now()],
        ]);

        // Technician — org 1, all 3 sites
        $tech = User::create([
            'name' => 'Técnico Campo',
            'email' => 'tech@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'org_id' => $org1->id,
        ]);
        $tech->assignRole('technician');
        $tech->sites()->attach(
            $org1Sites->mapWithKeys(fn ($site) => [$site->id => ['assigned_at' => now()]])->toArray()
        );

        // Support — Astrea ops team, no org (sees all via command center)
        $support = User::create([
            'name' => 'Astrea Support',
            'email' => 'support@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $support->assignRole('support');

        // Account Manager — Astrea sales, no org (read-only across clients)
        $accountMgr = User::create([
            'name' => 'Astrea Account Manager',
            'email' => 'account@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $accountMgr->assignRole('account_manager');

        $this->command->info('✓ Created 7 IoT test users');
        $this->command->info('  Astrea roles:');
        $this->command->info('    Super Admin:     super@example.com / password');
        $this->command->info('    Support:         support@example.com / password');
        $this->command->info('    Account Manager: account@example.com / password');
        $this->command->info('    Technician:      tech@example.com / password');
        $this->command->info('  Client roles:');
        $this->command->info('    Org Admin:       admin@example.com / password');
        $this->command->info('    Site Manager:    manager@example.com / password');
        $this->command->info('    Site Viewer:     viewer@example.com / password');
    }
}
