<?php

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('org_admin', $this->org);
});

test('org_admin can view site detail', function () {
    $this->actingAs($this->user)
        ->get(route('sites.show', $this->site))
        ->assertOk();
});

test('site detail loads devices and zones', function () {
    createDevice($this->site, ['zone' => 'Kitchen']);
    createDevice($this->site, ['zone' => 'Freezer']);

    $this->actingAs($this->user)
        ->get(route('sites.show', $this->site))
        ->assertOk();
});

test('org_admin can view zone detail', function () {
    createDevice($this->site, ['zone' => 'Kitchen']);

    $this->actingAs($this->user)
        ->get(route('sites.zone', [$this->site, 'Kitchen']))
        ->assertOk();
});

test('user from another org cannot view site', function () {
    $otherOrg = createOrg(['name' => 'Other']);
    $otherUser = createUserWithRole('org_admin', $otherOrg);

    $this->actingAs($otherUser)
        ->get(route('sites.show', $this->site))
        ->assertForbidden();
});

test('site_viewer with access can view site', function () {
    $viewer = createUserWithRole('site_viewer', $this->org);
    $viewer->sites()->attach($this->site->id, ['assigned_at' => now()]);

    $this->actingAs($viewer)
        ->get(route('sites.show', $this->site))
        ->assertOk();
});

test('guest is redirected', function () {
    $this->get(route('sites.show', $this->site))
        ->assertRedirect(route('login'));
});
