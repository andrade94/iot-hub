<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\CorrectiveAction;
use App\Models\DataExport;
use App\Models\Device;
use App\Models\DeviceAnomaly;
use App\Models\MaintenanceWindow;
use App\Models\Organization;
use App\Models\OutageDeclaration;
use App\Models\ReportSchedule;
use App\Models\Site;
use App\Models\SiteTemplate;
use App\Models\User;
use Illuminate\Database\Seeder;

class Phase10DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding Phase 10 demo data...');

        // Get existing demo org and users (from UserSeeder)
        $org = Organization::where('slug', 'cadena-frio-demo')->first();
        if (! $org) {
            $this->command->warn('No demo org found — run DatabaseSeeder first.');
            return;
        }

        $admin = User::where('email', 'admin@cadenademo.com')->first();
        $manager = User::where('email', 'manager@cadenademo.com')->first();
        $viewer = User::where('email', 'viewer@cadenademo.com')->first();
        $tech = User::where('email', 'tech@cadenademo.com')->first();
        $superAdmin = User::where('email', 'super@astrea.io')->first();

        if (! $admin || ! $manager) {
            $this->command->warn('Demo users not found — run UserSeeder first.');
            return;
        }

        $sites = Site::where('org_id', $org->id)->get();
        $site = $sites->first();
        if (! $site) {
            $this->command->warn('No demo sites found — run SiteSeeder first.');
            return;
        }

        $devices = Device::where('site_id', $site->id)->get();

        // ── Demo Alerts (needed for corrective actions) ─
        $this->command->info('  Creating demo alerts...');

        if ($devices->isNotEmpty() && Alert::where('site_id', $site->id)->count() === 0) {
            $severities = ['critical', 'critical', 'high', 'high', 'high', 'medium', 'medium', 'low'];
            $statuses = ['active', 'active', 'acknowledged', 'resolved', 'resolved', 'resolved', 'dismissed', 'resolved'];

            foreach ($severities as $i => $severity) {
                $device = $devices->random();
                $triggeredAt = now()->subDays(fake()->numberBetween(1, 21))->subHours(fake()->numberBetween(0, 23));

                Alert::create([
                    'site_id' => $site->id,
                    'device_id' => $device->id,
                    'severity' => $severity,
                    'status' => $statuses[$i],
                    'triggered_at' => $triggeredAt,
                    'acknowledged_at' => in_array($statuses[$i], ['acknowledged', 'resolved']) ? $triggeredAt->addMinutes(fake()->numberBetween(5, 60)) : null,
                    'resolved_at' => in_array($statuses[$i], ['resolved', 'dismissed']) ? $triggeredAt->addHours(fake()->numberBetween(1, 12)) : null,
                    'resolution_type' => match ($statuses[$i]) {
                        'resolved' => fake()->randomElement(['manual', 'auto']),
                        'dismissed' => 'dismissed',
                        default => null,
                    },
                    'data' => [
                        'metric' => 'temperature',
                        'value' => fake()->randomFloat(1, 8, 18),
                        'threshold' => 8.0,
                        'condition' => 'above',
                        'rule_name' => 'Walk-in Cooler Max Temperature',
                        'device_name' => $device->name,
                        'device_model' => $device->model,
                        'zone' => $device->zone,
                    ],
                ]);
            }
        }

        // ── Corrective Actions ──────────────────────────
        $this->command->info('  Creating corrective actions...');

        $criticalAlerts = Alert::where('site_id', $site->id)
            ->whereIn('severity', ['critical', 'high'])
            ->take(5)
            ->get();

        foreach ($criticalAlerts as $alert) {
            $ca = CorrectiveAction::create([
                'alert_id' => $alert->id,
                'site_id' => $site->id,
                'action_taken' => fake()->randomElement([
                    'Moved all perishable product to backup cooler unit #2. Called refrigeration technician — ETA 2 hours. Temperature recovered after compressor restart.',
                    'Verified sensor reading against manual thermometer — confirmed 12°C excursion in walk-in. Relocated dairy and deli items to display case temporarily.',
                    'Door alarm triggered — found loading dock door propped open by delivery. Closed door, temperature returned to range in 20 minutes.',
                    'Power fluctuation caused brief compressor shutdown. UPS kicked in. Verified all cold chain units resumed within 3 minutes. No product at risk.',
                    'Defrost cycle ran 30 minutes longer than scheduled. Adjusted defrost timer from 45min to 25min. Next cycle monitored manually.',
                ]),
                'notes' => fake()->optional(0.3)->sentence(),
                'status' => 'logged',
                'taken_by' => fake()->randomElement([$viewer?->id ?? $manager->id, $manager->id, $tech?->id ?? $manager->id]),
                'taken_at' => $alert->triggered_at->addMinutes(fake()->numberBetween(5, 60)),
            ]);

            // Verify some of them
            if (fake()->boolean(60)) {
                $verifier = $ca->taken_by === $manager->id ? $admin : $manager;
                $ca->update([
                    'status' => 'verified',
                    'verified_by' => $verifier->id,
                    'verified_at' => $ca->taken_at->addHours(fake()->numberBetween(1, 12)),
                ]);
            }
        }

        // ── Device Anomalies ────────────────────────────
        $this->command->info('  Creating device anomalies...');

        if ($devices->isNotEmpty()) {
            $faultyDevice = $devices->random();
            for ($i = 0; $i < 8; $i++) {
                DeviceAnomaly::create([
                    'device_id' => $faultyDevice->id,
                    'metric' => 'temperature',
                    'value' => fake()->randomFloat(1, 200, 500),
                    'valid_min' => -40,
                    'valid_max' => 85,
                    'unit' => '°C',
                    'recorded_at' => now()->subDays(fake()->numberBetween(1, 14))->subHours(fake()->numberBetween(0, 23)),
                    'created_at' => now(),
                ]);
            }
        }

        // ── Maintenance Windows ─────────────────────────
        $this->command->info('  Creating maintenance windows...');

        foreach ($sites->take(3) as $s) {
            MaintenanceWindow::create([
                'site_id' => $s->id,
                'zone' => 'Walk-in Cooler',
                'title' => 'Weekly cooler cleaning',
                'recurrence' => 'weekly',
                'day_of_week' => 2, // Tuesday
                'start_time' => '14:00',
                'duration_minutes' => 120,
                'suppress_alerts' => true,
                'created_by' => $manager->id,
            ]);

            MaintenanceWindow::create([
                'site_id' => $s->id,
                'zone' => null, // site-wide
                'title' => 'Monthly deep clean',
                'recurrence' => 'monthly',
                'day_of_week' => null,
                'start_time' => '06:00',
                'duration_minutes' => 180,
                'suppress_alerts' => true,
                'created_by' => $admin->id,
            ]);
        }

        // ── Outage Declarations (historical) ────────────
        $this->command->info('  Creating outage history...');

        if ($superAdmin) {
            OutageDeclaration::create([
                'reason' => 'ChirpStack Cloud scheduled maintenance — LoRaWAN data pipeline paused for 45 minutes',
                'affected_services' => ['chirpstack', 'mqtt'],
                'status' => 'resolved',
                'declared_by' => $superAdmin->id,
                'declared_at' => now()->subDays(12)->setTime(3, 15),
                'resolved_by' => $superAdmin->id,
                'resolved_at' => now()->subDays(12)->setTime(4, 0),
            ]);

            OutageDeclaration::create([
                'reason' => 'Twilio WhatsApp API rate limited — alert delivery delayed for enterprise clients',
                'affected_services' => ['twilio'],
                'status' => 'resolved',
                'declared_by' => $superAdmin->id,
                'declared_at' => now()->subDays(5)->setTime(10, 30),
                'resolved_by' => $superAdmin->id,
                'resolved_at' => now()->subDays(5)->setTime(11, 15),
            ]);
        }

        // ── Report Schedules ────────────────────────────
        $this->command->info('  Creating report schedules...');

        ReportSchedule::create([
            'org_id' => $org->id,
            'site_id' => $site->id,
            'type' => 'temperature_compliance',
            'frequency' => 'weekly',
            'day_of_week' => 1, // Monday
            'time' => '08:00',
            'recipients_json' => [$admin->email, $manager->email],
            'active' => true,
            'created_by' => $admin->id,
        ]);

        ReportSchedule::create([
            'org_id' => $org->id,
            'site_id' => null, // org-wide
            'type' => 'executive_overview',
            'frequency' => 'monthly',
            'day_of_week' => null,
            'time' => '09:00',
            'recipients_json' => [$admin->email],
            'active' => true,
            'created_by' => $admin->id,
        ]);

        ReportSchedule::create([
            'org_id' => $org->id,
            'site_id' => $site->id,
            'type' => 'alert_summary',
            'frequency' => 'daily',
            'day_of_week' => null,
            'time' => '07:00',
            'recipients_json' => [$manager->email],
            'active' => true,
            'created_by' => $manager->id,
        ]);

        // ── Data Export (completed example) ─────────────
        $this->command->info('  Creating data export history...');

        DataExport::create([
            'org_id' => $org->id,
            'status' => 'completed',
            'date_from' => now()->subMonths(3)->startOfMonth(),
            'date_to' => now()->subMonth()->endOfMonth(),
            'file_path' => null, // no actual file
            'file_size' => 45_234_567, // ~45MB
            'attempts' => 1,
            'completed_at' => now()->subDays(8),
            'expires_at' => now()->subDays(6), // already expired
            'requested_by' => $admin->id,
        ]);

        // ── Site Templates ──────────────────────────────
        $this->command->info('  Creating site templates...');

        SiteTemplate::create([
            'org_id' => $org->id,
            'name' => 'Standard Cold Chain Store',
            'description' => 'Template for OXXO-style convenience stores with walk-in cooler, display cases, and prep area.',
            'modules' => ['cold_chain', 'compliance'],
            'zone_config' => [
                ['name' => 'Walk-in Cooler'],
                ['name' => 'Display Case 1'],
                ['name' => 'Display Case 2'],
                ['name' => 'Prep Area'],
            ],
            'recipe_assignments' => [
                ['zone' => 'Walk-in Cooler', 'recipe_id' => 1],
                ['zone' => 'Display Case 1', 'recipe_id' => 1],
                ['zone' => 'Display Case 2', 'recipe_id' => 1],
            ],
            'escalation_structure' => [
                ['level' => 1, 'delay_minutes' => 0, 'channels' => ['push', 'whatsapp']],
                ['level' => 2, 'delay_minutes' => 15, 'channels' => ['push', 'whatsapp', 'email']],
            ],
            'created_by' => $admin->id,
        ]);

        SiteTemplate::create([
            'org_id' => $org->id,
            'name' => 'Pharmacy Cold Room',
            'description' => 'NOM-072 compliant template for pharmacy cold storage with strict 2-8°C range.',
            'modules' => ['cold_chain', 'compliance'],
            'zone_config' => [
                ['name' => 'Cold Room A'],
                ['name' => 'Cold Room B'],
                ['name' => 'Ambient Storage'],
            ],
            'recipe_assignments' => [],
            'escalation_structure' => [
                ['level' => 1, 'delay_minutes' => 0, 'channels' => ['push', 'whatsapp', 'email']],
            ],
            'created_by' => $admin->id,
        ]);

        // ── Summary ─────────────────────────────────────
        $this->command->info('Phase 10 demo data seeded:');
        $this->command->info('  - ' . CorrectiveAction::count() . ' corrective actions');
        $this->command->info('  - ' . DeviceAnomaly::count() . ' device anomalies');
        $this->command->info('  - ' . MaintenanceWindow::count() . ' maintenance windows');
        $this->command->info('  - ' . OutageDeclaration::count() . ' outage declarations');
        $this->command->info('  - ' . ReportSchedule::count() . ' report schedules');
        $this->command->info('  - ' . DataExport::count() . ' data exports');
        $this->command->info('  - ' . SiteTemplate::count() . ' site templates');
    }
}
