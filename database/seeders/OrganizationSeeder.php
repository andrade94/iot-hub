<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        Organization::create([
            'name' => 'Cadena Frio Demo',
            'slug' => 'cadena-frio-demo',
            'segment' => 'retail',
            'plan' => 'professional',
            'settings' => ['alerts_enabled' => true, 'report_frequency' => 'daily', 'locale' => 'es'],
            'default_timezone' => 'America/Mexico_City',
        ]);

        Organization::create([
            'name' => 'Retail Energy Demo',
            'slug' => 'retail-energy-demo',
            'segment' => 'industrial',
            'plan' => 'starter',
            'settings' => ['alerts_enabled' => true, 'report_frequency' => 'weekly', 'locale' => 'es'],
            'default_timezone' => 'America/Mexico_City',
        ]);

        $this->command->info('Created 2 demo organizations');
    }
}
