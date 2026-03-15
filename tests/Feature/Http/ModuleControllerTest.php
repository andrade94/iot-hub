<?php

use App\Models\Module;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('org_admin', $this->org);
});

test('org_admin can list modules for a site', function () {
    Module::create(['slug' => 'cold-chain', 'name' => 'Cold Chain']);

    $this->actingAs($this->user)
        ->get(route('modules.index', $this->site))
        ->assertOk();
});

test('org_admin can activate a module', function () {
    $module = Module::create(['slug' => 'energy', 'name' => 'Energy']);

    $this->actingAs($this->user)
        ->post(route('modules.toggle', [$this->site, $module]))
        ->assertRedirect();

    expect($this->site->modules()->where('modules.id', $module->id)->exists())->toBeTrue();
});

test('org_admin can deactivate a module', function () {
    $module = Module::create(['slug' => 'energy', 'name' => 'Energy']);
    $this->site->modules()->attach($module->id, ['activated_at' => now()]);

    $this->actingAs($this->user)
        ->post(route('modules.toggle', [$this->site, $module]))
        ->assertRedirect();

    expect($this->site->modules()->where('modules.id', $module->id)->exists())->toBeFalse();
});

test('site_viewer cannot manage modules', function () {
    $viewer = createUserWithRole('site_viewer', $this->org);
    $viewer->sites()->attach($this->site->id, ['assigned_at' => now()]);
    $module = Module::create(['slug' => 'test', 'name' => 'Test']);

    $this->actingAs($viewer)
        ->post(route('modules.toggle', [$this->site, $module]))
        ->assertForbidden();
});

test('guest is redirected', function () {
    $module = Module::create(['slug' => 'test', 'name' => 'Test']);

    $this->get(route('modules.index', $this->site))
        ->assertRedirect(route('login'));
});
