<?php

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg(['name' => 'Manager Org']);
    $this->assignedSite = createSite($this->org, ['name' => 'Assigned Site', 'status' => 'active']);
    $this->unassignedSite = createSite($this->org, ['name' => 'Unassigned Site', 'status' => 'active']);
    $this->user = createUserWithRole('client_site_manager', $this->org);
    $this->user->sites()->attach($this->assignedSite->id, ['assigned_at' => now()]);
    // NOT attached to unassignedSite

    \App\Models\Device::create(['site_id' => $this->assignedSite->id, 'model' => 'EM300-TH', 'dev_eui' => 'SITEMGR00000001', 'name' => 'Assigned Device', 'status' => 'active']);
    \App\Models\Device::create(['site_id' => $this->unassignedSite->id, 'model' => 'EM300-TH', 'dev_eui' => 'SITEMGR00000002', 'name' => 'Unassigned Device', 'status' => 'active']);
});

// ═══ Pages that MUST return 200 ═══
test('site_manager can access Dashboard', fn () => $this->actingAs($this->user)->get('/dashboard')->assertOk());
test('site_manager can access Alerts', fn () => $this->actingAs($this->user)->get('/alerts')->assertOk());
test('site_manager can access Work Orders', fn () => $this->actingAs($this->user)->get('/work-orders')->assertOk());
test('site_manager can access Sites list', fn () => $this->actingAs($this->user)->get('/sites')->assertOk());
test('site_manager can access Devices', fn () => $this->actingAs($this->user)->get('/devices')->assertOk());
test('site_manager can access Recipes', fn () => $this->actingAs($this->user)->get('/recipes')->assertOk());
test('site_manager can access Performance', fn () => $this->actingAs($this->user)->get('/analytics/performance')->assertOk());
test('site_manager can access Compare Sites', fn () => $this->actingAs($this->user)->get('/sites/compare')->assertOk());
test('site_manager can access Alert Tuning', fn () => $this->actingAs($this->user)->get('/analytics/alerts')->assertOk());
test('site_manager can access Predictive', fn () => $this->actingAs($this->user)->get('/analytics/predictions')->assertOk());
test('site_manager can access Activity', fn () => $this->actingAs($this->user)->get('/activity-log')->assertOk());
test('site_manager cannot access Users (requires manage users)', fn () => $this->actingAs($this->user)->get('/settings/users')->assertForbidden());
test('site_manager can access Profile', fn () => $this->actingAs($this->user)->get('/settings/profile')->assertOk());

// ═══ Pages that MUST return 403 ═══
test('site_manager cannot access Organizations', fn () => $this->actingAs($this->user)->get('/settings/organizations')->assertForbidden());
test('site_manager cannot access Gateways', fn () => $this->actingAs($this->user)->get('/settings/gateways')->assertForbidden());
test('site_manager cannot access Sensor Models', fn () => $this->actingAs($this->user)->get('/settings/sensor-models')->assertForbidden());
test('site_manager cannot access Modules', fn () => $this->actingAs($this->user)->get('/settings/modules-catalog')->assertForbidden());
test('site_manager cannot access Segments', fn () => $this->actingAs($this->user)->get('/settings/segments')->assertForbidden());
test('site_manager cannot access Compliance', fn () => $this->actingAs($this->user)->get('/settings/compliance')->assertForbidden());
test('site_manager cannot access Site Templates', fn () => $this->actingAs($this->user)->get('/settings/site-templates')->assertForbidden());

// ═══ Site isolation ═══
test('site_manager can view assigned site', function () {
    $this->actingAs($this->user)->get("/sites/{$this->assignedSite->id}")->assertOk();
});

test('site_manager cannot view unassigned site', function () {
    $this->actingAs($this->user)->get("/sites/{$this->unassignedSite->id}")->assertForbidden();
});

// ═══ Workflows ═══
test('site_manager can create work order on assigned site', function () {
    $this->actingAs($this->user)->post("/sites/{$this->assignedSite->id}/work-orders", [
        'title' => 'Manager WO', 'type' => 'maintenance', 'priority' => 'medium',
    ])->assertRedirect();
    expect(\App\Models\WorkOrder::where('title', 'Manager WO')->exists())->toBeTrue();
});

test('site_manager cannot create work order on unassigned site', function () {
    $this->actingAs($this->user)->post("/sites/{$this->unassignedSite->id}/work-orders", [
        'title' => 'Sneaky WO', 'type' => 'maintenance', 'priority' => 'medium',
    ])->assertForbidden();
});

test('site_manager can add device to assigned site', function () {
    $this->actingAs($this->user)->post("/sites/{$this->assignedSite->id}/devices", [
        'model' => 'WS301', 'dev_eui' => 'SITEMGR00000010', 'name' => 'New Sensor',
    ])->assertRedirect();
});

test('site_manager cannot add device to unassigned site', function () {
    $this->actingAs($this->user)->post("/sites/{$this->unassignedSite->id}/devices", [
        'model' => 'WS301', 'dev_eui' => 'SITEMGR00000011', 'name' => 'Sneaky',
    ])->assertForbidden();
});
