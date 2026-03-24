<?php

use App\Models\Organization;
use App\Models\Site;
use App\Models\User;

beforeEach(function () {
    $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

    $this->org = Organization::create([
        'name' => 'Test Org', 'slug' => 'test-org', 'segment' => 'cold_chain',
    ]);

    $this->site1 = Site::create(['org_id' => $this->org->id, 'name' => 'Site A', 'status' => 'active']);
    $this->site2 = Site::create(['org_id' => $this->org->id, 'name' => 'Site B', 'status' => 'active']);
    $this->site3 = Site::create(['org_id' => $this->org->id, 'name' => 'Site C', 'status' => 'onboarding']);
});

test('org_admin gets all org sites via accessibleSites', function () {
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $user->assignRole('client_org_admin');

    $sites = $user->accessibleSites();

    expect($sites)->toHaveCount(3);
});

test('site_viewer gets only assigned sites via accessibleSites', function () {
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $user->assignRole('client_site_viewer');
    $user->sites()->attach($this->site1->id, ['assigned_at' => now()]);

    $sites = $user->accessibleSites();

    expect($sites)->toHaveCount(1);
    expect($sites->first()->id)->toBe($this->site1->id);
});

test('technician gets only assigned sites', function () {
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $user->assignRole('technician');
    $user->sites()->attach([
        $this->site1->id => ['assigned_at' => now()],
        $this->site2->id => ['assigned_at' => now()],
    ]);

    $sites = $user->accessibleSites();

    expect($sites)->toHaveCount(2);
});

test('canAccessSite returns true for assigned site', function () {
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $user->assignRole('client_site_viewer');
    $user->sites()->attach($this->site1->id, ['assigned_at' => now()]);

    expect($user->canAccessSite($this->site1->id))->toBeTrue();
    expect($user->canAccessSite($this->site2->id))->toBeFalse();
});

test('canAccessSite returns true for org_admin on any org site', function () {
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $user->assignRole('client_org_admin');

    expect($user->canAccessSite($this->site1->id))->toBeTrue();
    expect($user->canAccessSite($this->site2->id))->toBeTrue();
    expect($user->canAccessSite($this->site3->id))->toBeTrue();
});

test('canAccessSite returns false for org_admin on other org site', function () {
    $otherOrg = Organization::create([
        'name' => 'Other Org', 'slug' => 'other-org', 'segment' => 'energy',
    ]);
    $otherSite = Site::create(['org_id' => $otherOrg->id, 'name' => 'Other Site', 'status' => 'active']);

    $user = User::factory()->create(['org_id' => $this->org->id]);
    $user->assignRole('client_org_admin');

    expect($user->canAccessSite($otherSite->id))->toBeFalse();
});

test('super_admin can access any site', function () {
    $user = User::factory()->create();
    $user->assignRole('super_admin');

    expect($user->canAccessSite($this->site1->id))->toBeTrue();
    expect($user->canAccessSite($this->site2->id))->toBeTrue();
});
