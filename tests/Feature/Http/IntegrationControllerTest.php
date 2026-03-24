<?php

use App\Models\IntegrationConfig;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->user = createUserWithRole('client_org_admin', $this->org);
});

test('org_admin can list integrations', function () {
    $this->actingAs($this->user)
        ->get(route('integrations.index'))
        ->assertOk();
});

test('org_admin can create sap integration', function () {
    $this->actingAs($this->user)
        ->post(route('integrations.store'), [
            'type' => 'sap',
            'config' => ['endpoint' => 'https://sap.example.com'],
        ])
        ->assertRedirect();

    expect(IntegrationConfig::where('org_id', $this->org->id)->where('type', 'sap')->exists())->toBeTrue();
});

test('org_admin can create contpaq integration', function () {
    $this->actingAs($this->user)
        ->post(route('integrations.store'), [
            'type' => 'contpaq',
        ])
        ->assertRedirect();

    expect(IntegrationConfig::where('type', 'contpaq')->exists())->toBeTrue();
});

test('upsert updates existing integration of same type', function () {
    IntegrationConfig::create(['org_id' => $this->org->id, 'type' => 'sap', 'active' => true]);

    $this->actingAs($this->user)
        ->post(route('integrations.store'), [
            'type' => 'sap',
            'active' => false,
        ])
        ->assertRedirect();

    expect(IntegrationConfig::where('org_id', $this->org->id)->where('type', 'sap')->count())->toBe(1);
});

test('site_viewer cannot manage integrations', function () {
    $viewer = createUserWithRole('client_site_viewer', $this->org);

    $this->actingAs($viewer)
        ->get(route('integrations.index'))
        ->assertForbidden();
});
