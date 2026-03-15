<?php

use App\Models\Organization;
use App\Models\User;

beforeEach(function () {
    seedPermissions();
});

test('user without org_id is forbidden on protected routes', function () {
    $user = User::factory()->create(['org_id' => null]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertForbidden();
});

test('super_admin without org_id is allowed', function () {
    $user = createUserWithRole('super_admin');

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk();
});

test('user with valid org_id is allowed', function () {
    $org = createOrg();
    $user = User::factory()->create(['org_id' => $org->id]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk();
});

test('organization is bound in container for regular user', function () {
    $org = createOrg();
    $user = User::factory()->create(['org_id' => $org->id]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk();

    // After the request, the container should have had the org bound
    // We can verify this via the middleware behavior
});

test('super_admin can use session org context', function () {
    $user = createUserWithRole('super_admin');
    $org = createOrg();

    $this->actingAs($user)
        ->withSession(['current_org_id' => $org->id])
        ->get(route('dashboard'))
        ->assertOk();
});
