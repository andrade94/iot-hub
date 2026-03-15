<?php

use App\Jobs\ProcessSensorReading;
use App\Models\Device;
use App\Models\Gateway;
use App\Models\Organization;
use App\Models\SensorReading;
use App\Models\Site;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'Test Org', 'slug' => 'test-org-reading', 'segment' => 'cold_chain',
    ]);

    $this->site = Site::create([
        'org_id' => $this->org->id,
        'name' => 'Test Site',
        'status' => 'active',
    ]);

    $this->gateway = Gateway::create([
        'site_id' => $this->site->id,
        'model' => 'UG65',
        'serial' => 'GW-READING-TEST',
    ]);
});

test('ProcessSensorReading decodes and stores EM300-TH readings', function () {
    $device = Device::create([
        'site_id' => $this->site->id,
        'gateway_id' => $this->gateway->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE100001',
        'name' => 'Cooler Sensor',
        'status' => 'pending',
    ]);

    // Little-endian payload: temp=24.5°C (245=0x00F5 → LE: F5 00), humidity=55% (110=0x6E), battery=85%
    $payload = '0167F5000268' . sprintf('%02X', 110) . '0375' . sprintf('%02X', 85);

    ProcessSensorReading::dispatchSync(
        deviceId: $device->id,
        payload: $payload,
        rssi: -75,
    );

    // Check readings were stored
    $readings = SensorReading::where('device_id', $device->id)->get();
    expect($readings)->toHaveCount(3); // temp, humidity, battery

    $tempReading = $readings->where('metric', 'temperature')->first();
    expect($tempReading->value)->toBe(24.5)
        ->and($tempReading->unit)->toBe('°C');

    $humReading = $readings->where('metric', 'humidity')->first();
    expect($humReading->value)->toBe(55.0);

    // Check device was updated
    $device->refresh();
    expect($device->rssi)->toBe(-75)
        ->and($device->battery_pct)->toBe(85)
        ->and($device->status)->toBe('active')
        ->and($device->last_reading_at)->not->toBeNull();
});

test('ProcessSensorReading handles unknown device gracefully', function () {
    ProcessSensorReading::dispatchSync(
        deviceId: 99999,
        payload: '016700F5',
    );

    expect(SensorReading::count())->toBe(0);
});

test('ProcessSensorReading decodes CT101 current readings', function () {
    $device = Device::create([
        'site_id' => $this->site->id,
        'model' => 'CT101',
        'dev_eui' => 'A81758FFFE100002',
        'name' => 'Compressor CT',
        'status' => 'provisioned',
    ]);

    // Current: 12.5A = 12500 = 0x000030D4 → LE: D4 30 00 00, battery=90
    $payload = '0199D43000000375' . sprintf('%02X', 90);

    ProcessSensorReading::dispatchSync(
        deviceId: $device->id,
        payload: $payload,
        rssi: -80,
    );

    $currentReading = SensorReading::where('device_id', $device->id)
        ->where('metric', 'current')
        ->first();

    expect($currentReading)->not->toBeNull()
        ->and($currentReading->unit)->toBe('A');

    $device->refresh();
    expect($device->status)->toBe('active');
});

test('ProcessSensorReading decodes WS301 door status', function () {
    $device = Device::create([
        'site_id' => $this->site->id,
        'model' => 'WS301',
        'dev_eui' => 'A81758FFFE100003',
        'name' => 'Door Sensor',
        'status' => 'active',
    ]);

    // Door open (1), battery 95%
    $payload = '0300010475' . sprintf('%02X', 95);

    ProcessSensorReading::dispatchSync(
        deviceId: $device->id,
        payload: $payload,
    );

    $doorReading = SensorReading::where('device_id', $device->id)
        ->where('metric', 'door_status')
        ->first();

    expect($doorReading)->not->toBeNull()
        ->and($doorReading->value)->toBe(1.0);
});
