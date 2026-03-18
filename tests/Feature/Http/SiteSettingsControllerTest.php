<?php

use App\Models\Site;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->admin = createUserWithRole('org_admin', $this->org);
});

// ──────────────────────────────────────────────────────────────────────
// Auth & Permissions
// ──────────────────────────────────────────────────────────────────────

test('guest is redirected to login', function () {
    $this->get(route('sites.settings.index'))
        ->assertRedirect(route('login'));
});

test('site_viewer is forbidden from accessing site settings', function () {
    $viewer = createUserWithRole('site_viewer', $this->org);

    $this->actingAs($viewer)
        ->get(route('sites.settings.index'))
        ->assertForbidden();
});

test('site_viewer is forbidden from store', function () {
    $viewer = createUserWithRole('site_viewer', $this->org);

    $this->actingAs($viewer)
        ->post(route('sites.settings.store'), [
            'name' => 'Blocked Site',
            'status' => 'active',
        ])
        ->assertForbidden();
});

test('site_viewer is forbidden from update', function () {
    $viewer = createUserWithRole('site_viewer', $this->org);

    $this->actingAs($viewer)
        ->put(route('sites.settings.update', $this->site), [
            'name' => 'Hacked Name',
            'status' => 'active',
        ])
        ->assertForbidden();
});

test('site_viewer is forbidden from delete', function () {
    $viewer = createUserWithRole('site_viewer', $this->org);

    $this->actingAs($viewer)
        ->delete(route('sites.settings.destroy', $this->site))
        ->assertForbidden();
});

// ──────────────────────────────────────────────────────────────────────
// Index
// ──────────────────────────────────────────────────────────────────────

test('org_admin can view sites index', function () {
    $this->actingAs($this->admin)
        ->get(route('sites.settings.index'))
        ->assertOk();
});

test('sites index returns sites and timezones props', function () {
    $this->actingAs($this->admin)
        ->get(route('sites.settings.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/sites/index')
            ->has('sites')
            ->has('timezones')
        );
});

// ──────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────

test('org_admin can create a site', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('sites.settings.store'), [
            'name' => 'New Site',
            'status' => 'active',
            'timezone' => 'America/Mexico_City',
            'address' => '123 Main St',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    expect(Site::where('name', 'New Site')->exists())->toBeTrue();
});

test('created site is assigned to the admin org', function () {
    $this->actingAs($this->admin)
        ->post(route('sites.settings.store'), [
            'name' => 'Org Site',
            'status' => 'draft',
        ]);

    $site = Site::where('name', 'Org Site')->first();
    expect($site)->not->toBeNull();
    expect($site->org_id)->toBe($this->org->id);
});

test('store validates required fields', function () {
    $this->actingAs($this->admin)
        ->post(route('sites.settings.store'), [])
        ->assertSessionHasErrors(['name', 'status']);
});

test('store validates status must be draft active or suspended', function () {
    $this->actingAs($this->admin)
        ->post(route('sites.settings.store'), [
            'name' => 'Bad Status Site',
            'status' => 'invalid_status',
        ])
        ->assertSessionHasErrors(['status']);
});

test('store validates timezone is a valid timezone', function () {
    $this->actingAs($this->admin)
        ->post(route('sites.settings.store'), [
            'name' => 'Bad TZ Site',
            'status' => 'active',
            'timezone' => 'Not/A/Timezone',
        ])
        ->assertSessionHasErrors(['timezone']);
});

// ──────────────────────────────────────────────────────────────────────
// Update
// ──────────────────────────────────────────────────────────────────────

test('org_admin can update a site', function () {
    $this->actingAs($this->admin)
        ->put(route('sites.settings.update', $this->site), [
            'name' => 'Updated Site Name',
            'status' => 'suspended',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->site->refresh();
    expect($this->site->name)->toBe('Updated Site Name');
    expect($this->site->status)->toBe('suspended');
});

// ──────────────────────────────────────────────────────────────────────
// Destroy
// ──────────────────────────────────────────────────────────────────────

test('org_admin can delete a site', function () {
    $siteToDelete = createSite($this->org, ['name' => 'Delete Me']);

    $this->actingAs($this->admin)
        ->delete(route('sites.settings.destroy', $siteToDelete))
        ->assertRedirect()
        ->assertSessionHas('success');

    // Site uses SoftDeletes, so it should be soft-deleted
    expect(Site::find($siteToDelete->id))->toBeNull();
    expect(Site::withTrashed()->find($siteToDelete->id))->not->toBeNull();
});
