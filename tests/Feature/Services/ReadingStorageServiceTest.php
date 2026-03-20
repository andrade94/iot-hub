<?php

use App\Models\SensorReading;
use App\Services\Readings\ReadingStorageService;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->service = new ReadingStorageService;
});

test('stores sensor readings to database', function () {
    $device = createDevice($this->site);

    $this->service->store($device, [
        'temperature' => ['value' => 4.5, 'unit' => '°C'],
        'humidity' => ['value' => 65.0, 'unit' => '%'],
    ]);

    expect(SensorReading::where('device_id', $device->id)->count())->toBe(2);
    expect(SensorReading::where('device_id', $device->id)->where('metric', 'temperature')->first()->value)->toBe(4.5);
});

test('updates device last_reading_at', function () {
    $device = createDevice($this->site, ['last_reading_at' => null]);

    $this->service->store($device, [
        'temperature' => ['value' => 4.5, 'unit' => '°C'],
    ]);

    expect($device->fresh()->last_reading_at)->not->toBeNull();
});

test('updates device rssi when provided', function () {
    $device = createDevice($this->site, ['rssi' => null]);

    $this->service->store($device, [
        'temperature' => ['value' => 4.5, 'unit' => '°C'],
    ], rssi: -85);

    expect($device->fresh()->rssi)->toBe(-85);
});

test('extracts battery from readings', function () {
    $device = createDevice($this->site, ['battery_pct' => null]);

    $this->service->store($device, [
        'battery' => ['value' => 75.0, 'unit' => '%'],
        'temperature' => ['value' => 4.5, 'unit' => '°C'],
    ]);

    expect($device->fresh()->battery_pct)->toBe(75);
});

test('activates pending device on first reading', function () {
    $device = createDevice($this->site, ['status' => 'pending']);

    $this->service->store($device, [
        'temperature' => ['value' => 4.5, 'unit' => '°C'],
    ]);

    expect($device->fresh()->status)->toBe('active');
});

test('duplicate readings are silently ignored', function () {
    $device = createDevice($this->site);

    $this->service->store($device, [
        'temperature' => ['value' => 22.5, 'unit' => '°C'],
    ]);

    // Store exact same reading again (simulates queue retry)
    $this->service->store($device, [
        'temperature' => ['value' => 22.5, 'unit' => '°C'],
    ]);

    // Only 1 reading stored due to unique constraint + insertOrIgnore
    expect(SensorReading::where('device_id', $device->id)->where('metric', 'temperature')->count())->toBe(1);
});

test('different metrics at same time are stored separately', function () {
    $device = createDevice($this->site);

    $this->service->store($device, [
        'temperature' => ['value' => 22.5, 'unit' => '°C'],
        'humidity' => ['value' => 65.0, 'unit' => '%'],
    ]);

    expect(SensorReading::where('device_id', $device->id)->count())->toBe(2);
});
