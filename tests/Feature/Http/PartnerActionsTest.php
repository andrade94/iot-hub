<?php

// Covers: WF-PARTNER — Partner portal suspend/archive actions (super_admin only)

use App\Models\Organization;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg(['name' => 'Client Corp', 'status' => 'active']);
    $this->superAdmin = createUserWithRole('super_admin');
});

// ── Suspend ────────────────────────────────────────────────────

test('suspend changes org status to suspended', function () {
    $this->actingAs($this->superAdmin)
        ->post(route('partner.suspend', $this->org))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->org->fresh()->status)->toBe('suspended');
});

test('suspend fails for already suspended org', function () {
    $this->org->update(['status' => 'suspended']);

    $this->actingAs($this->superAdmin)
        ->post(route('partner.suspend', $this->org))
        ->assertRedirect()
        ->assertSessionHas('error');

    expect($this->org->fresh()->status)->toBe('suspended');
});

test('suspend fails for archived org', function () {
    $this->org->update(['status' => 'archived']);

    $this->actingAs($this->superAdmin)
        ->post(route('partner.suspend', $this->org))
        ->assertRedirect()
        ->assertSessionHas('error');

    expect($this->org->fresh()->status)->toBe('archived');
});

// ── Archive ────────────────────────────────────────────────────

test('archive changes org status to archived from active', function () {
    $this->actingAs($this->superAdmin)
        ->post(route('partner.archive', $this->org))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->org->fresh()->status)->toBe('archived');
});

test('archive changes org status to archived from suspended', function () {
    $this->org->update(['status' => 'suspended']);

    $this->actingAs($this->superAdmin)
        ->post(route('partner.archive', $this->org))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->org->fresh()->status)->toBe('archived');
});

test('archive fails for already archived org', function () {
    $this->org->update(['status' => 'archived']);

    $this->actingAs($this->superAdmin)
        ->post(route('partner.archive', $this->org))
        ->assertRedirect()
        ->assertSessionHas('error');
});

// ── Authorization ──────────────────────────────────────────────

test('requires super_admin role — org_admin gets 403 on suspend', function () {
    $orgAdmin = createUserWithRole('client_org_admin', $this->org);

    $this->actingAs($orgAdmin)
        ->post(route('partner.suspend', $this->org))
        ->assertForbidden();

    expect($this->org->fresh()->status)->toBe('active');
});

test('requires super_admin role — org_admin gets 403 on archive', function () {
    $orgAdmin = createUserWithRole('client_org_admin', $this->org);

    $this->actingAs($orgAdmin)
        ->post(route('partner.archive', $this->org))
        ->assertForbidden();

    expect($this->org->fresh()->status)->toBe('active');
});

test('requires super_admin role — site_viewer gets 403', function () {
    $viewer = createUserWithRole('client_site_viewer', $this->org);

    $this->actingAs($viewer)
        ->post(route('partner.suspend', $this->org))
        ->assertForbidden();
});

test('guest is redirected to login', function () {
    $this->post(route('partner.suspend', $this->org))
        ->assertRedirect(route('login'));

    $this->post(route('partner.archive', $this->org))
        ->assertRedirect(route('login'));
});
