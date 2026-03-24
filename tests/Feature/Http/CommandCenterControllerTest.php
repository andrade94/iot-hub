<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\WorkOrder;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->superAdmin = createUserWithRole('super_admin');
    $this->orgAdmin = createUserWithRole('client_org_admin', $this->org);
});

test('super_admin can access command center index', function () {
    $this->actingAs($this->superAdmin)
        ->get(route('command-center.index'))
        ->assertOk();
});

test('super_admin sees stats in command center', function () {
    createDevice($this->site);

    $this->actingAs($this->superAdmin)
        ->get(route('command-center.index'))
        ->assertOk();
});

test('super_admin can access command center alerts', function () {
    $this->actingAs($this->superAdmin)
        ->get(route('command-center.alerts'))
        ->assertOk();
});

test('super_admin can access command center work orders', function () {
    $this->actingAs($this->superAdmin)
        ->get(route('command-center.work-orders'))
        ->assertOk();
});

test('super_admin can access command center devices', function () {
    $this->actingAs($this->superAdmin)
        ->get(route('command-center.devices'))
        ->assertOk();
});

test('org_admin is forbidden from command center', function () {
    $this->actingAs($this->orgAdmin)
        ->get(route('command-center.index'))
        ->assertForbidden();
});

test('site_manager is forbidden from command center', function () {
    $manager = createUserWithRole('client_site_manager', $this->org);

    $this->actingAs($manager)
        ->get(route('command-center.index'))
        ->assertForbidden();
});

test('guest is redirected from command center', function () {
    $this->get(route('command-center.index'))
        ->assertRedirect(route('login'));
});
