<?php

use Spatie\Activitylog\Models\Activity;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->user = createUserWithRole('org_admin', $this->org);
});

test('org_admin can view activity log', function () {
    $this->actingAs($this->user)
        ->get(route('activity-log'))
        ->assertOk();
});

test('activity log respects permission gate', function () {
    $viewer = createUserWithRole('site_viewer', $this->org);

    $this->actingAs($viewer)
        ->get(route('activity-log'))
        ->assertForbidden();
});

test('org_admin can view their own user activity', function () {
    $this->actingAs($this->user)
        ->get(route('activity-log.user', $this->user->id))
        ->assertOk();
});

test('non-admin cannot view other user activity', function () {
    $manager = createUserWithRole('site_manager', $this->org);
    $manager->sites()->attach(createSite($this->org)->id, ['assigned_at' => now()]);
    $otherUser = createUserWithRole('site_viewer', $this->org);

    $this->actingAs($manager)
        ->get(route('activity-log.user', $otherUser->id))
        ->assertForbidden();
});

test('org_admin can view model activity', function () {
    $this->actingAs($this->user)
        ->get(route('activity-log.model', ['model' => 'organization', 'id' => $this->org->id]))
        ->assertOk();
});

test('unknown model returns 404', function () {
    $this->actingAs($this->user)
        ->get(route('activity-log.model', ['model' => 'unknown', 'id' => 1]))
        ->assertNotFound();
});

test('guest is redirected from activity log', function () {
    $this->get(route('activity-log'))
        ->assertRedirect(route('login'));
});
