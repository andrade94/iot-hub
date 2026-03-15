<?php

// Note: These tests require Laravel Sanctum to be installed.
// The API routes use auth:sanctum middleware.
// Run `composer require laravel/sanctum` to enable these tests.

use App\Models\SensorReading;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
    $this->user = createUserWithRole('org_admin', $this->org);
});

test('authenticated user can list devices via API', function () {
    $this->actingAs($this->user)
        ->getJson("/api/sites/{$this->site->id}/devices")
        ->assertOk()
        ->assertJsonStructure(['data']);
})->skip(! class_exists(\Laravel\Sanctum\Sanctum::class), 'Sanctum not installed');

test('authenticated user can get device readings via API', function () {
    SensorReading::create([
        'time' => now(),
        'device_id' => $this->device->id,
        'metric' => 'temperature',
        'value' => 4.5,
        'unit' => '°C',
    ]);

    $this->actingAs($this->user)
        ->getJson("/api/devices/{$this->device->id}/readings?" . http_build_query([
            'from' => now()->subDay()->toDateTimeString(),
            'to' => now()->addHour()->toDateTimeString(),
            'metric' => 'temperature',
        ]))
        ->assertOk()
        ->assertJsonStructure(['data']);
})->skip(! class_exists(\Laravel\Sanctum\Sanctum::class), 'Sanctum not installed');

test('authenticated user can get device status via API', function () {
    $this->actingAs($this->user)
        ->getJson("/api/devices/{$this->device->id}/status")
        ->assertOk()
        ->assertJsonStructure(['data' => ['id', 'name', 'status', 'online']]);
})->skip(! class_exists(\Laravel\Sanctum\Sanctum::class), 'Sanctum not installed');

test('unauthenticated user cannot access device API', function () {
    $this->getJson("/api/sites/{$this->site->id}/devices")
        ->assertUnauthorized();
})->skip(! class_exists(\Laravel\Sanctum\Sanctum::class), 'Sanctum not installed');
