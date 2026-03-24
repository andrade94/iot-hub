<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\CorrectiveAction;
use App\Models\Device;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);

    // Create an alert rule and a critical alert for corrective action tests
    $this->alertRule = AlertRule::create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'name' => 'Critical Rule',
        'type' => 'threshold',
        'conditions' => ['metric' => 'temperature', 'operator' => '>', 'value' => 50],
        'severity' => 'critical',
        'cooldown_minutes' => 15,
        'active' => true,
    ]);

    $this->alert = Alert::create([
        'rule_id' => $this->alertRule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'critical',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    // Create one user per role
    // super_admin gets org_id so org-scoped controllers (report schedules, templates, export) work
    $this->superAdmin = createUserWithRole('super_admin', $this->org);
    $this->orgAdmin = createUserWithRole('client_org_admin', $this->org);
    $this->siteManager = createUserWithRole('client_site_manager', $this->org);
    $this->siteViewer = createUserWithRole('client_site_viewer', $this->org);
    $this->technician = createUserWithRole('technician', $this->org);

    // Attach site access for roles that require pivot
    $this->siteManager->sites()->attach($this->site->id, ['assigned_at' => now()]);
    $this->siteViewer->sites()->attach($this->site->id, ['assigned_at' => now()]);
    $this->technician->sites()->attach($this->site->id, ['assigned_at' => now()]);
});

// ===========================================================================
// 1. log corrective actions — POST /alerts/{alert}/corrective-actions
//    Allowed: super_admin, org_admin, site_manager, site_viewer, technician
//    (Policy also requires severity critical/high and site access)
// ===========================================================================

test('super_admin can log corrective actions', function () {
    $this->actingAs($this->superAdmin)
        ->post(route('corrective-actions.store', $this->alert), [
            'action_taken' => 'Replaced the faulty temperature sensor unit.',
        ])
        ->assertRedirect();
});

test('org_admin can log corrective actions', function () {
    $this->actingAs($this->orgAdmin)
        ->post(route('corrective-actions.store', $this->alert), [
            'action_taken' => 'Replaced the faulty temperature sensor unit.',
        ])
        ->assertRedirect();
});

test('site_manager can log corrective actions', function () {
    $this->actingAs($this->siteManager)
        ->post(route('corrective-actions.store', $this->alert), [
            'action_taken' => 'Replaced the faulty temperature sensor unit.',
        ])
        ->assertRedirect();
});

test('site_viewer can log corrective actions', function () {
    $this->actingAs($this->siteViewer)
        ->post(route('corrective-actions.store', $this->alert), [
            'action_taken' => 'Replaced the faulty temperature sensor unit.',
        ])
        ->assertRedirect();
});

test('technician can log corrective actions', function () {
    $this->actingAs($this->technician)
        ->post(route('corrective-actions.store', $this->alert), [
            'action_taken' => 'Replaced the faulty temperature sensor unit.',
        ])
        ->assertRedirect();
});

test('guest is redirected to login for corrective actions store', function () {
    $this->post(route('corrective-actions.store', $this->alert), [
        'action_taken' => 'Replaced the faulty temperature sensor unit.',
    ])->assertRedirect(route('login'));
});

// ===========================================================================
// 2. verify corrective actions — POST /alerts/{alert}/corrective-actions/{ca}/verify
//    Allowed: super_admin, org_admin, site_manager
//    Forbidden: site_viewer, technician
//    (Policy also requires: not self-verify, status=logged, site access)
// ===========================================================================

test('super_admin can verify corrective actions', function () {
    // CA logged by org_admin so super_admin can verify (not same user)
    $ca = CorrectiveAction::create([
        'alert_id' => $this->alert->id,
        'site_id' => $this->site->id,
        'action_taken' => 'Replaced the faulty sensor unit.',
        'status' => 'logged',
        'taken_by' => $this->orgAdmin->id,
        'taken_at' => now(),
    ]);

    $this->actingAs($this->superAdmin)
        ->post(route('corrective-actions.verify', [$this->alert, $ca]))
        ->assertRedirect();
});

test('org_admin can verify corrective actions', function () {
    $ca = CorrectiveAction::create([
        'alert_id' => $this->alert->id,
        'site_id' => $this->site->id,
        'action_taken' => 'Replaced the faulty sensor unit.',
        'status' => 'logged',
        'taken_by' => $this->siteManager->id,
        'taken_at' => now(),
    ]);

    $this->actingAs($this->orgAdmin)
        ->post(route('corrective-actions.verify', [$this->alert, $ca]))
        ->assertRedirect();
});

test('site_manager can verify corrective actions', function () {
    $ca = CorrectiveAction::create([
        'alert_id' => $this->alert->id,
        'site_id' => $this->site->id,
        'action_taken' => 'Replaced the faulty sensor unit.',
        'status' => 'logged',
        'taken_by' => $this->orgAdmin->id,
        'taken_at' => now(),
    ]);

    $this->actingAs($this->siteManager)
        ->post(route('corrective-actions.verify', [$this->alert, $ca]))
        ->assertRedirect();
});

test('site_viewer cannot verify corrective actions', function () {
    $ca = CorrectiveAction::create([
        'alert_id' => $this->alert->id,
        'site_id' => $this->site->id,
        'action_taken' => 'Replaced the faulty sensor unit.',
        'status' => 'logged',
        'taken_by' => $this->orgAdmin->id,
        'taken_at' => now(),
    ]);

    $this->actingAs($this->siteViewer)
        ->post(route('corrective-actions.verify', [$this->alert, $ca]))
        ->assertForbidden();
});

test('technician cannot verify corrective actions', function () {
    $ca = CorrectiveAction::create([
        'alert_id' => $this->alert->id,
        'site_id' => $this->site->id,
        'action_taken' => 'Replaced the faulty sensor unit.',
        'status' => 'logged',
        'taken_by' => $this->orgAdmin->id,
        'taken_at' => now(),
    ]);

    $this->actingAs($this->technician)
        ->post(route('corrective-actions.verify', [$this->alert, $ca]))
        ->assertForbidden();
});

test('guest is redirected to login for corrective actions verify', function () {
    $ca = CorrectiveAction::create([
        'alert_id' => $this->alert->id,
        'site_id' => $this->site->id,
        'action_taken' => 'Replaced the faulty sensor unit.',
        'status' => 'logged',
        'taken_by' => $this->orgAdmin->id,
        'taken_at' => now(),
    ]);

    $this->post(route('corrective-actions.verify', [$this->alert, $ca]))
        ->assertRedirect(route('login'));
});

// ===========================================================================
// 3. manage maintenance windows — GET/POST /settings/maintenance-windows
//    Allowed: super_admin, org_admin, site_manager
//    Forbidden: site_viewer, technician
// ===========================================================================

test('super_admin can access maintenance windows index', function () {
    $this->actingAs($this->superAdmin)
        ->withSession(['current_org_id' => $this->org->id])
        ->get(route('maintenance-windows.index'))
        ->assertOk();
});

test('org_admin can access maintenance windows index', function () {
    $this->actingAs($this->orgAdmin)
        ->get(route('maintenance-windows.index'))
        ->assertOk();
});

test('site_manager can access maintenance windows index', function () {
    $this->actingAs($this->siteManager)
        ->get(route('maintenance-windows.index'))
        ->assertOk();
});

test('site_viewer cannot access maintenance windows index', function () {
    $this->actingAs($this->siteViewer)
        ->get(route('maintenance-windows.index'))
        ->assertForbidden();
});

test('technician cannot access maintenance windows index', function () {
    $this->actingAs($this->technician)
        ->get(route('maintenance-windows.index'))
        ->assertForbidden();
});

test('super_admin can store maintenance windows', function () {
    $this->actingAs($this->superAdmin)
        ->withSession(['current_org_id' => $this->org->id])
        ->post(route('maintenance-windows.store'), [
            'site_id' => $this->site->id,
            'title' => 'Weekly HVAC maintenance',
            'recurrence' => 'weekly',
            'day_of_week' => 1,
            'start_time' => '02:00',
            'duration_minutes' => 60,
            'suppress_alerts' => true,
        ])
        ->assertRedirect();
});

test('site_viewer cannot store maintenance windows', function () {
    $this->actingAs($this->siteViewer)
        ->post(route('maintenance-windows.store'), [
            'site_id' => $this->site->id,
            'title' => 'Weekly HVAC maintenance',
            'recurrence' => 'weekly',
            'day_of_week' => 1,
            'start_time' => '02:00',
            'duration_minutes' => 60,
            'suppress_alerts' => true,
        ])
        ->assertForbidden();
});

test('technician cannot store maintenance windows', function () {
    $this->actingAs($this->technician)
        ->post(route('maintenance-windows.store'), [
            'site_id' => $this->site->id,
            'title' => 'Weekly HVAC maintenance',
            'recurrence' => 'weekly',
            'day_of_week' => 1,
            'start_time' => '02:00',
            'duration_minutes' => 60,
            'suppress_alerts' => true,
        ])
        ->assertForbidden();
});

test('guest is redirected to login for maintenance windows', function () {
    $this->get(route('maintenance-windows.index'))
        ->assertRedirect(route('login'));
});

// ===========================================================================
// 4. view alert analytics — GET /analytics/alerts
//    Allowed: super_admin, org_admin, site_manager
//    Forbidden: site_viewer, technician
// ===========================================================================

test('super_admin can access alert analytics', function () {
    $this->actingAs($this->superAdmin)
        ->get(route('analytics.alerts'))
        ->assertOk();
});

test('org_admin can access alert analytics', function () {
    $this->actingAs($this->orgAdmin)
        ->get(route('analytics.alerts'))
        ->assertOk();
});

test('site_manager can access alert analytics', function () {
    $this->actingAs($this->siteManager)
        ->get(route('analytics.alerts'))
        ->assertOk();
});

test('site_viewer cannot access alert analytics', function () {
    $this->actingAs($this->siteViewer)
        ->get(route('analytics.alerts'))
        ->assertForbidden();
});

test('technician cannot access alert analytics', function () {
    $this->actingAs($this->technician)
        ->get(route('analytics.alerts'))
        ->assertForbidden();
});

test('guest is redirected to login for alert analytics', function () {
    $this->get(route('analytics.alerts'))
        ->assertRedirect(route('login'));
});

// ===========================================================================
// 5. manage report schedules — GET/POST /settings/report-schedules
//    Allowed: super_admin, org_admin
//    Forbidden: site_manager, site_viewer, technician
// ===========================================================================

test('super_admin can access report schedules index', function () {
    $this->actingAs($this->superAdmin)
        ->withSession(['current_org_id' => $this->org->id])
        ->get(route('report-schedules.index'))
        ->assertOk();
});

test('org_admin can access report schedules index', function () {
    $this->actingAs($this->orgAdmin)
        ->get(route('report-schedules.index'))
        ->assertOk();
});

test('site_manager cannot access report schedules index', function () {
    $this->actingAs($this->siteManager)
        ->get(route('report-schedules.index'))
        ->assertForbidden();
});

test('site_viewer cannot access report schedules index', function () {
    $this->actingAs($this->siteViewer)
        ->get(route('report-schedules.index'))
        ->assertForbidden();
});

test('technician cannot access report schedules index', function () {
    $this->actingAs($this->technician)
        ->get(route('report-schedules.index'))
        ->assertForbidden();
});

test('super_admin can store report schedules', function () {
    $this->actingAs($this->superAdmin)
        ->withSession(['current_org_id' => $this->org->id])
        ->post(route('report-schedules.store'), [
            'type' => 'temperature_compliance',
            'site_id' => $this->site->id,
            'frequency' => 'weekly',
            'day_of_week' => 1,
            'time' => '08:00',
            'recipients_json' => ['admin@example.com'],
            'active' => true,
        ])
        ->assertRedirect();
});

test('site_manager cannot store report schedules', function () {
    $this->actingAs($this->siteManager)
        ->post(route('report-schedules.store'), [
            'type' => 'temperature_compliance',
            'site_id' => $this->site->id,
            'frequency' => 'weekly',
            'day_of_week' => 1,
            'time' => '08:00',
            'recipients_json' => ['admin@example.com'],
            'active' => true,
        ])
        ->assertForbidden();
});

test('guest is redirected to login for report schedules', function () {
    $this->get(route('report-schedules.index'))
        ->assertRedirect(route('login'));
});

// ===========================================================================
// 6. manage site templates — GET/POST /settings/site-templates
//    Allowed: super_admin, org_admin
//    Forbidden: site_manager, site_viewer, technician
// ===========================================================================

test('super_admin can access site templates index', function () {
    $this->actingAs($this->superAdmin)
        ->withSession(['current_org_id' => $this->org->id])
        ->get(route('site-templates.index'))
        ->assertOk();
});

test('org_admin can access site templates index', function () {
    $this->actingAs($this->orgAdmin)
        ->get(route('site-templates.index'))
        ->assertOk();
});

test('site_manager cannot access site templates index', function () {
    $this->actingAs($this->siteManager)
        ->get(route('site-templates.index'))
        ->assertForbidden();
});

test('site_viewer cannot access site templates index', function () {
    $this->actingAs($this->siteViewer)
        ->get(route('site-templates.index'))
        ->assertForbidden();
});

test('technician cannot access site templates index', function () {
    $this->actingAs($this->technician)
        ->get(route('site-templates.index'))
        ->assertForbidden();
});

test('org_admin can store site templates', function () {
    $this->actingAs($this->orgAdmin)
        ->post(route('site-templates.store'), [
            'source_site_id' => $this->site->id,
            'name' => 'Cold Chain Standard',
            'description' => 'Standard config for cold chain sites.',
        ])
        ->assertRedirect();
});

test('site_manager cannot store site templates', function () {
    $this->actingAs($this->siteManager)
        ->post(route('site-templates.store'), [
            'source_site_id' => $this->site->id,
            'name' => 'Cold Chain Standard',
            'description' => 'Standard config for cold chain sites.',
        ])
        ->assertForbidden();
});

test('guest is redirected to login for site templates', function () {
    $this->get(route('site-templates.index'))
        ->assertRedirect(route('login'));
});

// ===========================================================================
// 7. export organization data — GET/POST /settings/export-data
//    Allowed: super_admin, org_admin
//    Forbidden: site_manager, site_viewer, technician
// ===========================================================================

test('super_admin can access export data index', function () {
    $this->actingAs($this->superAdmin)
        ->withSession(['current_org_id' => $this->org->id])
        ->get(route('export-data.index'))
        ->assertOk();
});

test('org_admin can access export data index', function () {
    $this->actingAs($this->orgAdmin)
        ->get(route('export-data.index'))
        ->assertOk();
});

test('site_manager cannot access export data index', function () {
    $this->actingAs($this->siteManager)
        ->get(route('export-data.index'))
        ->assertForbidden();
});

test('site_viewer cannot access export data index', function () {
    $this->actingAs($this->siteViewer)
        ->get(route('export-data.index'))
        ->assertForbidden();
});

test('technician cannot access export data index', function () {
    $this->actingAs($this->technician)
        ->get(route('export-data.index'))
        ->assertForbidden();
});

test('org_admin can store export data request', function () {
    Queue::fake();

    $this->actingAs($this->orgAdmin)
        ->post(route('export-data.store'), [
            'date_from' => '2025-01-01',
            'date_to' => '2025-12-31',
        ])
        ->assertRedirect();
});

test('site_manager cannot store export data request', function () {
    $this->actingAs($this->siteManager)
        ->post(route('export-data.store'), [
            'date_from' => '2025-01-01',
            'date_to' => '2025-12-31',
        ])
        ->assertForbidden();
});

test('guest is redirected to login for export data', function () {
    $this->get(route('export-data.index'))
        ->assertRedirect(route('login'));
});
