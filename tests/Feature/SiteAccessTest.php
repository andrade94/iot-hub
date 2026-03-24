<?php

use App\Models\Organization;
use App\Models\Site;
use App\Models\User;

beforeEach(function () {
    $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

    $this->org = Organization::create([
        'name' => 'Test Org', 'slug' => 'test-org', 'segment' => 'cold_chain',
    ]);
    $this->otherOrg = Organization::create([
        'name' => 'Other Org', 'slug' => 'other-org', 'segment' => 'energy',
    ]);

    $this->site1 = Site::create(['org_id' => $this->org->id, 'name' => 'Site A', 'status' => 'active']);
    $this->site2 = Site::create(['org_id' => $this->org->id, 'name' => 'Site B', 'status' => 'active']);
    $this->otherSite = Site::create(['org_id' => $this->otherOrg->id, 'name' => 'Other Site', 'status' => 'active']);
});

test('site viewer can switch to assigned site', function () {
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $user->assignRole('client_site_viewer');
    $user->sites()->attach($this->site1->id, ['assigned_at' => now()]);

    $this->actingAs($user)
        ->post(route('site.switch'), ['site_id' => $this->site1->id])
        ->assertRedirect();
});

test('site viewer cannot switch to unassigned site', function () {
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $user->assignRole('client_site_viewer');
    $user->sites()->attach($this->site1->id, ['assigned_at' => now()]);

    $this->actingAs($user)
        ->post(route('site.switch'), ['site_id' => $this->site2->id])
        ->assertForbidden();
});

test('org_admin can switch to any org site', function () {
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $user->assignRole('client_org_admin');

    $this->actingAs($user)
        ->post(route('site.switch'), ['site_id' => $this->site2->id])
        ->assertRedirect();
});

test('org_admin cannot switch to other org site', function () {
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $user->assignRole('client_org_admin');

    $this->actingAs($user)
        ->post(route('site.switch'), ['site_id' => $this->otherSite->id])
        ->assertForbidden();
});

test('super_admin can switch to any site', function () {
    $user = User::factory()->create();
    $user->assignRole('super_admin');

    $this->actingAs($user)
        ->post(route('site.switch'), ['site_id' => $this->otherSite->id])
        ->assertRedirect();
});
