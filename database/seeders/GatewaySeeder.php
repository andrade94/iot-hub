<?php

namespace Database\Seeders;

use App\Models\Gateway;
use App\Models\Site;
use Illuminate\Database\Seeder;

class GatewaySeeder extends Seeder
{
    public function run(): void
    {
        $sites = Site::where('status', 'active')->get();

        foreach ($sites as $site) {
            // Primary gateway per site
            Gateway::firstOrCreate(
                ['serial' => "GW-{$site->id}-001"],
                [
                    'site_id' => $site->id,
                    'model' => 'UG65',
                    'serial' => "GW-{$site->id}-001",
                    'chirpstack_id' => "gw-demo-{$site->id}-001",
                    'last_seen_at' => now()->subMinutes(rand(1, 10)),
                    'status' => 'online',
                    'is_addon' => false,
                ],
            );
        }

        // Add an addon gateway to the first active site
        $firstSite = $sites->first();
        if ($firstSite) {
            Gateway::firstOrCreate(
                ['serial' => "GW-{$firstSite->id}-002"],
                [
                    'site_id' => $firstSite->id,
                    'model' => 'UG65',
                    'serial' => "GW-{$firstSite->id}-002",
                    'chirpstack_id' => "gw-demo-{$firstSite->id}-002",
                    'last_seen_at' => now()->subMinutes(rand(1, 5)),
                    'status' => 'online',
                    'is_addon' => true,
                ],
            );
        }

        $this->command->info('Created demo gateways for active sites');
    }
}
