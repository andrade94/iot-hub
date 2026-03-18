<?php

use App\Models\Organization;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg(['name' => 'Acme Corp', 'slug' => 'acme-corp', 'logo' => 'logos/acme.png']);
});

test('guest is redirected to login', function () {
    $this->get(route('partner.index'))
        ->assertRedirect(route('login'));
});

test('non-super_admin (org_admin) gets 403', function () {
    $orgAdmin = createUserWithRole('org_admin', $this->org);

    $this->actingAs($orgAdmin)
        ->get(route('partner.index'))
        ->assertForbidden();
});

test('super_admin can view partner portal', function () {
    $superAdmin = createUserWithRole('super_admin');

    $this->actingAs($superAdmin)
        ->get(route('partner.index'))
        ->assertOk();
});

test('response includes organizations data', function () {
    $superAdmin = createUserWithRole('super_admin');

    $response = $this->actingAs($superAdmin)
        ->get(route('partner.index'))
        ->assertOk();

    $page = $response->viewData('page');

    expect($page['props']['organizations'])->toBeArray()
        ->and(count($page['props']['organizations']))->toBeGreaterThanOrEqual(1);
});

test('organizations include name, slug, and logo fields', function () {
    // Create a second org to verify multiple are returned
    createOrg(['name' => 'Beta Inc', 'slug' => 'beta-inc', 'logo' => 'logos/beta.png']);

    $superAdmin = createUserWithRole('super_admin');

    $response = $this->actingAs($superAdmin)
        ->get(route('partner.index'))
        ->assertOk();

    $page = $response->viewData('page');
    $organizations = $page['props']['organizations'];

    expect($organizations)->toBeArray()
        ->and(count($organizations))->toBe(2);

    // Verify each organization has the expected fields
    foreach ($organizations as $org) {
        expect($org)->toHaveKeys(['name', 'slug', 'logo']);
    }

    // Verify the first org data matches (ordered by name, so Acme Corp comes first)
    $acme = collect($organizations)->firstWhere('slug', 'acme-corp');
    expect($acme['name'])->toBe('Acme Corp')
        ->and($acme['slug'])->toBe('acme-corp')
        ->and($acme['logo'])->toBe('logos/acme.png');
});

test('super_admin can create organization via POST', function () {
    $superAdmin = createUserWithRole('super_admin');

    $this->actingAs($superAdmin)
        ->post(route('partner.store'), [
            'name' => 'New Org',
            'slug' => 'new-org',
            'segment' => 'cold_chain',
            'plan' => 'standard',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(Organization::where('slug', 'new-org')->exists())->toBeTrue();
});

test('store organization validates required fields', function () {
    $superAdmin = createUserWithRole('super_admin');

    $this->actingAs($superAdmin)
        ->post(route('partner.store'), [])
        ->assertSessionHasErrors(['name', 'slug', 'segment', 'plan']);
});

test('store organization enforces slug uniqueness', function () {
    $superAdmin = createUserWithRole('super_admin');

    // First creation should succeed
    $this->actingAs($superAdmin)
        ->post(route('partner.store'), [
            'name' => 'Unique Org',
            'slug' => 'acme-corp', // Already exists from beforeEach
            'segment' => 'retail',
            'plan' => 'starter',
        ])
        ->assertSessionHasErrors(['slug']);
});
