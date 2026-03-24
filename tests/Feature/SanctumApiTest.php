<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
    $this->user = createUserWithRole('client_org_admin', $this->org);
});

test('unauthenticated API request returns 401', function () {
    $this->getJson("/api/sites/{$this->site->id}/devices")
        ->assertUnauthorized();
})->skip(! class_exists(Sanctum::class), 'Sanctum not installed');

test('user with Sanctum token can access API endpoints', function () {
    Sanctum::actingAs($this->user, ['*']);

    $this->getJson("/api/sites/{$this->site->id}/devices")
        ->assertOk()
        ->assertJsonStructure(['data']);

    $this->getJson("/api/devices/{$this->device->id}/status")
        ->assertOk()
        ->assertJsonStructure(['data' => ['id', 'name', 'status']]);
})->skip(! class_exists(Sanctum::class), 'Sanctum not installed');

test('token can be created and used', function () {
    $token = $this->user->createToken('test-token');
    $plainText = $token->plainTextToken;

    expect($plainText)->toBeString()->not->toBeEmpty();

    // Use the token via Authorization header
    $this->withHeaders(['Authorization' => "Bearer {$plainText}"])
        ->getJson("/api/sites/{$this->site->id}/devices")
        ->assertOk()
        ->assertJsonStructure(['data']);
})->skip(! class_exists(Sanctum::class), 'Sanctum not installed');

test('token can be revoked', function () {
    $token = $this->user->createToken('revocable-token');
    $plainText = $token->plainTextToken;

    // Confirm token works before revocation
    $this->withHeaders(['Authorization' => "Bearer {$plainText}"])
        ->getJson("/api/sites/{$this->site->id}/devices")
        ->assertOk();

    // Revoke the token
    $this->user->tokens()->delete();

    // Verify token is deleted from DB
    expect($this->user->tokens()->count())->toBe(0);
})->skip(! class_exists(Sanctum::class), 'Sanctum not installed');
