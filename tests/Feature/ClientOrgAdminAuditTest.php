<?php

/**
 * Full page audit for client_org_admin role.
 * Tests every page they should see and every page they shouldn't.
 */

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg(['name' => 'Client Test Org']);
    $this->site = createSite($this->org, ['name' => 'Test Site', 'status' => 'active']);
    $this->user = createUserWithRole('client_org_admin', $this->org);
    $this->user->sites()->attach($this->site->id, ['assigned_at' => now()]);

    // Create some devices so pages have data
    \App\Models\Gateway::create([
        'site_id' => $this->site->id,
        'model' => 'UG65',
        'serial' => 'GW-AUDIT-001',
    ]);
    \App\Models\Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE800001',
        'name' => 'Audit Sensor',
        'status' => 'active',
    ]);
});

// ═══════════════════════════════════════════════════════════════
//  Pages the client_org_admin SHOULD see (200 OK)
// ═══════════════════════════════════════════════════════════════

test('client_org_admin can access Dashboard', function () {
    $this->actingAs($this->user)->get('/dashboard')->assertOk();
});

test('client_org_admin can access Alerts', function () {
    $this->actingAs($this->user)->get('/alerts')->assertOk();
});

test('client_org_admin can access Work Orders', function () {
    $this->actingAs($this->user)->get('/work-orders')->assertOk();
});

test('client_org_admin can access Sites', function () {
    $this->actingAs($this->user)->get('/sites')->assertOk();
});

test('client_org_admin can access Users', function () {
    $this->actingAs($this->user)->get('/settings/users')->assertOk();
});

test('client_org_admin can access Devices', function () {
    $this->actingAs($this->user)->get('/devices')->assertOk();
});

test('client_org_admin can access Recipes', function () {
    $this->actingAs($this->user)->get('/recipes')->assertOk();
});

test('client_org_admin can access Performance', function () {
    $this->actingAs($this->user)->get('/analytics/performance')->assertOk();
});

test('client_org_admin can access Compare Sites', function () {
    $this->actingAs($this->user)->get('/sites/compare')->assertOk();
});

test('client_org_admin can access Alert Tuning', function () {
    $this->actingAs($this->user)->get('/analytics/alerts')->assertOk();
});

test('client_org_admin can access Predictive', function () {
    $this->actingAs($this->user)->get('/analytics/predictions')->assertOk();
});

test('client_org_admin can access Activity', function () {
    $this->actingAs($this->user)->get('/activity-log')->assertOk();
});

test('client_org_admin can access Org Settings (redirect to edit)', function () {
    $this->actingAs($this->user)
        ->get('/settings/organization')
        ->assertRedirect("/settings/organizations/{$this->org->id}/edit");
});

test('client_org_admin can access their org edit page', function () {
    $this->actingAs($this->user)
        ->get("/settings/organizations/{$this->org->id}/edit")
        ->assertOk();
});

test('client_org_admin can access Compliance', function () {
    $this->actingAs($this->user)->get('/settings/compliance')->assertOk();
});

test('client_org_admin can access Site Templates', function () {
    $this->actingAs($this->user)->get('/settings/site-templates')->assertOk();
});

test('client_org_admin can access Data Export', function () {
    $this->actingAs($this->user)->get('/settings/export-data')->assertOk();
});

test('client_org_admin can access Profile', function () {
    $this->actingAs($this->user)->get('/settings/profile')->assertOk();
});

test('client_org_admin can access Site detail', function () {
    $this->actingAs($this->user)->get("/sites/{$this->site->id}")->assertOk();
});

// ═══════════════════════════════════════════════════════════════
//  Pages the client_org_admin should NOT see (403)
// ═══════════════════════════════════════════════════════════════

test('client_org_admin cannot access Organizations catalog', function () {
    $this->actingAs($this->user)->get('/settings/organizations')->assertForbidden();
});

test('client_org_admin cannot access Gateways', function () {
    $this->actingAs($this->user)->get('/settings/gateways')->assertForbidden();
});

test('client_org_admin cannot access Sensor Models', function () {
    $this->actingAs($this->user)->get('/settings/sensor-models')->assertForbidden();
});

test('client_org_admin cannot access Modules catalog', function () {
    $this->actingAs($this->user)->get('/settings/modules-catalog')->assertForbidden();
});

test('client_org_admin cannot access Segments', function () {
    $this->actingAs($this->user)->get('/settings/segments')->assertForbidden();
});

test('client_org_admin cannot access another org', function () {
    $otherOrg = createOrg(['name' => 'Other Org']);
    $this->actingAs($this->user)
        ->get("/settings/organizations/{$otherOrg->id}")
        ->assertForbidden();
});

// ═══════════════════════════════════════════════════════════════
//  Key workflows
// ═══════════════════════════════════════════════════════════════

test('client_org_admin can create a site', function () {
    $this->actingAs($this->user)
        ->post('/settings/sites', [
            'name' => 'New Site',
            'status' => 'draft',
        ])
        ->assertRedirect();

    expect(\App\Models\Site::where('name', 'New Site')->exists())->toBeTrue();
});

test('client_org_admin can create a work order', function () {
    $this->actingAs($this->user)
        ->post("/sites/{$this->site->id}/work-orders", [
            'title' => 'Test WO',
            'type' => 'maintenance',
            'priority' => 'medium',
        ])
        ->assertRedirect();

    expect(\App\Models\WorkOrder::where('title', 'Test WO')->exists())->toBeTrue();
});

test('client_org_admin can create a device', function () {
    $this->actingAs($this->user)
        ->post("/sites/{$this->site->id}/devices", [
            'model' => 'EM300-TH',
            'dev_eui' => 'A81758FFFE800099',
            'name' => 'New Device',
        ])
        ->assertRedirect();

    expect(\App\Models\Device::where('dev_eui', 'A81758FFFE800099')->exists())->toBeTrue();
});
