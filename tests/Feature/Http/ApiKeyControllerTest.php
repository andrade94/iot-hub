<?php

use App\Models\ApiKey;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->user = createUserWithRole('client_org_admin', $this->org);
});

test('org_admin can list api keys', function () {
    $this->actingAs($this->user)
        ->get(route('api-keys.index'))
        ->assertOk();
});

test('org_admin can create an api key', function () {
    $this->actingAs($this->user)
        ->post(route('api-keys.store'), [
            'name' => 'Test Key',
        ])
        ->assertRedirect();

    expect(ApiKey::where('org_id', $this->org->id)->count())->toBe(1);
});

test('created api key has hashed value', function () {
    $this->actingAs($this->user)
        ->post(route('api-keys.store'), [
            'name' => 'Hash Test Key',
        ])
        ->assertRedirect();

    $apiKey = ApiKey::first();
    expect($apiKey->key_hash)->not->toBeEmpty();
    expect(strlen($apiKey->key_hash))->toBe(64); // SHA-256 hash length
});

test('store api key fails without name', function () {
    $this->actingAs($this->user)
        ->post(route('api-keys.store'), [])
        ->assertSessionHasErrors('name');
});

test('org_admin can delete their org api key', function () {
    $apiKey = ApiKey::create([
        'org_id' => $this->org->id,
        'name' => 'Delete Me',
        'key_hash' => hash('sha256', 'test-key'),
    ]);

    $this->actingAs($this->user)
        ->delete(route('api-keys.destroy', $apiKey))
        ->assertRedirect();

    expect(ApiKey::find($apiKey->id))->toBeNull();
});

test('cannot delete another org api key', function () {
    $otherOrg = createOrg(['name' => 'Other']);
    $apiKey = ApiKey::create([
        'org_id' => $otherOrg->id,
        'name' => 'Other Key',
        'key_hash' => hash('sha256', 'other-key'),
    ]);

    $this->actingAs($this->user)
        ->delete(route('api-keys.destroy', $apiKey))
        ->assertForbidden();
});

test('site_viewer cannot access api keys', function () {
    $viewer = createUserWithRole('client_site_viewer', $this->org);

    $this->actingAs($viewer)
        ->get(route('api-keys.index'))
        ->assertForbidden();
});
