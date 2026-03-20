<?php

use App\Models\Alert;
use App\Models\DeviceAnomaly;
use App\Services\Readings\SanityCheckService;
use Illuminate\Support\Facades\Redis;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->service = new SanityCheckService;

    // Clear Redis anomaly counters
    Redis::flushdb();
});

test('valid EM300-TH readings pass through', function () {
    $device = createDevice($this->site, ['model' => 'EM300-TH']);

    $result = $this->service->validate($device, [
        'temperature' => ['value' => 22.5, 'unit' => '°C'],
        'humidity' => ['value' => 65.0, 'unit' => '%'],
    ]);

    expect($result)->toHaveCount(2);
    expect($result)->toHaveKeys(['temperature', 'humidity']);
    expect(DeviceAnomaly::count())->toBe(0);
});

test('out-of-range temperature is filtered and anomaly logged', function () {
    $device = createDevice($this->site, ['model' => 'EM300-TH']);

    $result = $this->service->validate($device, [
        'temperature' => ['value' => 500.0, 'unit' => '°C'],
    ]);

    expect($result)->toBeEmpty();
    expect(DeviceAnomaly::count())->toBe(1);

    $anomaly = DeviceAnomaly::first();
    expect($anomaly->device_id)->toBe($device->id);
    expect($anomaly->metric)->toBe('temperature');
    expect($anomaly->value)->toBe(500.0);
    expect($anomaly->valid_min)->toBe(-40.0);
    expect($anomaly->valid_max)->toBe(85.0);
});

test('mixed valid and invalid readings returns only valid', function () {
    $device = createDevice($this->site, ['model' => 'EM300-TH']);

    $result = $this->service->validate($device, [
        'temperature' => ['value' => 22.5, 'unit' => '°C'],
        'humidity' => ['value' => 150.0, 'unit' => '%'],
    ]);

    expect($result)->toHaveCount(1);
    expect($result)->toHaveKey('temperature');
    expect($result)->not->toHaveKey('humidity');
    expect(DeviceAnomaly::count())->toBe(1);
});

test('5 anomalies in 1 hour creates sensor anomaly alert', function () {
    $device = createDevice($this->site, ['model' => 'EM300-TH']);

    for ($i = 0; $i < 5; $i++) {
        $this->service->validate($device, [
            'temperature' => ['value' => 500.0 + $i, 'unit' => '°C'],
        ]);
    }

    expect(DeviceAnomaly::count())->toBe(5);
    expect(Alert::where('device_id', $device->id)->count())->toBe(1);

    $alert = Alert::where('device_id', $device->id)->first();
    expect($alert->severity)->toBe('high');
    expect($alert->data['type'])->toBe('sensor_anomaly');
    expect($alert->data['metric'])->toBe('temperature');
});

test('fewer than 5 anomalies does not create alert', function () {
    $device = createDevice($this->site, ['model' => 'EM300-TH']);

    for ($i = 0; $i < 4; $i++) {
        $this->service->validate($device, [
            'temperature' => ['value' => 500.0, 'unit' => '°C'],
        ]);
    }

    expect(DeviceAnomaly::count())->toBe(4);
    expect(Alert::where('device_id', $device->id)->count())->toBe(0);
});

test('unknown sensor model passes all readings through', function () {
    $device = createDevice($this->site, ['model' => 'UNKNOWN-SENSOR']);

    $result = $this->service->validate($device, [
        'temperature' => ['value' => 9999.0, 'unit' => '°C'],
    ]);

    expect($result)->toHaveCount(1);
    expect(DeviceAnomaly::count())->toBe(0);
});

test('unknown metric on known model passes through', function () {
    $device = createDevice($this->site, ['model' => 'EM300-TH']);

    $result = $this->service->validate($device, [
        'temperature' => ['value' => 22.5, 'unit' => '°C'],
        'custom_metric' => ['value' => 999.0, 'unit' => 'x'],
    ]);

    expect($result)->toHaveCount(2);
    expect(DeviceAnomaly::count())->toBe(0);
});

test('boundary values are accepted', function () {
    $device = createDevice($this->site, ['model' => 'EM300-TH']);

    $result = $this->service->validate($device, [
        'temperature' => ['value' => -40.0, 'unit' => '°C'],
    ]);
    expect($result)->toHaveCount(1);

    $result = $this->service->validate($device, [
        'temperature' => ['value' => 85.0, 'unit' => '°C'],
    ]);
    expect($result)->toHaveCount(1);

    expect(DeviceAnomaly::count())->toBe(0);
});

test('values just outside boundary are rejected', function () {
    $device = createDevice($this->site, ['model' => 'EM300-TH']);

    $result = $this->service->validate($device, [
        'temperature' => ['value' => -40.1, 'unit' => '°C'],
    ]);
    expect($result)->toBeEmpty();

    $result = $this->service->validate($device, [
        'temperature' => ['value' => 85.1, 'unit' => '°C'],
    ]);
    expect($result)->toBeEmpty();

    expect(DeviceAnomaly::count())->toBe(2);
});
