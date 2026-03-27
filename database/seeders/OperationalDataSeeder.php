<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\ComplianceEvent;
use App\Models\CorrectiveAction;
use App\Models\Device;
use App\Models\EscalationChain;
use App\Models\MaintenanceWindow;
use App\Models\Module;
use App\Models\Organization;
use App\Models\ReportSchedule;
use App\Models\Site;
use App\Models\SiteModule;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Seeder;

class OperationalDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding operational data...');

        // ── Resolve existing entities ─────────────────────────────
        $org1 = Organization::where('slug', 'cadena-frio-demo')->first();
        $org2 = Organization::where('slug', 'retail-energy-demo')->first();

        if (! $org1 || ! $org2) {
            $this->command->warn('Organizations not found — run OrganizationSeeder first.');

            return;
        }

        $superAdmin = User::where('email', 'super@example.com')->first();
        $admin = User::where('email', 'admin@example.com')->first();
        $manager = User::where('email', 'manager@example.com')->first();
        $viewer = User::where('email', 'viewer@example.com')->first();
        $tech = User::where('email', 'tech@example.com')->first();

        if (! $admin || ! $manager || ! $tech) {
            $this->command->warn('Required users not found — run UserSeeder first.');

            return;
        }

        $org1Sites = Site::where('org_id', $org1->id)->get()->keyBy('name');
        $org2Sites = Site::where('org_id', $org2->id)->get()->keyBy('name');

        $cedisNorte = $org1Sites->get('CEDIS Norte');
        $cedisCentro = $org1Sites->get('CEDIS Centro');
        $cedisSur = $org1Sites->get('CEDIS Sur');
        $tiendaPolanco = $org2Sites->get('Tienda Polanco');
        $tiendaSantaFe = $org2Sites->get('Tienda Santa Fe');

        if (! $cedisNorte || ! $cedisCentro) {
            $this->command->warn('Required sites not found — run SiteSeeder first.');

            return;
        }

        // ── 9. Site Module Activations ────────────────────────────
        $this->seedSiteModules($cedisNorte, $cedisCentro, $cedisSur, $tiendaPolanco, $tiendaSantaFe);

        // ── 1. Alert Rules ────────────────────────────────────────
        $rules = $this->seedAlertRules($cedisNorte, $cedisCentro, $tiendaPolanco);

        // ── 2. Escalation Chains ──────────────────────────────────
        $this->seedEscalationChains($cedisNorte, $cedisCentro, $admin, $manager, $viewer);

        // ── 3. Work Orders ────────────────────────────────────────
        $this->seedWorkOrders($cedisNorte, $cedisCentro, $admin, $manager, $tech);

        // ── 4. Compliance Events ──────────────────────────────────
        $this->seedComplianceEvents($org1, $cedisNorte, $cedisCentro, $admin, $manager);

        // ── 5. Maintenance Windows ────────────────────────────────
        $this->seedMaintenanceWindows($cedisNorte, $cedisCentro, $admin, $manager);

        // ── 6. Report Schedules ───────────────────────────────────
        $this->seedReportSchedules($org1, $cedisNorte, $cedisCentro, $admin, $manager);

        // ── 7. Alerts (linked to rules) ───────────────────────────
        $this->seedAlerts($rules, $cedisNorte, $cedisCentro, $manager);

        // ── 8. Corrective Actions ─────────────────────────────────
        $this->seedCorrectiveActions($cedisNorte, $admin, $manager, $viewer, $tech);

        // ── Summary ───────────────────────────────────────────────
        $this->command->info('Operational data seeded:');
        $this->command->info('  - '.AlertRule::count().' alert rules');
        $this->command->info('  - '.EscalationChain::count().' escalation chains');
        $this->command->info('  - '.WorkOrder::count().' work orders');
        $this->command->info('  - '.ComplianceEvent::count().' compliance events');
        $this->command->info('  - '.MaintenanceWindow::count().' maintenance windows');
        $this->command->info('  - '.ReportSchedule::count().' report schedules');
        $this->command->info('  - '.Alert::count().' alerts');
        $this->command->info('  - '.CorrectiveAction::count().' corrective actions');
        $this->command->info('  - '.SiteModule::count().' site-module activations');
    }

    // ══════════════════════════════════════════════════════════════
    //  Site Module Activations
    // ══════════════════════════════════════════════════════════════

    private function seedSiteModules(
        ?Site $cedisNorte,
        ?Site $cedisCentro,
        ?Site $cedisSur,
        ?Site $tiendaPolanco,
        ?Site $tiendaSantaFe,
    ): void {
        $this->command->info('  Activating site modules...');

        $modules = Module::all()->keyBy('slug');

        $activations = [
            // CEDIS Norte: cold_chain, compliance, safety, energy
            $cedisNorte?->id => ['cold_chain', 'compliance', 'safety', 'energy'],
            // CEDIS Centro: cold_chain, compliance, energy
            $cedisCentro?->id => ['cold_chain', 'compliance', 'energy'],
            // CEDIS Sur (onboarding): cold_chain, compliance
            $cedisSur?->id => ['cold_chain', 'compliance'],
            // Tienda Polanco: energy, cold_chain
            $tiendaPolanco?->id => ['energy', 'cold_chain'],
            // Tienda Santa Fe (onboarding): energy
            $tiendaSantaFe?->id => ['energy'],
        ];

        foreach ($activations as $siteId => $moduleSlugs) {
            if (! $siteId) {
                continue;
            }

            foreach ($moduleSlugs as $slug) {
                $module = $modules->get($slug);
                if (! $module) {
                    continue;
                }

                SiteModule::updateOrCreate(
                    ['site_id' => $siteId, 'module_id' => $module->id],
                    ['activated_at' => now()->subDays(rand(30, 90)), 'config' => null],
                );
            }
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  1. Alert Rules (~15 rules across active sites)
    // ══════════════════════════════════════════════════════════════

    private function seedAlertRules(?Site $cedisNorte, ?Site $cedisCentro, ?Site $tiendaPolanco): array
    {
        $this->command->info('  Creating alert rules...');

        $ruleDefinitions = [
            // ── CEDIS Norte (5 rules) ──
            [
                'site' => $cedisNorte,
                'name' => 'Walk-in Cooler Max Temp',
                'type' => 'simple',
                'severity' => 'critical',
                'cooldown_minutes' => 30,
                'conditions' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'unit' => '°C'],
                ],
            ],
            [
                'site' => $cedisNorte,
                'name' => 'Freezer Min Temp',
                'type' => 'simple',
                'severity' => 'high',
                'cooldown_minutes' => 60,
                'conditions' => [
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => -25, 'unit' => '°C'],
                ],
            ],
            [
                'site' => $cedisNorte,
                'name' => 'High Humidity Alert',
                'type' => 'simple',
                'severity' => 'medium',
                'cooldown_minutes' => 120,
                'conditions' => [
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 85, 'unit' => '%'],
                ],
            ],
            [
                'site' => $cedisNorte,
                'name' => 'Door Open Too Long',
                'type' => 'simple',
                'severity' => 'high',
                'cooldown_minutes' => 15,
                'conditions' => [
                    ['metric' => 'door_status', 'condition' => 'equals', 'threshold' => 1, 'duration_minutes' => 15],
                ],
            ],
            [
                'site' => $cedisNorte,
                'name' => 'Compressor Energy Spike',
                'type' => 'simple',
                'severity' => 'medium',
                'cooldown_minutes' => 60,
                'conditions' => [
                    ['metric' => 'current', 'condition' => 'above', 'threshold' => 80, 'unit' => 'A'],
                ],
            ],

            // ── CEDIS Centro (5 rules) ──
            [
                'site' => $cedisCentro,
                'name' => 'Walk-in Cooler Max Temp',
                'type' => 'simple',
                'severity' => 'critical',
                'cooldown_minutes' => 30,
                'conditions' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'unit' => '°C'],
                ],
            ],
            [
                'site' => $cedisCentro,
                'name' => 'Freezer Min Temp',
                'type' => 'simple',
                'severity' => 'high',
                'cooldown_minutes' => 60,
                'conditions' => [
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => -25, 'unit' => '°C'],
                ],
            ],
            [
                'site' => $cedisCentro,
                'name' => 'High Humidity Alert',
                'type' => 'simple',
                'severity' => 'medium',
                'cooldown_minutes' => 120,
                'conditions' => [
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 85, 'unit' => '%'],
                ],
            ],
            [
                'site' => $cedisCentro,
                'name' => 'Door Open Too Long',
                'type' => 'simple',
                'severity' => 'high',
                'cooldown_minutes' => 15,
                'conditions' => [
                    ['metric' => 'door_status', 'condition' => 'equals', 'threshold' => 1, 'duration_minutes' => 15],
                ],
            ],
            [
                'site' => $cedisCentro,
                'name' => 'Display Case Temp Warning',
                'type' => 'simple',
                'severity' => 'medium',
                'cooldown_minutes' => 45,
                'conditions' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 10, 'unit' => '°C'],
                ],
            ],

            // ── Tienda Polanco (5 rules) ──
            [
                'site' => $tiendaPolanco,
                'name' => 'Walk-in Cooler Max Temp',
                'type' => 'simple',
                'severity' => 'critical',
                'cooldown_minutes' => 30,
                'conditions' => [
                    ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'unit' => '°C'],
                ],
            ],
            [
                'site' => $tiendaPolanco,
                'name' => 'Freezer Min Temp',
                'type' => 'simple',
                'severity' => 'high',
                'cooldown_minutes' => 60,
                'conditions' => [
                    ['metric' => 'temperature', 'condition' => 'below', 'threshold' => -25, 'unit' => '°C'],
                ],
            ],
            [
                'site' => $tiendaPolanco,
                'name' => 'Energy Spike',
                'type' => 'simple',
                'severity' => 'medium',
                'cooldown_minutes' => 60,
                'conditions' => [
                    ['metric' => 'current', 'condition' => 'above', 'threshold' => 80, 'unit' => 'A'],
                ],
            ],
            [
                'site' => $tiendaPolanco,
                'name' => 'Battery Low',
                'type' => 'simple',
                'severity' => 'low',
                'cooldown_minutes' => 1440,
                'conditions' => [
                    ['metric' => 'battery_pct', 'condition' => 'below', 'threshold' => 15, 'unit' => '%'],
                ],
            ],
            [
                'site' => $tiendaPolanco,
                'name' => 'High Humidity Alert',
                'type' => 'simple',
                'severity' => 'medium',
                'cooldown_minutes' => 120,
                'conditions' => [
                    ['metric' => 'humidity', 'condition' => 'above', 'threshold' => 85, 'unit' => '%'],
                ],
            ],
        ];

        $createdRules = [];
        foreach ($ruleDefinitions as $def) {
            $site = $def['site'];
            if (! $site) {
                continue;
            }

            $rule = AlertRule::updateOrCreate(
                ['site_id' => $site->id, 'name' => $def['name']],
                [
                    'type' => $def['type'],
                    'severity' => $def['severity'],
                    'cooldown_minutes' => $def['cooldown_minutes'],
                    'conditions' => $def['conditions'],
                    'active' => true,
                ],
            );

            $createdRules[] = $rule;
        }

        return $createdRules;
    }

    // ══════════════════════════════════════════════════════════════
    //  2. Escalation Chains (3 chains)
    // ══════════════════════════════════════════════════════════════

    private function seedEscalationChains(
        Site $cedisNorte,
        Site $cedisCentro,
        User $admin,
        User $manager,
        ?User $viewer,
    ): void {
        $this->command->info('  Creating escalation chains...');

        // Critical Alert Chain — CEDIS Norte
        EscalationChain::updateOrCreate(
            ['site_id' => $cedisNorte->id, 'name' => 'Critical Alert Chain'],
            [
                'levels' => [
                    [
                        'level' => 1,
                        'delay_minutes' => 0,
                        'channels' => ['whatsapp', 'push'],
                        'user_ids' => array_filter([$manager->id]),
                    ],
                    [
                        'level' => 2,
                        'delay_minutes' => 15,
                        'channels' => ['whatsapp', 'push', 'email'],
                        'user_ids' => [$admin->id],
                    ],
                ],
            ],
        );

        // Standard Alert Chain — CEDIS Centro
        EscalationChain::updateOrCreate(
            ['site_id' => $cedisCentro->id, 'name' => 'Standard Alert Chain'],
            [
                'levels' => [
                    [
                        'level' => 1,
                        'delay_minutes' => 0,
                        'channels' => ['push'],
                        'user_ids' => array_filter([$viewer?->id, $manager->id]),
                    ],
                ],
            ],
        );

        // After Hours Chain — CEDIS Norte
        EscalationChain::updateOrCreate(
            ['site_id' => $cedisNorte->id, 'name' => 'After Hours Chain'],
            [
                'levels' => [
                    [
                        'level' => 1,
                        'delay_minutes' => 0,
                        'channels' => ['whatsapp'],
                        'user_ids' => [$admin->id],
                    ],
                ],
            ],
        );
    }

    // ══════════════════════════════════════════════════════════════
    //  3. Work Orders (8 in various states)
    // ══════════════════════════════════════════════════════════════

    private function seedWorkOrders(
        Site $cedisNorte,
        Site $cedisCentro,
        User $admin,
        User $manager,
        User $tech,
    ): void {
        $this->command->info('  Creating work orders...');

        // Skip if work orders already exist
        if (WorkOrder::count() > 0) {
            $this->command->info('    (skipped — work orders already exist)');

            return;
        }

        $norteDevices = Device::where('site_id', $cedisNorte->id)->get();
        $centroDevices = Device::where('site_id', $cedisCentro->id)->get();

        $workOrders = [
            // 2 open (unassigned)
            [
                'site_id' => $cedisNorte->id,
                'title' => 'Replace battery — EM300-TH Cooler A',
                'description' => 'Battery level dropped to 12%. Sensor reporting intermittently. Replace CR123A battery and verify readings resume.',
                'type' => 'battery_replace',
                'priority' => 'high',
                'status' => 'open',
                'assigned_to' => null,
                'created_by' => $manager->id,
                'device_id' => $norteDevices->where('zone', 'Cooler A')->where('model', 'EM300-TH')->first()?->id,
                'created_at' => now()->subDays(2),
            ],
            [
                'site_id' => $cedisCentro->id,
                'title' => 'Inspect Vitrina 1 sensor placement',
                'description' => 'Display case readings are 3°C higher than expected. Verify sensor is not near the light fixture. Relocate if needed.',
                'type' => 'inspection',
                'priority' => 'medium',
                'status' => 'open',
                'assigned_to' => null,
                'created_by' => $admin->id,
                'device_id' => $centroDevices->where('zone', 'Vitrina 1')->first()?->id,
                'created_at' => now()->subDays(1),
            ],

            // 2 assigned to technician
            [
                'site_id' => $cedisNorte->id,
                'title' => 'Replace door sensor — Freezer',
                'description' => 'WS301 on freezer door stopped reporting 48h ago. Replace unit and pair with gateway.',
                'type' => 'sensor_replace',
                'priority' => 'high',
                'status' => 'assigned',
                'assigned_to' => $tech->id,
                'created_by' => $manager->id,
                'device_id' => $norteDevices->where('zone', 'Freezer')->where('model', 'WS301')->first()?->id,
                'created_at' => now()->subDays(3),
            ],
            [
                'site_id' => $cedisCentro->id,
                'title' => 'Quarterly compressor maintenance',
                'description' => 'Scheduled Q1 maintenance for both compressor circuits. Check refrigerant levels, clean condenser coils, verify amperage draw.',
                'type' => 'maintenance',
                'priority' => 'medium',
                'status' => 'assigned',
                'assigned_to' => $tech->id,
                'created_by' => $admin->id,
                'device_id' => $centroDevices->where('zone', 'Compressor 1')->first()?->id,
                'created_at' => now()->subDays(5),
            ],

            // 1 in_progress
            [
                'site_id' => $cedisNorte->id,
                'title' => 'Calibrate EM300-TH Cooler B',
                'description' => 'Sensor drift detected: reading 1.5°C below NIST-traceable reference thermometer. Perform zero-point calibration per SOP-CAL-004.',
                'type' => 'maintenance',
                'priority' => 'high',
                'status' => 'in_progress',
                'assigned_to' => $tech->id,
                'created_by' => $manager->id,
                'device_id' => $norteDevices->where('zone', 'Cooler B')->first()?->id,
                'created_at' => now()->subDays(4),
            ],

            // 2 completed
            [
                'site_id' => $cedisNorte->id,
                'title' => 'Install gas detector in kitchen',
                'description' => 'New GS101 gas leak detector installed in kitchen area per safety module requirements. Paired with gateway, alert rule configured.',
                'type' => 'maintenance',
                'priority' => 'low',
                'status' => 'completed',
                'assigned_to' => $tech->id,
                'created_by' => $admin->id,
                'device_id' => $norteDevices->where('zone', 'Kitchen')->first()?->id,
                'created_at' => now()->subDays(14),
            ],
            [
                'site_id' => $cedisCentro->id,
                'title' => 'Replace CT101 — Compressor 2',
                'description' => 'Current transformer clamp sensor failed open-circuit test. Replaced with new unit, verified kWh readings match utility submeter within 2%.',
                'type' => 'sensor_replace',
                'priority' => 'medium',
                'status' => 'completed',
                'assigned_to' => $tech->id,
                'created_by' => $manager->id,
                'device_id' => $centroDevices->where('zone', 'Compressor 2')->first()?->id,
                'created_at' => now()->subDays(10),
            ],

            // 1 cancelled
            [
                'site_id' => $cedisCentro->id,
                'title' => 'Investigate false humidity alert',
                'description' => 'Humidity alert at 92% was false — caused by cleaning crew pressure-washing near the sensor. No action needed. Closing.',
                'type' => 'inspection',
                'priority' => 'low',
                'status' => 'cancelled',
                'assigned_to' => null,
                'created_by' => $manager->id,
                'device_id' => null,
                'created_at' => now()->subDays(7),
            ],
        ];

        foreach ($workOrders as $woData) {
            WorkOrder::create($woData);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  4. Compliance Events (6 events)
    // ══════════════════════════════════════════════════════════════

    private function seedComplianceEvents(
        Organization $org,
        Site $cedisNorte,
        Site $cedisCentro,
        User $admin,
        User $manager,
    ): void {
        $this->command->info('  Creating compliance events...');

        if (ComplianceEvent::count() > 0) {
            $this->command->info('    (skipped — compliance events already exist)');

            return;
        }

        $events = [
            // 2 upcoming
            [
                'site_id' => $cedisNorte->id,
                'org_id' => $org->id,
                'type' => 'cofepris_audit',
                'title' => 'COFEPRIS Annual Cold Chain Audit — CEDIS Norte',
                'description' => 'Annual COFEPRIS inspection for cold chain compliance. Prepare temperature logs, calibration certificates, and corrective action documentation for the past 12 months.',
                'due_date' => now()->addDays(30)->toDateString(),
                'status' => 'upcoming',
                'completed_at' => null,
                'completed_by' => null,
                'reminders_sent' => [],
            ],
            [
                'site_id' => $cedisCentro->id,
                'org_id' => $org->id,
                'type' => 'calibration',
                'title' => 'Q2 Sensor Calibration — All Temperature Sensors',
                'description' => 'Quarterly calibration of all EM300-TH temperature sensors against NIST-traceable reference. Includes Cooler A, Cooler B, Freezer, and Vitrina sensors.',
                'due_date' => now()->addDays(60)->toDateString(),
                'status' => 'upcoming',
                'completed_at' => null,
                'completed_by' => null,
                'reminders_sent' => [],
            ],

            // 1 overdue
            [
                'site_id' => $cedisNorte->id,
                'org_id' => $org->id,
                'type' => 'certificate_renewal',
                'title' => 'Refrigeration Technician Certification Renewal',
                'description' => 'SEMARNAT-required refrigerant handling certification for on-site technician expired. Must renew before next scheduled maintenance.',
                'due_date' => now()->subDays(5)->toDateString(),
                'status' => 'overdue',
                'completed_at' => null,
                'completed_by' => null,
                'reminders_sent' => ['30_day', '7_day', '1_day'],
            ],

            // 2 completed
            [
                'site_id' => $cedisNorte->id,
                'org_id' => $org->id,
                'type' => 'inspection',
                'title' => 'Fire Suppression System Inspection',
                'description' => 'Annual inspection of kitchen fire suppression system and cold storage CO2 detection. Passed all checks.',
                'due_date' => now()->subDays(20)->toDateString(),
                'status' => 'completed',
                'completed_at' => now()->subDays(22)->toDateString(),
                'completed_by' => $admin->name,
                'reminders_sent' => ['30_day'],
            ],
            [
                'site_id' => $cedisCentro->id,
                'org_id' => $org->id,
                'type' => 'permit_renewal',
                'title' => 'Operating Permit Renewal — CDMX Environmental',
                'description' => 'Renewed environmental operating permit for CDMX municipality. Valid through March 2027.',
                'due_date' => now()->subDays(45)->toDateString(),
                'status' => 'completed',
                'completed_at' => now()->subDays(50)->toDateString(),
                'completed_by' => $manager->name,
                'reminders_sent' => ['30_day', '7_day'],
            ],

            // 1 cancelled
            [
                'site_id' => $cedisCentro->id,
                'org_id' => $org->id,
                'type' => 'cofepris_audit',
                'title' => 'COFEPRIS Surprise Audit — Rescheduled',
                'description' => 'Originally scheduled surprise audit was rescheduled by COFEPRIS due to inspector availability. New date to be confirmed.',
                'due_date' => now()->subDays(10)->toDateString(),
                'status' => 'cancelled',
                'completed_at' => null,
                'completed_by' => null,
                'reminders_sent' => ['30_day', '7_day'],
            ],
        ];

        foreach ($events as $eventData) {
            ComplianceEvent::create($eventData);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  5. Maintenance Windows (4 windows)
    // ══════════════════════════════════════════════════════════════

    private function seedMaintenanceWindows(
        Site $cedisNorte,
        Site $cedisCentro,
        User $admin,
        User $manager,
    ): void {
        $this->command->info('  Creating maintenance windows...');

        // Only add if Phase10DemoSeeder hasn't already created windows for these specific patterns
        if (MaintenanceWindow::where('title', 'Nightly System Maintenance')->exists()) {
            $this->command->info('    (skipped — operational maintenance windows already exist)');

            return;
        }

        $windows = [
            // 1 daily recurring (nightly maintenance, 22:00-06:00, suppress alerts)
            [
                'site_id' => $cedisNorte->id,
                'zone' => null,
                'title' => 'Nightly System Maintenance',
                'recurrence' => 'daily',
                'day_of_week' => null,
                'start_time' => '22:00',
                'duration_minutes' => 480,
                'suppress_alerts' => true,
                'created_by' => $admin->id,
            ],

            // 1 weekly recurring (Monday morning, 06:00-08:00)
            [
                'site_id' => $cedisNorte->id,
                'zone' => 'Compressor 1',
                'title' => 'Monday Compressor Check',
                'recurrence' => 'weekly',
                'day_of_week' => 1, // Monday
                'start_time' => '06:00',
                'duration_minutes' => 120,
                'suppress_alerts' => true,
                'created_by' => $manager->id,
            ],

            // 1 one-time (scheduled for next week)
            [
                'site_id' => $cedisCentro->id,
                'zone' => 'Freezer',
                'title' => 'Freezer Defrost & Deep Clean',
                'recurrence' => 'once',
                'day_of_week' => null,
                'start_time' => '05:00',
                'duration_minutes' => 180,
                'suppress_alerts' => true,
                'created_by' => $manager->id,
            ],

            // 1 daily but suppress=false (informational only)
            [
                'site_id' => $cedisCentro->id,
                'zone' => null,
                'title' => 'Daily Opening Checklist Window',
                'recurrence' => 'daily',
                'day_of_week' => null,
                'start_time' => '07:00',
                'duration_minutes' => 60,
                'suppress_alerts' => false,
                'created_by' => $admin->id,
            ],
        ];

        foreach ($windows as $windowData) {
            MaintenanceWindow::create($windowData);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  6. Report Schedules (3 schedules)
    // ══════════════════════════════════════════════════════════════

    private function seedReportSchedules(
        Organization $org,
        Site $cedisNorte,
        Site $cedisCentro,
        User $admin,
        User $manager,
    ): void {
        $this->command->info('  Creating report schedules...');

        // Phase10DemoSeeder already creates 3 report schedules for org1/site1.
        // We add schedules for CEDIS Centro to ensure both sites have coverage.
        if (ReportSchedule::where('site_id', $cedisCentro->id)->exists()) {
            $this->command->info('    (skipped — operational report schedules already exist)');

            return;
        }

        $schedules = [
            // Weekly temperature compliance — CEDIS Centro, Monday 08:00
            [
                'org_id' => $org->id,
                'site_id' => $cedisCentro->id,
                'type' => 'temperature_compliance',
                'frequency' => 'weekly',
                'day_of_week' => 1, // Monday
                'time' => '08:00',
                'recipients_json' => [$admin->email, $manager->email],
                'active' => true,
                'created_by' => $admin->id,
            ],

            // Monthly energy summary — CEDIS Centro, 1st of month 09:00
            [
                'org_id' => $org->id,
                'site_id' => $cedisCentro->id,
                'type' => 'energy_summary',
                'frequency' => 'monthly',
                'day_of_week' => null,
                'time' => '09:00',
                'recipients_json' => [$admin->email],
                'active' => true,
                'created_by' => $admin->id,
            ],

            // Daily alert summary — CEDIS Centro, 08:00
            [
                'org_id' => $org->id,
                'site_id' => $cedisCentro->id,
                'type' => 'alert_summary',
                'frequency' => 'daily',
                'day_of_week' => null,
                'time' => '08:00',
                'recipients_json' => [$manager->email],
                'active' => true,
                'created_by' => $manager->id,
            ],
        ];

        foreach ($schedules as $scheduleData) {
            ReportSchedule::create($scheduleData);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  7. Alerts (10 alerts linked to rules)
    // ══════════════════════════════════════════════════════════════

    private function seedAlerts(array $rules, Site $cedisNorte, Site $cedisCentro, User $manager): void
    {
        $this->command->info('  Creating rule-linked alerts...');

        // Phase10DemoSeeder creates alerts for site1 without rule_id.
        // We create additional alerts that ARE linked to rules.
        if (Alert::whereNotNull('rule_id')->count() > 0) {
            $this->command->info('    (skipped — rule-linked alerts already exist)');

            return;
        }

        $norteDevices = Device::where('site_id', $cedisNorte->id)->get();
        $centroDevices = Device::where('site_id', $cedisCentro->id)->get();

        if ($norteDevices->isEmpty() || $centroDevices->isEmpty()) {
            $this->command->warn('    No devices found for alert creation.');

            return;
        }

        // Index rules by site+name for easy lookup
        $ruleIndex = collect($rules)->mapWithKeys(fn (AlertRule $r) => ["{$r->site_id}:{$r->name}" => $r]);

        $norteMaxTemp = $ruleIndex->get("{$cedisNorte->id}:Walk-in Cooler Max Temp");
        $norteFreezer = $ruleIndex->get("{$cedisNorte->id}:Freezer Min Temp");
        $norteDoor = $ruleIndex->get("{$cedisNorte->id}:Door Open Too Long");
        $norteHumidity = $ruleIndex->get("{$cedisNorte->id}:High Humidity Alert");
        $centroMaxTemp = $ruleIndex->get("{$cedisCentro->id}:Walk-in Cooler Max Temp");
        $centroDoor = $ruleIndex->get("{$cedisCentro->id}:Door Open Too Long");
        $centroDisplay = $ruleIndex->get("{$cedisCentro->id}:Display Case Temp Warning");

        $coolerANorte = $norteDevices->where('zone', 'Cooler A')->where('model', 'EM300-TH')->first();
        $coolerBNorte = $norteDevices->where('zone', 'Cooler B')->where('model', 'EM300-TH')->first();
        $freezerNorte = $norteDevices->where('zone', 'Freezer')->where('model', 'EM300-TH')->first();
        $doorNorte = $norteDevices->where('zone', 'Cooler A')->where('model', 'WS301')->first();
        $coolerACentro = $centroDevices->where('zone', 'Cooler A')->where('model', 'EM300-TH')->first();
        $vitrinaCentro = $centroDevices->where('zone', 'Vitrina 1')->where('model', 'EM300-TH')->first();
        $doorCentro = $centroDevices->where('zone', 'Cooler A')->where('model', 'WS301')->first();

        $alertDefs = [
            // 3 active/critical (temperature excursions)
            [
                'rule' => $norteMaxTemp,
                'site_id' => $cedisNorte->id,
                'device' => $coolerANorte,
                'severity' => 'critical',
                'status' => 'active',
                'triggered_at' => now()->subHours(2),
                'data' => [
                    'rule_name' => 'Walk-in Cooler Max Temp',
                    'device_name' => $coolerANorte?->name ?? 'EM300-TH - Cooler A',
                    'zone' => 'Cooler A',
                    'metric' => 'temperature',
                    'value' => 11.3,
                    'threshold' => 8,
                    'condition' => 'above',
                ],
            ],
            [
                'rule' => $centroMaxTemp,
                'site_id' => $cedisCentro->id,
                'device' => $coolerACentro,
                'severity' => 'critical',
                'status' => 'active',
                'triggered_at' => now()->subHours(1),
                'data' => [
                    'rule_name' => 'Walk-in Cooler Max Temp',
                    'device_name' => $coolerACentro?->name ?? 'EM300-TH - Cooler A',
                    'zone' => 'Cooler A',
                    'metric' => 'temperature',
                    'value' => 9.7,
                    'threshold' => 8,
                    'condition' => 'above',
                ],
            ],
            [
                'rule' => $norteFreezer,
                'site_id' => $cedisNorte->id,
                'device' => $freezerNorte,
                'severity' => 'critical',
                'status' => 'active',
                'triggered_at' => now()->subMinutes(45),
                'data' => [
                    'rule_name' => 'Freezer Min Temp',
                    'device_name' => $freezerNorte?->name ?? 'EM300-TH - Freezer',
                    'zone' => 'Freezer',
                    'metric' => 'temperature',
                    'value' => -27.4,
                    'threshold' => -25,
                    'condition' => 'below',
                ],
            ],

            // 2 active/high (door open, battery low)
            [
                'rule' => $norteDoor,
                'site_id' => $cedisNorte->id,
                'device' => $doorNorte,
                'severity' => 'high',
                'status' => 'active',
                'triggered_at' => now()->subMinutes(20),
                'data' => [
                    'rule_name' => 'Door Open Too Long',
                    'device_name' => $doorNorte?->name ?? 'WS301 - Cooler A',
                    'zone' => 'Cooler A',
                    'metric' => 'door_status',
                    'value' => 1,
                    'threshold' => 1,
                    'condition' => 'equals',
                    'duration_minutes' => 20,
                ],
            ],
            [
                'rule' => $centroDoor,
                'site_id' => $cedisCentro->id,
                'device' => $doorCentro,
                'severity' => 'high',
                'status' => 'active',
                'triggered_at' => now()->subDays(1)->subHours(3),
                'data' => [
                    'rule_name' => 'Door Open Too Long',
                    'device_name' => $doorCentro?->name ?? 'WS301 - Cooler A',
                    'zone' => 'Cooler A',
                    'metric' => 'door_status',
                    'value' => 1,
                    'threshold' => 1,
                    'condition' => 'equals',
                    'duration_minutes' => 18,
                ],
            ],

            // 2 acknowledged (being handled)
            [
                'rule' => $norteHumidity,
                'site_id' => $cedisNorte->id,
                'device' => $coolerBNorte,
                'severity' => 'medium',
                'status' => 'acknowledged',
                'triggered_at' => now()->subDays(1),
                'acknowledged_at' => now()->subDays(1)->addMinutes(12),
                'data' => [
                    'rule_name' => 'High Humidity Alert',
                    'device_name' => $coolerBNorte?->name ?? 'EM300-TH - Cooler B',
                    'zone' => 'Cooler B',
                    'metric' => 'humidity',
                    'value' => 89.2,
                    'threshold' => 85,
                    'condition' => 'above',
                ],
            ],
            [
                'rule' => $centroDisplay,
                'site_id' => $cedisCentro->id,
                'device' => $vitrinaCentro,
                'severity' => 'medium',
                'status' => 'acknowledged',
                'triggered_at' => now()->subDays(2),
                'acknowledged_at' => now()->subDays(2)->addMinutes(25),
                'data' => [
                    'rule_name' => 'Display Case Temp Warning',
                    'device_name' => $vitrinaCentro?->name ?? 'EM300-TH - Vitrina 1',
                    'zone' => 'Vitrina 1',
                    'metric' => 'temperature',
                    'value' => 11.8,
                    'threshold' => 10,
                    'condition' => 'above',
                ],
            ],

            // 2 resolved (with resolution timestamps)
            [
                'rule' => $norteMaxTemp,
                'site_id' => $cedisNorte->id,
                'device' => $coolerANorte,
                'severity' => 'critical',
                'status' => 'resolved',
                'triggered_at' => now()->subDays(3),
                'acknowledged_at' => now()->subDays(3)->addMinutes(8),
                'resolved_at' => now()->subDays(3)->addHours(2),
                'resolved_by' => $manager->id,
                'resolution_type' => 'manual',
                'data' => [
                    'rule_name' => 'Walk-in Cooler Max Temp',
                    'device_name' => $coolerANorte?->name ?? 'EM300-TH - Cooler A',
                    'zone' => 'Cooler A',
                    'metric' => 'temperature',
                    'value' => 12.1,
                    'threshold' => 8,
                    'condition' => 'above',
                ],
            ],
            [
                'rule' => $centroMaxTemp,
                'site_id' => $cedisCentro->id,
                'device' => $coolerACentro,
                'severity' => 'high',
                'status' => 'resolved',
                'triggered_at' => now()->subDays(5),
                'acknowledged_at' => now()->subDays(5)->addMinutes(15),
                'resolved_at' => now()->subDays(5)->addHours(4),
                'resolved_by' => $manager->id,
                'resolution_type' => 'auto',
                'data' => [
                    'rule_name' => 'Walk-in Cooler Max Temp',
                    'device_name' => $coolerACentro?->name ?? 'EM300-TH - Cooler A',
                    'zone' => 'Cooler A',
                    'metric' => 'temperature',
                    'value' => 8.9,
                    'threshold' => 8,
                    'condition' => 'above',
                ],
            ],

            // 1 dismissed
            [
                'rule' => $norteHumidity,
                'site_id' => $cedisNorte->id,
                'device' => $coolerBNorte,
                'severity' => 'low',
                'status' => 'dismissed',
                'triggered_at' => now()->subDays(6),
                'resolved_at' => now()->subDays(6)->addMinutes(30),
                'resolved_by' => $manager->id,
                'resolution_type' => 'dismissed',
                'data' => [
                    'rule_name' => 'High Humidity Alert',
                    'device_name' => $coolerBNorte?->name ?? 'EM300-TH - Cooler B',
                    'zone' => 'Cooler B',
                    'metric' => 'humidity',
                    'value' => 86.1,
                    'threshold' => 85,
                    'condition' => 'above',
                ],
            ],
        ];

        foreach ($alertDefs as $def) {
            Alert::create([
                'rule_id' => $def['rule']?->id,
                'site_id' => $def['site_id'],
                'device_id' => $def['device']?->id,
                'severity' => $def['severity'],
                'status' => $def['status'],
                'triggered_at' => $def['triggered_at'],
                'acknowledged_at' => $def['acknowledged_at'] ?? null,
                'resolved_at' => $def['resolved_at'] ?? null,
                'resolved_by' => $def['resolved_by'] ?? null,
                'resolution_type' => $def['resolution_type'] ?? null,
                'data' => $def['data'],
            ]);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  8. Corrective Actions (3 actions for critical/high alerts)
    // ══════════════════════════════════════════════════════════════

    private function seedCorrectiveActions(
        Site $cedisNorte,
        User $admin,
        User $manager,
        ?User $viewer,
        User $tech,
    ): void {
        $this->command->info('  Creating corrective actions for rule-linked alerts...');

        // Get the rule-linked critical/high alerts we just created
        $criticalAlerts = Alert::whereNotNull('rule_id')
            ->whereIn('severity', ['critical', 'high'])
            ->whereIn('status', ['active', 'acknowledged', 'resolved'])
            ->whereDoesntHave('correctiveActions')
            ->take(3)
            ->get();

        if ($criticalAlerts->isEmpty()) {
            $this->command->info('    (skipped — no eligible alerts or corrective actions already exist)');

            return;
        }

        $actions = [
            [
                'action_taken' => 'Compressor tripped on high-head pressure. Reset breaker and restarted unit. Temperature recovering — currently 9.2°C and dropping. Monitoring for next 30 minutes.',
                'notes' => 'Compressor may need condenser coil cleaning — scheduled for Monday maintenance window.',
                'status' => 'logged',
            ],
            [
                'action_taken' => 'Door sensor confirmed open for 20 minutes. Found loading dock door wedged open by pallet. Removed obstruction and closed door. Door sensor now reads closed.',
                'notes' => null,
                'status' => 'logged',
            ],
            [
                'action_taken' => 'Walk-in cooler temperature hit 12.1°C due to defrost cycle overlap. Staggered defrost timers for Cooler A and Cooler B to prevent simultaneous cycles. Temperature returned to 4°C within 90 minutes.',
                'notes' => 'Updated defrost schedule in maintenance window configuration.',
                'status' => 'verified',
            ],
        ];

        foreach ($criticalAlerts->take(3) as $i => $alert) {
            if (! isset($actions[$i])) {
                break;
            }

            $takenBy = match ($i) {
                0 => $tech,
                1 => $manager,
                2 => $viewer ?? $manager,
            };

            $ca = CorrectiveAction::create([
                'alert_id' => $alert->id,
                'site_id' => $alert->site_id,
                'action_taken' => $actions[$i]['action_taken'],
                'notes' => $actions[$i]['notes'],
                'status' => 'logged',
                'taken_by' => $takenBy->id,
                'taken_at' => $alert->triggered_at->addMinutes(rand(5, 30)),
            ]);

            // Verify the third one
            if ($actions[$i]['status'] === 'verified') {
                $verifier = $takenBy->id === $manager->id ? $admin : $manager;
                $ca->update([
                    'status' => 'verified',
                    'verified_by' => $verifier->id,
                    'verified_at' => $ca->taken_at->addHours(rand(1, 6)),
                ]);
            }
        }
    }
}
