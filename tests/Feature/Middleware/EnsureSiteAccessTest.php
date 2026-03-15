<?php

use App\Models\User;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->otherOrg = createOrg(['name' => 'Other']);
    $this->otherSite = createSite($this->otherOrg, ['name' => 'Other Site']);
});

test('org_admin can access their org sites', function () {
    $user = createUserWithRole('org_admin', $this->org);

    $this->actingAs($user)
        ->get(route('sites.show', $this->site))
        ->assertOk();
});

test('org_admin cannot access other org sites', function () {
    $user = createUserWithRole('org_admin', $this->org);

    $this->actingAs($user)
        ->get(route('sites.show', $this->otherSite))
        ->assertForbidden();
});

test('site_viewer can access assigned sites', function () {
    $user = createUserWithRole('site_viewer', $this->org);
    $user->sites()->attach($this->site->id, ['assigned_at' => now()]);

    $this->actingAs($user)
        ->get(route('sites.show', $this->site))
        ->assertOk();
});

test('site_viewer cannot access unassigned sites', function () {
    $user = createUserWithRole('site_viewer', $this->org);
    // No site attachment

    $this->actingAs($user)
        ->get(route('sites.show', $this->site))
        ->assertForbidden();
});
