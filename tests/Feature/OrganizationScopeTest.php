<?php

use App\Models\Organization;
use App\Models\User;

test('user without org is blocked by org scope middleware', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('dashboard'))->assertForbidden();
});

test('super_admin without org can access dashboard', function () {
    $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

    $user = User::factory()->create();
    $user->assignRole('super_admin');

    $this->actingAs($user)->get(route('dashboard'))->assertOk();
});

test('user with org can access dashboard', function () {
    $org = Organization::create([
        'name' => 'Test Org', 'slug' => 'test-org', 'segment' => 'energy',
    ]);
    $user = User::factory()->create(['org_id' => $org->id]);

    $this->actingAs($user)->get(route('dashboard'))->assertOk();
});

test('org scope middleware binds current_organization', function () {
    $org = Organization::create([
        'name' => 'Test Org', 'slug' => 'test-org', 'segment' => 'energy',
    ]);
    $user = User::factory()->create(['org_id' => $org->id]);

    $this->actingAs($user)->get(route('dashboard'));

    expect(app()->bound('current_organization'))->toBeTrue();
    expect(app('current_organization')->id)->toBe($org->id);
});
