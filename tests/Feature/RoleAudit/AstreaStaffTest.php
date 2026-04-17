<?php

/**
 * Astrea staff roles: support + account_manager.
 * Both have org_id=null (platform-level users).
 */

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg(['name' => 'Client Org']);
    $this->site = createSite($this->org, ['name' => 'Client Site', 'status' => 'active']);
    \App\Models\Device::create(['site_id' => $this->site->id, 'model' => 'EM300-TH', 'dev_eui' => 'ASTREA000000001', 'name' => 'Test', 'status' => 'active']);
});

// ═══════════════════════════════════════════════════════════════
//  SUPPORT ROLE
// ═══════════════════════════════════════════════════════════════

test('support can access Dashboard', function () {
    $user = createUserWithRole('support'); // no org_id
    $this->actingAs($user)->get('/dashboard')->assertOk();
});

test('support can access Alerts', function () {
    $user = createUserWithRole('support');
    $this->actingAs($user)->get('/alerts')->assertOk();
});

test('support can access Work Orders', function () {
    $user = createUserWithRole('support');
    $this->actingAs($user)->get('/work-orders')->assertOk();
});

test('support can access Sites', function () {
    $user = createUserWithRole('support');
    $this->actingAs($user)->get('/sites')->assertOk();
});

test('support can access Devices', function () {
    $user = createUserWithRole('support');
    $this->actingAs($user)->get('/devices')->assertOk();
});

test('support can access Performance', function () {
    $user = createUserWithRole('support');
    $this->actingAs($user)->get('/analytics/performance')->assertOk();
});

test('support can access Activity', function () {
    $user = createUserWithRole('support');
    $this->actingAs($user)->get('/activity-log')->assertOk();
});

test('support can access Predictive', function () {
    $user = createUserWithRole('support');
    $this->actingAs($user)->get('/analytics/predictions')->assertOk();
});

test('support can access Site Templates', function () {
    $user = createUserWithRole('support');
    $this->actingAs($user)->get('/settings/site-templates')->assertOk();
});

test('support cannot access Organizations catalog (not super_admin)', function () {
    $user = createUserWithRole('support');
    $this->actingAs($user)->get('/settings/organizations')->assertForbidden();
});

test('support cannot access Gateways (not super_admin)', function () {
    $user = createUserWithRole('support');
    $this->actingAs($user)->get('/settings/gateways')->assertForbidden();
});

// ═══════════════════════════════════════════════════════════════
//  ACCOUNT MANAGER ROLE
// ═══════════════════════════════════════════════════════════════

test('account_manager can access Dashboard', function () {
    $user = createUserWithRole('account_manager');
    $this->actingAs($user)->get('/dashboard')->assertOk();
});

test('account_manager can access Alerts', function () {
    $user = createUserWithRole('account_manager');
    $this->actingAs($user)->get('/alerts')->assertOk();
});

test('account_manager can access Sites', function () {
    $user = createUserWithRole('account_manager');
    $this->actingAs($user)->get('/sites')->assertOk();
});

test('account_manager can access Devices', function () {
    $user = createUserWithRole('account_manager');
    $this->actingAs($user)->get('/devices')->assertOk();
});

test('account_manager can access Activity', function () {
    $user = createUserWithRole('account_manager');
    $this->actingAs($user)->get('/activity-log')->assertOk();
});

test('account_manager can access Performance', function () {
    $user = createUserWithRole('account_manager');
    $this->actingAs($user)->get('/analytics/performance')->assertOk();
});

test('account_manager cannot access Users (no manage users)', function () {
    $user = createUserWithRole('account_manager');
    $this->actingAs($user)->get('/settings/users')->assertForbidden();
});

test('account_manager cannot access Organizations catalog', function () {
    $user = createUserWithRole('account_manager');
    $this->actingAs($user)->get('/settings/organizations')->assertForbidden();
});

test('account_manager cannot access Compliance', function () {
    $user = createUserWithRole('account_manager');
    $this->actingAs($user)->get('/settings/compliance')->assertForbidden();
});

test('account_manager cannot access Site Templates', function () {
    $user = createUserWithRole('account_manager');
    $this->actingAs($user)->get('/settings/site-templates')->assertForbidden();
});
