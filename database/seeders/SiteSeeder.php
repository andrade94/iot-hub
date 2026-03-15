<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\Site;
use Illuminate\Database\Seeder;

class SiteSeeder extends Seeder
{
    public function run(): void
    {
        $org1 = Organization::where('slug', 'cadena-frio-demo')->first();
        $org2 = Organization::where('slug', 'retail-energy-demo')->first();

        // Org 1: Cold chain sites
        Site::create([
            'org_id' => $org1->id,
            'name' => 'CEDIS Norte',
            'address' => 'Av. Industrial 100, Monterrey, NL',
            'lat' => 25.6866142,
            'lng' => -100.3161126,
            'timezone' => 'America/Monterrey',
            'status' => 'active',
            'install_date' => '2025-06-15',
        ]);

        Site::create([
            'org_id' => $org1->id,
            'name' => 'CEDIS Centro',
            'address' => 'Calle Logística 45, CDMX',
            'lat' => 19.4326077,
            'lng' => -99.1332080,
            'timezone' => 'America/Mexico_City',
            'status' => 'active',
            'install_date' => '2025-08-01',
        ]);

        Site::create([
            'org_id' => $org1->id,
            'name' => 'CEDIS Sur',
            'address' => 'Blvd. Puerto 22, Mérida, Yuc',
            'lat' => 20.9673702,
            'lng' => -89.5925857,
            'timezone' => 'America/Merida',
            'status' => 'onboarding',
        ]);

        // Org 2: Energy sites
        Site::create([
            'org_id' => $org2->id,
            'name' => 'Tienda Polanco',
            'address' => 'Av. Presidente Masaryk 200, CDMX',
            'lat' => 19.4334329,
            'lng' => -99.1943375,
            'timezone' => 'America/Mexico_City',
            'status' => 'active',
            'install_date' => '2025-09-10',
        ]);

        Site::create([
            'org_id' => $org2->id,
            'name' => 'Tienda Santa Fe',
            'address' => 'Centro Comercial Santa Fe, CDMX',
            'lat' => 19.3593093,
            'lng' => -99.2780840,
            'timezone' => 'America/Mexico_City',
            'status' => 'onboarding',
        ]);

        $this->command->info('✓ Created 5 demo sites (3 for org 1, 2 for org 2)');
    }
}
