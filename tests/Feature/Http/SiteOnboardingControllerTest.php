<?php

use App\Models\Gateway;
use App\Models\Module;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org, ['status' => 'onboarding']);
    $this->user = createUserWithRole('org_admin', $this->org);
});

test('org_admin can view onboarding wizard', function () {
    $this->actingAs($this->user)
        ->get(route('sites.onboard', $this->site))
        ->assertOk();
});

test('step is determined from site state', function () {
    // No gateway yet, should show step 1
    $this->actingAs($this->user)
        ->get(route('sites.onboard', $this->site))
        ->assertOk();
});

test('org_admin can register a gateway during onboarding', function () {
    $this->actingAs($this->user)
        ->post(route('sites.onboard.gateway', $this->site), [
            'model' => 'UG65',
            'serial' => 'GW-OB-001',
        ])
        ->assertRedirect();

    expect(Gateway::where('serial', 'GW-OB-001')->exists())->toBeTrue();
});

test('org_admin can register devices during onboarding', function () {
    Gateway::create(['site_id' => $this->site->id, 'model' => 'UG65', 'serial' => 'GW-1', 'status' => 'online']);

    $this->actingAs($this->user)
        ->post(route('sites.onboard.devices', $this->site), [
            'devices' => [
                ['model' => 'EM300-TH', 'dev_eui' => 'AA11BB22CC33DD44', 'name' => 'Freezer 1'],
                ['model' => 'WS301', 'dev_eui' => 'EE55FF66AA77BB88', 'name' => 'Door 1'],
            ],
        ])
        ->assertRedirect();

    expect($this->site->devices()->count())->toBe(2);
});

test('device registration validates dev_eui uniqueness', function () {
    createDevice($this->site, ['dev_eui' => 'EXISTINGDEVICE01']);

    $this->actingAs($this->user)
        ->post(route('sites.onboard.devices', $this->site), [
            'devices' => [
                ['model' => 'EM300-TH', 'dev_eui' => 'EXISTINGDEVICE01', 'name' => 'Dup'],
            ],
        ])
        ->assertSessionHasErrors();
});

test('org_admin can activate modules during onboarding', function () {
    $module = Module::create(['slug' => 'cold-chain', 'name' => 'Cold Chain']);

    $this->actingAs($this->user)
        ->post(route('sites.onboard.modules', $this->site), [
            'module_ids' => [$module->id],
        ])
        ->assertRedirect();

    expect($this->site->modules()->count())->toBe(1);
});

test('module activation requires valid module ids', function () {
    $this->actingAs($this->user)
        ->post(route('sites.onboard.modules', $this->site), [
            'module_ids' => [9999],
        ])
        ->assertSessionHasErrors();
});

test('org_admin can complete onboarding', function () {
    $this->actingAs($this->user)
        ->post(route('sites.onboard.complete', $this->site))
        ->assertRedirect(route('dashboard'));

    expect($this->site->fresh()->status)->toBe('active');
});

test('user from another org cannot onboard', function () {
    $otherOrg = createOrg(['name' => 'Other']);
    $otherUser = createUserWithRole('org_admin', $otherOrg);

    $this->actingAs($otherUser)
        ->get(route('sites.onboard', $this->site))
        ->assertForbidden();
});

test('guest is redirected from onboarding', function () {
    $this->get(route('sites.onboard', $this->site))
        ->assertRedirect(route('login'));
});
