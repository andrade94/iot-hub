<?php

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg(['name' => 'Tech Org']);
    $this->site = createSite($this->org, ['name' => 'Tech Site', 'status' => 'active']);
    $this->otherSite = createSite($this->org, ['name' => 'Other Site', 'status' => 'active']);
    $this->user = createUserWithRole('technician', $this->org);
    $this->user->sites()->attach($this->site->id, ['assigned_at' => now()]);

    \App\Models\Device::create(['site_id' => $this->site->id, 'model' => 'EM300-TH', 'dev_eui' => 'TECHNIC00000001', 'name' => 'Tech Device', 'status' => 'active']);

    $this->wo = \App\Models\WorkOrder::create([
        'site_id' => $this->site->id, 'title' => 'Tech WO', 'type' => 'maintenance',
        'priority' => 'medium', 'status' => 'assigned', 'assigned_to' => $this->user->id,
        'created_by' => $this->user->id,
    ]);
});

// ═══ Pages that MUST return 200 ═══
test('technician can access Dashboard', fn () => $this->actingAs($this->user)->get('/dashboard')->assertOk());
test('technician can access Alerts', fn () => $this->actingAs($this->user)->get('/alerts')->assertOk());
test('technician can access Work Orders', fn () => $this->actingAs($this->user)->get('/work-orders')->assertOk());
test('technician can access Sites list', fn () => $this->actingAs($this->user)->get('/sites')->assertOk());
test('technician can access Devices', fn () => $this->actingAs($this->user)->get('/devices')->assertOk());
test('technician can access Recipes', fn () => $this->actingAs($this->user)->get('/recipes')->assertOk());
test('technician can access Performance', fn () => $this->actingAs($this->user)->get('/analytics/performance')->assertOk());
test('technician can access Compare Sites', fn () => $this->actingAs($this->user)->get('/sites/compare')->assertOk());
test('technician can access Predictive', fn () => $this->actingAs($this->user)->get('/analytics/predictions')->assertOk());
test('technician can access Profile', fn () => $this->actingAs($this->user)->get('/settings/profile')->assertOk());
test('technician can access assigned site', fn () => $this->actingAs($this->user)->get("/sites/{$this->site->id}")->assertOk());
test('technician can view assigned WO', fn () => $this->actingAs($this->user)->get("/work-orders/{$this->wo->id}")->assertOk());

// ═══ Pages that MUST return 403 ═══
test('technician cannot access Users', fn () => $this->actingAs($this->user)->get('/settings/users')->assertForbidden());
test('technician cannot access Activity', fn () => $this->actingAs($this->user)->get('/activity-log')->assertForbidden());
test('technician cannot access Alert Tuning', fn () => $this->actingAs($this->user)->get('/analytics/alerts')->assertForbidden());
test('technician cannot access Organizations', fn () => $this->actingAs($this->user)->get('/settings/organizations')->assertForbidden());
test('technician cannot access Compliance', fn () => $this->actingAs($this->user)->get('/settings/compliance')->assertForbidden());
test('technician cannot access Site Templates', fn () => $this->actingAs($this->user)->get('/settings/site-templates')->assertForbidden());
test('technician cannot access Gateways', fn () => $this->actingAs($this->user)->get('/settings/gateways')->assertForbidden());

// ═══ Site isolation ═══
test('technician cannot access unassigned site', function () {
    $this->actingAs($this->user)->get("/sites/{$this->otherSite->id}")->assertForbidden();
});

// ═══ Workflows ═══
test('technician can start an assigned work order', function () {
    $this->actingAs($this->user)
        ->put("/work-orders/{$this->wo->id}/status", ['status' => 'in_progress'])
        ->assertRedirect();
    expect($this->wo->fresh()->status)->toBe('in_progress');
});

test('technician can add note to work order', function () {
    $this->actingAs($this->user)
        ->post("/work-orders/{$this->wo->id}/notes", ['note' => 'Fixed the sensor'])
        ->assertRedirect();
    expect(\App\Models\WorkOrderNote::where('note', 'Fixed the sensor')->exists())->toBeTrue();
});

test('technician cannot create work orders', function () {
    $this->actingAs($this->user)
        ->post("/sites/{$this->site->id}/work-orders", [
            'title' => 'Tech Created', 'type' => 'maintenance', 'priority' => 'low',
        ])
        ->assertForbidden();
});

test('technician cannot create devices', function () {
    $this->actingAs($this->user)
        ->post("/sites/{$this->site->id}/devices", [
            'model' => 'WS301', 'dev_eui' => 'TECHNIC00000010', 'name' => 'Sneaky',
        ])
        ->assertForbidden();
});

test('technician cannot create sites', function () {
    $this->actingAs($this->user)
        ->post('/settings/sites', ['name' => 'Tech Site', 'status' => 'draft'])
        ->assertForbidden();
});
