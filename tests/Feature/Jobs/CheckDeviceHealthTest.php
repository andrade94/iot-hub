<?php

use App\Jobs\CheckDeviceHealth;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

test('marks active device as offline when no readings for 15+ minutes', function () {
    $device = createDevice($this->site, [
        'status' => 'active',
        'last_reading_at' => now()->subMinutes(20),
    ]);

    (new CheckDeviceHealth)->handle();

    expect($device->fresh()->status)->toBe('offline');
});

test('marks active device as offline when last_reading_at is null', function () {
    $device = createDevice($this->site, [
        'status' => 'active',
        'last_reading_at' => null,
    ]);

    (new CheckDeviceHealth)->handle();

    expect($device->fresh()->status)->toBe('offline');
});

test('does not mark device as offline if reading within 15 minutes', function () {
    $device = createDevice($this->site, [
        'status' => 'active',
        'last_reading_at' => now()->subMinutes(5),
    ]);

    (new CheckDeviceHealth)->handle();

    expect($device->fresh()->status)->toBe('active');
});

test('detects low battery devices', function () {
    $device = createDevice($this->site, [
        'status' => 'active',
        'battery_pct' => 15,
        'last_reading_at' => now(),
    ]);

    // Should not throw — just logs
    (new CheckDeviceHealth)->handle();

    expect($device->fresh()->status)->toBe('active'); // Not changed, just logged
});

test('does not affect pending devices', function () {
    $device = createDevice($this->site, [
        'status' => 'pending',
        'last_reading_at' => null,
    ]);

    (new CheckDeviceHealth)->handle();

    expect($device->fresh()->status)->toBe('pending');
});
