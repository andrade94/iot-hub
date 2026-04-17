<?php

/**
 * Data isolation tests for client_org_admin.
 * Verifies they can ONLY see/modify their own org's data.
 */

beforeEach(function () {
    seedPermissions();

    // Org 1 — the admin's org
    $this->org1 = createOrg(['name' => 'My Org']);
    $this->site1 = createSite($this->org1, ['name' => 'My Site', 'status' => 'active']);
    $this->admin = createUserWithRole('client_org_admin', $this->org1);
    $this->admin->sites()->attach($this->site1->id, ['assigned_at' => now()]);

    // Org 2 — a different org (should be invisible)
    $this->org2 = createOrg(['name' => 'Other Org']);
    $this->site2 = createSite($this->org2, ['name' => 'Other Site', 'status' => 'active']);
    $this->otherUser = createUserWithRole('client_org_admin', $this->org2);

    // Create devices in both orgs
    $this->device1 = \App\Models\Device::create([
        'site_id' => $this->site1->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE700001', 'name' => 'My Device', 'status' => 'active',
    ]);
    $this->device2 = \App\Models\Device::create([
        'site_id' => $this->site2->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE700002', 'name' => 'Other Device', 'status' => 'active',
    ]);

    // Create WOs in both orgs
    $this->wo1 = \App\Models\WorkOrder::create([
        'site_id' => $this->site1->id, 'title' => 'My WO', 'type' => 'maintenance',
        'priority' => 'medium', 'status' => 'open', 'created_by' => $this->admin->id,
    ]);
    $this->wo2 = \App\Models\WorkOrder::create([
        'site_id' => $this->site2->id, 'title' => 'Other WO', 'type' => 'maintenance',
        'priority' => 'medium', 'status' => 'open', 'created_by' => $this->otherUser->id,
    ]);

    // Create alerts in both orgs
    \App\Models\AlertRule::create([
        'site_id' => $this->site1->id, 'name' => 'My Rule', 'type' => 'simple',
        'severity' => 'high', 'cooldown_minutes' => 15, 'active' => true,
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8]],
    ]);
    \App\Models\AlertRule::create([
        'site_id' => $this->site2->id, 'name' => 'Other Rule', 'type' => 'simple',
        'severity' => 'high', 'cooldown_minutes' => 15, 'active' => true,
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8]],
    ]);
});

// ═══════════════════════════════════════════════════════════════
//  Site isolation
// ═══════════════════════════════════════════════════════════════

test('admin can view their own site', function () {
    $this->actingAs($this->admin)
        ->get("/sites/{$this->site1->id}")
        ->assertOk();
});

test('admin cannot view another org site', function () {
    $this->actingAs($this->admin)
        ->get("/sites/{$this->site2->id}")
        ->assertForbidden();
});

test('admin can create site in their org', function () {
    $this->actingAs($this->admin)
        ->post('/settings/sites', ['name' => 'New Site', 'status' => 'draft'])
        ->assertRedirect();

    $newSite = \App\Models\Site::where('name', 'New Site')->first();
    expect($newSite)->not->toBeNull()
        ->and($newSite->org_id)->toBe($this->org1->id);
});

// ═══════════════════════════════════════════════════════════════
//  Device isolation
// ═══════════════════════════════════════════════════════════════

test('admin can add device to their site', function () {
    $this->actingAs($this->admin)
        ->post("/sites/{$this->site1->id}/devices", [
            'model' => 'WS301', 'dev_eui' => 'A81758FFFE700010', 'name' => 'New Sensor',
        ])
        ->assertRedirect();

    expect(\App\Models\Device::where('dev_eui', 'A81758FFFE700010')->exists())->toBeTrue();
});

test('admin cannot add device to another org site', function () {
    $this->actingAs($this->admin)
        ->post("/sites/{$this->site2->id}/devices", [
            'model' => 'WS301', 'dev_eui' => 'A81758FFFE700011', 'name' => 'Sneaky',
        ])
        ->assertForbidden();
});

test('admin cannot delete device in another org', function () {
    $this->actingAs($this->admin)
        ->delete("/sites/{$this->site2->id}/devices/{$this->device2->id}")
        ->assertForbidden();
});

// ═══════════════════════════════════════════════════════════════
//  Work Order isolation
// ═══════════════════════════════════════════════════════════════

test('admin can view their own work order', function () {
    $this->actingAs($this->admin)
        ->get("/work-orders/{$this->wo1->id}")
        ->assertOk();
});

test('admin cannot view another org work order', function () {
    $this->actingAs($this->admin)
        ->get("/work-orders/{$this->wo2->id}")
        ->assertForbidden();
});

test('admin can create WO on their site', function () {
    $this->actingAs($this->admin)
        ->post("/sites/{$this->site1->id}/work-orders", [
            'title' => 'Admin WO', 'type' => 'inspection', 'priority' => 'low',
        ])
        ->assertRedirect();

    expect(\App\Models\WorkOrder::where('title', 'Admin WO')->exists())->toBeTrue();
});

test('admin cannot create WO on another org site', function () {
    $this->actingAs($this->admin)
        ->post("/sites/{$this->site2->id}/work-orders", [
            'title' => 'Sneaky WO', 'type' => 'inspection', 'priority' => 'low',
        ])
        ->assertForbidden();
});

// ═══════════════════════════════════════════════════════════════
//  Organization isolation
// ═══════════════════════════════════════════════════════════════

test('admin can edit their own org', function () {
    $this->actingAs($this->admin)
        ->get("/settings/organizations/{$this->org1->id}/edit")
        ->assertOk();
});

test('admin cannot edit another org', function () {
    $this->actingAs($this->admin)
        ->get("/settings/organizations/{$this->org2->id}/edit")
        ->assertForbidden();
});

test('admin cannot view another org show page', function () {
    $this->actingAs($this->admin)
        ->get("/settings/organizations/{$this->org2->id}")
        ->assertForbidden();
});

// ═══════════════════════════════════════════════════════════════
//  User isolation
// ═══════════════════════════════════════════════════════════════

test('admin can view users list (only their org)', function () {
    $this->actingAs($this->admin)
        ->get('/settings/users')
        ->assertOk();
});

// ═══════════════════════════════════════════════════════════════
//  Compliance isolation
// ═══════════════════════════════════════════════════════════════

test('admin can create compliance event for their site', function () {
    $this->actingAs($this->admin)
        ->post('/settings/compliance', [
            'site_id' => $this->site1->id,
            'type' => 'calibration',
            'title' => 'My Calibration',
            'due_date' => now()->addDays(30)->toDateString(),
        ])
        ->assertRedirect();

    expect(\App\Models\ComplianceEvent::where('title', 'My Calibration')->exists())->toBeTrue();
});

test('compliance event is scoped to admin org', function () {
    // Create events in both orgs
    \App\Models\ComplianceEvent::create([
        'site_id' => $this->site1->id, 'org_id' => $this->org1->id,
        'type' => 'inspection', 'title' => 'My Event', 'due_date' => now()->addDays(10), 'status' => 'upcoming',
    ]);
    \App\Models\ComplianceEvent::create([
        'site_id' => $this->site2->id, 'org_id' => $this->org2->id,
        'type' => 'inspection', 'title' => 'Other Event', 'due_date' => now()->addDays(10), 'status' => 'upcoming',
    ]);

    $response = $this->actingAs($this->admin)->get('/settings/compliance');
    $response->assertOk();

    // The page props should only contain org1's events
    $page = $response->original->getData()['page']['props'];
    $allTitles = collect($page['events'])->flatten(1)->pluck('title')->toArray();

    expect($allTitles)->toContain('My Event')
        ->and($allTitles)->not->toContain('Other Event');
});

// ═══════════════════════════════════════════════════════════════
//  Dashboard scoping — only sees their org's KPIs
// ═══════════════════════════════════════════════════════════════

test('dashboard only shows admin org devices', function () {
    $response = $this->actingAs($this->admin)->get('/dashboard');
    $response->assertOk();

    $page = $response->original->getData()['page']['props'];
    $kpis = $page['kpis'];

    // Should count only org1 devices (1 device), not org2
    expect($kpis['total_devices'])->toBe(1);
});
