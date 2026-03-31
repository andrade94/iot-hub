<?php

use App\Models\Organization;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg([
        'name' => 'Acme Corp',
        'default_timezone' => 'America/New_York',
        'branding' => ['primary_color' => '#000000', 'accent_color' => '#ffffff'],
    ]);

    $this->admin = createUserWithRole('client_org_admin', $this->org);

    app()->instance('current_organization', $this->org);
});

// ── Auth & Permission ──────────────────────────────────────────────────

test('guest is redirected to login', function () {
    $this->get(route('organization.edit'))
        ->assertRedirect(route('login'));
});

test('user without manage org settings permission gets 403', function () {
    $viewer = createUserWithRole('client_site_viewer', $this->org);

    $this->actingAs($viewer)
        ->get(route('organization.edit'))
        ->assertForbidden();
});

test('org_admin can access organization settings', function () {
    $this->actingAs($this->admin)
        ->get(route('organization.edit'))
        ->assertOk();
});

// ── Edit ────────────────────────────────────────────────────────────────

test('org_admin can view the org settings page', function () {
    $this->actingAs($this->admin)
        ->get(route('organization.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/organization'));
});

test('page receives the organization data', function () {
    $this->actingAs($this->admin)
        ->get(route('organization.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/organization')
            ->has('organization')
            ->where('organization.name', 'Acme Corp')
        );
});

// ── Update ──────────────────────────────────────────────────────────────

test('org_admin can update org name', function () {
    $this->actingAs($this->admin)
        ->patch(route('organization.update'), [
            'name' => 'New Corp Name',
        ])
        ->assertRedirect();

    expect($this->org->fresh()->name)->toBe('New Corp Name');
});

test('org_admin can update default_timezone', function () {
    $this->actingAs($this->admin)
        ->patch(route('organization.update'), [
            'name' => 'Acme Corp',
            'default_timezone' => 'Europe/London',
        ])
        ->assertRedirect();

    expect($this->org->fresh()->default_timezone)->toBe('Europe/London');
});

test('org_admin can update branding', function () {
    $this->actingAs($this->admin)
        ->patch(route('organization.update'), [
            'name' => 'Acme Corp',
            'branding' => [
                'primary_color' => '#ff5733',
                'accent_color' => '#33c1ff',
            ],
        ])
        ->assertRedirect();

    $branding = $this->org->fresh()->branding;

    expect($branding['primary_color'])->toBe('#ff5733')
        ->and($branding['accent_color'])->toBe('#33c1ff');
});

test('validates name is required', function () {
    $this->actingAs($this->admin)
        ->patch(route('organization.update'), [
            'name' => '',
        ])
        ->assertSessionHasErrors(['name']);
});

test('validates timezone format', function () {
    $this->actingAs($this->admin)
        ->patch(route('organization.update'), [
            'name' => 'Acme Corp',
            'default_timezone' => 'Not/A_Timezone',
        ])
        ->assertSessionHasErrors(['default_timezone']);
});

test('returns success flash message after update', function () {
    $this->actingAs($this->admin)
        ->patch(route('organization.update'), [
            'name' => 'Updated Corp',
        ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Organization settings updated.');
});
