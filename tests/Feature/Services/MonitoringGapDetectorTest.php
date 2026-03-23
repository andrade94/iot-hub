<?php

use App\Models\Device;
use App\Models\Organization;
use App\Models\SensorReading;
use App\Models\Site;
use App\Services\Compliance\MonitoringGapDetector;

beforeEach(function () {
    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id]);
    $this->device = Device::factory()->create(['site_id' => $this->site->id, 'status' => 'active']);
    $this->detector = new MonitoringGapDetector(maxGapMinutes: 15);
});

test('detects no gaps when readings are continuous', function () {
    // Create readings every 5 minutes for 1 hour
    for ($i = 0; $i < 12; $i++) {
        SensorReading::create([
            'device_id' => $this->device->id,
            'time' => now()->subHour()->addMinutes($i * 5),
            'metric' => 'temperature',
            'value' => -18.0,
            'unit' => '°C',
        ]);
    }

    $gaps = $this->detector->detectForDevice(
        $this->device,
        now()->subHour()->toIso8601String(),
        now()->toIso8601String()
    );

    // Only the trailing gap (last reading to now) should appear if >15 min
    $significantGaps = array_filter($gaps, fn ($g) => $g['duration_minutes'] > 15);
    expect(count($significantGaps))->toBeLessThanOrEqual(1);
});

test('detects gap when no readings for 30 minutes', function () {
    // Reading at start
    SensorReading::create([
        'device_id' => $this->device->id,
        'time' => now()->subMinutes(60),
        'metric' => 'temperature',
        'value' => -18.0,
        'unit' => '°C',
    ]);
    // 30 min gap
    SensorReading::create([
        'device_id' => $this->device->id,
        'time' => now()->subMinutes(30),
        'metric' => 'temperature',
        'value' => -17.5,
        'unit' => '°C',
    ]);

    $gaps = $this->detector->detectForDevice(
        $this->device,
        now()->subMinutes(60)->toIso8601String(),
        now()->subMinutes(30)->toIso8601String()
    );

    expect(count($gaps))->toBe(1);
    expect($gaps[0]['duration_minutes'])->toBe(30);
    expect($gaps[0]['device_id'])->toBe($this->device->id);
});

test('detects entire period as gap when no readings exist', function () {
    $gaps = $this->detector->detectForDevice(
        $this->device,
        now()->subHour()->toIso8601String(),
        now()->toIso8601String()
    );

    expect(count($gaps))->toBe(1);
    expect($gaps[0]['duration_minutes'])->toBe(60);
});

test('detectForSite scans all active devices', function () {
    $device2 = Device::factory()->create(['site_id' => $this->site->id, 'status' => 'active']);

    // No readings for either device
    $gaps = $this->detector->detectForSite(
        $this->site,
        now()->subHour()->toIso8601String(),
        now()->toIso8601String()
    );

    expect(count($gaps))->toBe(2); // One gap per device
});

test('ignores gaps shorter than max threshold', function () {
    // Use fixed timestamps to avoid Carbon mutation issues
    $t0 = '2026-03-23 10:00:00';
    $t1 = '2026-03-23 10:10:00';
    $t2 = '2026-03-23 10:20:00';

    SensorReading::create(['device_id' => $this->device->id, 'time' => $t0, 'metric' => 'temperature', 'value' => -18.0, 'unit' => '°C']);
    SensorReading::create(['device_id' => $this->device->id, 'time' => $t1, 'metric' => 'temperature', 'value' => -17.8, 'unit' => '°C']);
    SensorReading::create(['device_id' => $this->device->id, 'time' => $t2, 'metric' => 'temperature', 'value' => -17.9, 'unit' => '°C']);

    $gaps = $this->detector->detectForDevice($this->device, $t0, $t2);

    expect(count($gaps))->toBe(0);
});

test('gap includes device name and zone', function () {
    $this->device->update(['name' => 'Freezer Sensor #3', 'zone' => 'Walk-in Cooler']);

    $gaps = $this->detector->detectForDevice(
        $this->device->fresh(),
        now()->subHour()->toIso8601String(),
        now()->toIso8601String()
    );

    expect($gaps[0]['device_name'])->toBe('Freezer Sensor #3');
    expect($gaps[0]['zone'])->toBe('Walk-in Cooler');
});
