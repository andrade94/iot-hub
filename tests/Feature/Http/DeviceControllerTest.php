<?php

use App\Models\Device;
use App\Models\Gateway;
use App\Models\Organization;
use App\Models\Recipe;
use App\Models\Site;
use App\Models\User;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->otherOrg = createOrg(['name' => 'Other Org']);
    $this->otherSite = createSite($this->otherOrg, ['name' => 'Other Site']);
});

test('org_admin can list devices for their site', function () {
    $user = createUserWithRole('org_admin', $this->org);
    createDevice($this->site, ['name' => 'Sensor A']);
    createDevice($this->site, ['name' => 'Sensor B']);

    $this->actingAs($user)
        ->get(route('devices.index', $this->site))
        ->assertOk();
});

test('site_viewer with access can list devices', function () {
    $user = createUserWithRole('site_viewer', $this->org);
    $user->sites()->attach($this->site->id, ['assigned_at' => now()]);

    createDevice($this->site);

    $this->actingAs($user)
        ->get(route('devices.index', $this->site))
        ->assertOk();
});

test('site_viewer without access is forbidden', function () {
    $user = createUserWithRole('site_viewer', $this->org);
    // No site attachment

    $this->actingAs($user)
        ->get(route('devices.index', $this->site))
        ->assertForbidden();
});

test('devices can be filtered by status', function () {
    $user = createUserWithRole('org_admin', $this->org);
    createDevice($this->site, ['name' => 'Active', 'status' => 'active']);
    createDevice($this->site, ['name' => 'Pending', 'status' => 'pending']);

    $this->actingAs($user)
        ->get(route('devices.index', ['site' => $this->site, 'status' => 'active']))
        ->assertOk();
});

test('devices can be searched by name', function () {
    $user = createUserWithRole('org_admin', $this->org);
    createDevice($this->site, ['name' => 'Kitchen Sensor']);
    createDevice($this->site, ['name' => 'Lobby Sensor']);

    $this->actingAs($user)
        ->get(route('devices.index', ['site' => $this->site, 'search' => 'Kitchen']))
        ->assertOk();
});

test('org_admin can store a device', function () {
    $user = createUserWithRole('org_admin', $this->org);

    $this->actingAs($user)
        ->post(route('devices.store', $this->site), [
            'model' => 'EM300-TH',
            'dev_eui' => 'AABBCCDD11223344',
            'name' => 'New Sensor',
        ])
        ->assertRedirect();

    expect(Device::where('dev_eui', 'AABBCCDD11223344')->exists())->toBeTrue();
    expect(Device::where('dev_eui', 'AABBCCDD11223344')->first()->status)->toBe('pending');
});

test('store device fails with duplicate dev_eui', function () {
    $user = createUserWithRole('org_admin', $this->org);
    createDevice($this->site, ['dev_eui' => 'DUPLICATE1234']);

    $this->actingAs($user)
        ->post(route('devices.store', $this->site), [
            'model' => 'EM300-TH',
            'dev_eui' => 'DUPLICATE1234',
            'name' => 'Dup Sensor',
        ])
        ->assertSessionHasErrors('dev_eui');
});

test('store device fails without required fields', function () {
    $user = createUserWithRole('org_admin', $this->org);

    $this->actingAs($user)
        ->post(route('devices.store', $this->site), [])
        ->assertSessionHasErrors(['model', 'dev_eui', 'name']);
});

test('site_viewer cannot store devices', function () {
    $user = createUserWithRole('site_viewer', $this->org);
    $user->sites()->attach($this->site->id, ['assigned_at' => now()]);

    $this->actingAs($user)
        ->post(route('devices.store', $this->site), [
            'model' => 'EM300-TH',
            'dev_eui' => 'AABBCCDD11223345',
            'name' => 'Forbidden Sensor',
        ])
        ->assertForbidden();
});

test('org_admin can view a device', function () {
    $user = createUserWithRole('org_admin', $this->org);
    $device = createDevice($this->site);

    $this->actingAs($user)
        ->get(route('devices.show', [$this->site, $device]))
        ->assertOk();
});

test('org_admin can update a device', function () {
    $user = createUserWithRole('org_admin', $this->org);
    $device = createDevice($this->site, ['name' => 'Old Name']);

    $this->actingAs($user)
        ->put(route('devices.update', [$this->site, $device]), [
            'name' => 'New Name',
            'zone' => 'Kitchen',
        ])
        ->assertRedirect();

    expect($device->fresh()->name)->toBe('New Name');
    expect($device->fresh()->zone)->toBe('Kitchen');
});

test('org_admin can delete a device', function () {
    $user = createUserWithRole('org_admin', $this->org);
    $device = createDevice($this->site);

    $this->actingAs($user)
        ->delete(route('devices.destroy', [$this->site, $device]))
        ->assertRedirect();

    expect(Device::find($device->id))->toBeNull();
});

test('user from another org cannot access devices', function () {
    $user = createUserWithRole('org_admin', $this->otherOrg);

    $this->actingAs($user)
        ->get(route('devices.index', $this->site))
        ->assertForbidden();
});

test('guest is redirected to login', function () {
    $this->get(route('devices.index', $this->site))
        ->assertRedirect(route('login'));
});
