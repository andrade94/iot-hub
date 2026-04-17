<?php

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg(['name' => 'Viewer Org']);
    $this->site = createSite($this->org, ['name' => 'Viewer Site', 'status' => 'active']);
    $this->otherSite = createSite($this->org, ['name' => 'Other Site', 'status' => 'active']);
    $this->user = createUserWithRole('client_site_viewer', $this->org);
    $this->user->sites()->attach($this->site->id, ['assigned_at' => now()]);

    \App\Models\Device::create(['site_id' => $this->site->id, 'model' => 'EM300-TH', 'dev_eui' => 'VIEWER000000001', 'name' => 'Viewer Device', 'status' => 'active']);
});

// ═══ Pages that MUST return 200 (read-only) ═══
test('viewer can access Dashboard', fn () => $this->actingAs($this->user)->get('/dashboard')->assertOk());
test('viewer can access Alerts', fn () => $this->actingAs($this->user)->get('/alerts')->assertOk());
test('viewer can access Sites list', fn () => $this->actingAs($this->user)->get('/sites')->assertOk());
test('viewer can access Devices', fn () => $this->actingAs($this->user)->get('/devices')->assertOk());
test('viewer can access Recipes', fn () => $this->actingAs($this->user)->get('/recipes')->assertOk());
test('viewer can access Performance', fn () => $this->actingAs($this->user)->get('/analytics/performance')->assertOk());
test('viewer can access Compare Sites', fn () => $this->actingAs($this->user)->get('/sites/compare')->assertOk());
test('viewer can access Predictive', fn () => $this->actingAs($this->user)->get('/analytics/predictions')->assertOk());
test('viewer can access Profile', fn () => $this->actingAs($this->user)->get('/settings/profile')->assertOk());
test('viewer can access assigned site', fn () => $this->actingAs($this->user)->get("/sites/{$this->site->id}")->assertOk());

// ═══ Pages that MUST return 403 ═══
test('viewer cannot access Work Orders', fn () => $this->actingAs($this->user)->get('/work-orders')->assertForbidden());
test('viewer cannot access Users', fn () => $this->actingAs($this->user)->get('/settings/users')->assertForbidden());
test('viewer cannot access Activity', fn () => $this->actingAs($this->user)->get('/activity-log')->assertForbidden());
test('viewer cannot access Alert Tuning', fn () => $this->actingAs($this->user)->get('/analytics/alerts')->assertForbidden());
test('viewer cannot access Organizations', fn () => $this->actingAs($this->user)->get('/settings/organizations')->assertForbidden());
test('viewer cannot access Compliance', fn () => $this->actingAs($this->user)->get('/settings/compliance')->assertForbidden());
test('viewer cannot access Site Templates', fn () => $this->actingAs($this->user)->get('/settings/site-templates')->assertForbidden());
test('viewer cannot access Gateways', fn () => $this->actingAs($this->user)->get('/settings/gateways')->assertForbidden());

// ═══ Site isolation ═══
test('viewer cannot access unassigned site', function () {
    $this->actingAs($this->user)->get("/sites/{$this->otherSite->id}")->assertForbidden();
});

// ═══ Cannot modify anything ═══
test('viewer cannot create work orders', function () {
    $this->actingAs($this->user)->post("/sites/{$this->site->id}/work-orders", [
        'title' => 'Viewer WO', 'type' => 'maintenance', 'priority' => 'low',
    ])->assertForbidden();
});

test('viewer cannot create devices', function () {
    $this->actingAs($this->user)->post("/sites/{$this->site->id}/devices", [
        'model' => 'WS301', 'dev_eui' => 'VIEWER000000010', 'name' => 'Sneaky',
    ])->assertForbidden();
});

test('viewer cannot create sites', function () {
    $this->actingAs($this->user)->post('/settings/sites', [
        'name' => 'Viewer Site', 'status' => 'draft',
    ])->assertForbidden();
});
