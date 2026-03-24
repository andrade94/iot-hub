<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);

    // Create an alert rule and an active alert for acknowledge tests
    $this->alertRule = AlertRule::create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'name' => 'Test Rule',
        'type' => 'threshold',
        'conditions' => ['metric' => 'temperature', 'operator' => '>', 'value' => 30],
        'severity' => 'warning',
        'cooldown_minutes' => 15,
        'active' => true,
    ]);

    $this->alert = Alert::create([
        'rule_id' => $this->alertRule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'warning',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    // Create one user per role
    $this->superAdmin = createUserWithRole('super_admin');
    // super_admin has no org_id by default — set org context via session
    $this->orgAdmin = createUserWithRole('client_org_admin', $this->org);
    $this->siteManager = createUserWithRole('client_site_manager', $this->org);
    $this->siteViewer = createUserWithRole('client_site_viewer', $this->org);
    $this->technician = createUserWithRole('technician', $this->org);

    // Attach site access for roles that require pivot
    $this->siteManager->sites()->attach($this->site->id, ['assigned_at' => now()]);
    $this->siteViewer->sites()->attach($this->site->id, ['assigned_at' => now()]);
    $this->technician->sites()->attach($this->site->id, ['assigned_at' => now()]);
});

// ---------------------------------------------------------------------------
// Guest (unauthenticated) — should redirect to login
// ---------------------------------------------------------------------------

test('guest is redirected to login for dashboard', function () {
    $this->get(route('dashboard'))
        ->assertRedirect(route('login'));
});

test('guest is redirected to login for alerts', function () {
    $this->get(route('alerts.index'))
        ->assertRedirect(route('login'));
});

// ---------------------------------------------------------------------------
// All authenticated — should get 200
// ---------------------------------------------------------------------------

test('all roles can access dashboard', function () {
    foreach ([$this->superAdmin, $this->orgAdmin, $this->siteManager, $this->siteViewer, $this->technician] as $user) {
        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk();
    }
});

test('all roles can access alerts index', function () {
    foreach ([$this->superAdmin, $this->orgAdmin, $this->siteManager, $this->siteViewer, $this->technician] as $user) {
        $this->actingAs($user)
            ->get(route('alerts.index'))
            ->assertOk();
    }
});

test('all roles can access notifications', function () {
    foreach ([$this->superAdmin, $this->orgAdmin, $this->siteManager, $this->siteViewer, $this->technician] as $user) {
        $this->actingAs($user)
            ->get(route('notifications'))
            ->assertOk();
    }
});

// ---------------------------------------------------------------------------
// super_admin ONLY — command center & partner portal
// ---------------------------------------------------------------------------

test('super_admin can access command center', function () {
    $this->actingAs($this->superAdmin)
        ->get(route('command-center.index'))
        ->assertOk();
});

test('non-super_admin roles cannot access command center', function () {
    foreach ([$this->orgAdmin, $this->siteManager, $this->siteViewer, $this->technician] as $user) {
        $this->actingAs($user)
            ->get(route('command-center.index'))
            ->assertForbidden();
    }
});

test('super_admin can access partner portal', function () {
    $this->actingAs($this->superAdmin)
        ->get(route('partner.index'))
        ->assertOk();
});

test('non-super_admin roles cannot access partner portal', function () {
    foreach ([$this->orgAdmin, $this->siteManager, $this->siteViewer, $this->technician] as $user) {
        $this->actingAs($user)
            ->get(route('partner.index'))
            ->assertForbidden();
    }
});

// ---------------------------------------------------------------------------
// manage sites permission — site settings
// super_admin, org_admin, site_manager = allowed (have 'manage sites')
// site_viewer, technician = forbidden
// ---------------------------------------------------------------------------

test('super_admin can access site settings', function () {
    $this->actingAs($this->superAdmin)
        ->get(route('sites.settings.index'))
        ->assertOk();
});

test('org_admin can access site settings', function () {
    $this->actingAs($this->orgAdmin)
        ->get(route('sites.settings.index'))
        ->assertOk();
});

test('site_manager can access site settings', function () {
    $this->actingAs($this->siteManager)
        ->get(route('sites.settings.index'))
        ->assertOk();
});

test('site_viewer cannot access site settings', function () {
    $this->actingAs($this->siteViewer)
        ->get(route('sites.settings.index'))
        ->assertForbidden();
});

test('technician cannot access site settings', function () {
    $this->actingAs($this->technician)
        ->get(route('sites.settings.index'))
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// org_admin+ — user management (manage users permission)
// ---------------------------------------------------------------------------

test('super_admin can access user management', function () {
    $this->actingAs($this->superAdmin)
        ->withSession(['current_org_id' => $this->org->id])
        ->get(route('users.index'))
        ->assertOk();
});

test('org_admin can access user management', function () {
    $this->actingAs($this->orgAdmin)
        ->get(route('users.index'))
        ->assertOk();
});

test('site_manager cannot access user management', function () {
    $this->actingAs($this->siteManager)
        ->get(route('users.index'))
        ->assertForbidden();
});

test('site_viewer cannot access user management', function () {
    $this->actingAs($this->siteViewer)
        ->get(route('users.index'))
        ->assertForbidden();
});

test('technician cannot access user management', function () {
    $this->actingAs($this->technician)
        ->get(route('users.index'))
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// acknowledge alerts — requires 'acknowledge alerts' permission
// super_admin, org_admin, site_manager, technician = allowed
// site_viewer = forbidden
// ---------------------------------------------------------------------------

test('super_admin can acknowledge alerts', function () {
    $alert = Alert::create([
        'rule_id' => $this->alertRule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'warning',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->actingAs($this->superAdmin)
        ->post(route('alerts.acknowledge', $alert))
        ->assertRedirect();
});

test('org_admin can acknowledge alerts', function () {
    $alert = Alert::create([
        'rule_id' => $this->alertRule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'warning',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->actingAs($this->orgAdmin)
        ->post(route('alerts.acknowledge', $alert))
        ->assertRedirect();
});

test('site_manager can acknowledge alerts', function () {
    $alert = Alert::create([
        'rule_id' => $this->alertRule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'warning',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->actingAs($this->siteManager)
        ->post(route('alerts.acknowledge', $alert))
        ->assertRedirect();
});

test('technician can acknowledge alerts', function () {
    $alert = Alert::create([
        'rule_id' => $this->alertRule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'warning',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->actingAs($this->technician)
        ->post(route('alerts.acknowledge', $alert))
        ->assertRedirect();
});

test('site_viewer can acknowledge alerts', function () {
    $this->actingAs($this->siteViewer)
        ->post(route('alerts.acknowledge', $this->alert))
        ->assertRedirect();
});
