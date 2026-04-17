<?php

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg(['name' => 'Test Org']);
    $this->site = createSite($this->org, ['name' => 'Test Site', 'status' => 'active']);
    $this->user = createUserWithRole('super_admin');
    // super_admin has no org_id — they see everything
    \App\Models\Device::create(['site_id' => $this->site->id, 'model' => 'EM300-TH', 'dev_eui' => 'SUPERADMIN000001', 'name' => 'Test', 'status' => 'active']);
});

// ═══ Pages that MUST return 200 ═══

test('super_admin can access Dashboard', fn () => $this->actingAs($this->user)->get('/dashboard')->assertOk());
test('super_admin can access Alerts', fn () => $this->actingAs($this->user)->get('/alerts')->assertOk());
test('super_admin can access Work Orders', fn () => $this->actingAs($this->user)->get('/work-orders')->assertOk());
test('super_admin can access Organizations', fn () => $this->actingAs($this->user)->get('/settings/organizations')->assertOk());
test('super_admin can access Sites', fn () => $this->actingAs($this->user)->get('/sites')->assertOk());
test('super_admin can access Users', fn () => $this->actingAs($this->user)->get('/settings/users')->assertOk());
test('super_admin can access Devices', fn () => $this->actingAs($this->user)->get('/devices')->assertOk());
test('super_admin can access Gateways', fn () => $this->actingAs($this->user)->get('/settings/gateways')->assertOk());
test('super_admin can access Sensor Models', fn () => $this->actingAs($this->user)->get('/settings/sensor-models')->assertOk());
test('super_admin can access Modules', fn () => $this->actingAs($this->user)->get('/settings/modules-catalog')->assertOk());
test('super_admin can access Recipes', fn () => $this->actingAs($this->user)->get('/recipes')->assertOk());
test('super_admin can access Segments', fn () => $this->actingAs($this->user)->get('/settings/segments')->assertOk());
test('super_admin can access Performance', fn () => $this->actingAs($this->user)->get('/analytics/performance')->assertOk());
test('super_admin can access Compare Sites', fn () => $this->actingAs($this->user)->get('/sites/compare')->assertOk());
test('super_admin can access Alert Tuning', fn () => $this->actingAs($this->user)->get('/analytics/alerts')->assertOk());
test('super_admin can access Predictive', fn () => $this->actingAs($this->user)->get('/analytics/predictions')->assertOk());
test('super_admin can access Activity', fn () => $this->actingAs($this->user)->get('/activity-log')->assertOk());
test('super_admin can access Compliance', fn () => $this->actingAs($this->user)->get('/settings/compliance')->assertOk());
test('super_admin can access Site Templates', fn () => $this->actingAs($this->user)->get('/settings/site-templates')->assertOk());
test('super_admin can access Data Export', fn () => $this->actingAs($this->user)->get('/settings/export-data')->assertOk());
test('super_admin can access Profile', fn () => $this->actingAs($this->user)->get('/settings/profile')->assertOk());

// ═══ Org Settings redirect ═══
test('super_admin org settings redirects to org catalog', function () {
    $this->actingAs($this->user)->get('/settings/organization')->assertRedirect('/settings/organizations');
});

// ═══ Workflows ═══
test('super_admin can create organization', function () {
    \App\Models\Segment::firstOrCreate(['name' => 'test_segment'], ['name' => 'test_segment', 'label' => 'Test Segment', 'active' => true]);
    $this->actingAs($this->user)->post('/settings/organizations', [
        'name' => 'New Org', 'slug' => 'new-org', 'segment' => 'test_segment', 'plan' => 'standard',
    ])->assertRedirect();
    expect(\App\Models\Organization::where('slug', 'new-org')->exists())->toBeTrue();
});

test('super_admin can view any org', function () {
    $this->actingAs($this->user)->get("/settings/organizations/{$this->org->id}")->assertOk();
});

test('super_admin can view any site', function () {
    $this->actingAs($this->user)->get("/sites/{$this->site->id}")->assertOk();
});

test('super_admin can create site with explicit org_id', function () {
    $this->actingAs($this->user)->post('/settings/sites', [
        'name' => 'Super Site', 'status' => 'draft', 'org_id' => $this->org->id,
    ])->assertRedirect();
    expect(\App\Models\Site::where('name', 'Super Site')->exists())->toBeTrue();
});
