<?php

use App\Models\Device;
use App\Models\Gateway;
use App\Models\Module;
use App\Models\Organization;
use App\Models\Recipe;
use App\Models\Site;
use App\Models\User;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'Test Org', 'slug' => 'test-org-dev', 'segment' => 'cold_chain',
    ]);

    $this->site = Site::create([
        'org_id' => $this->org->id,
        'name' => 'Test Site',
        'status' => 'active',
    ]);

    $this->gateway = Gateway::create([
        'site_id' => $this->site->id,
        'model' => 'UG65',
        'serial' => 'GW-DEV-TEST',
        'status' => 'online',
    ]);

    $this->module = Module::create([
        'slug' => 'cold_chain_test',
        'name' => 'Cold Chain Test',
    ]);

    $this->recipe = Recipe::create([
        'module_id' => $this->module->id,
        'sensor_model' => 'EM300-TH',
        'name' => 'Test Cooler',
        'default_rules' => [
            ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 10, 'severity' => 'high'],
        ],
    ]);
});

test('devices can be created with all fields', function () {
    $device = Device::create([
        'site_id' => $this->site->id,
        'gateway_id' => $this->gateway->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000001',
        'app_key' => 'test-app-key-12345',
        'name' => 'Cooler A Sensor',
        'zone' => 'Cooler A',
        'recipe_id' => $this->recipe->id,
        'status' => 'pending',
    ]);

    expect($device)->toBeInstanceOf(Device::class)
        ->and($device->dev_eui)->toBe('A81758FFFE000001')
        ->and($device->app_key)->toBe('test-app-key-12345') // encrypted cast handles this
        ->and($device->zone)->toBe('Cooler A');
});

test('device dev_eui is unique', function () {
    Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000002',
        'name' => 'Sensor 1',
    ]);

    Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000002',
        'name' => 'Sensor 2',
    ]);
})->throws(\Illuminate\Database\QueryException::class);

test('device belongs to site, gateway, and recipe', function () {
    $device = Device::create([
        'site_id' => $this->site->id,
        'gateway_id' => $this->gateway->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000003',
        'name' => 'Sensor',
        'recipe_id' => $this->recipe->id,
    ]);

    expect($device->site->id)->toBe($this->site->id)
        ->and($device->gateway->id)->toBe($this->gateway->id)
        ->and($device->recipe->id)->toBe($this->recipe->id);
});

test('device online/offline scopes work correctly', function () {
    Device::create([
        'site_id' => $this->site->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000010', 'name' => 'Online',
        'last_reading_at' => now()->subMinutes(5), 'status' => 'active',
    ]);
    Device::create([
        'site_id' => $this->site->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000011', 'name' => 'Offline',
        'last_reading_at' => now()->subMinutes(30), 'status' => 'active',
    ]);
    Device::create([
        'site_id' => $this->site->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000012', 'name' => 'Never seen',
        'last_reading_at' => null, 'status' => 'active',
    ]);

    expect(Device::online()->count())->toBe(1)
        ->and(Device::offline()->count())->toBe(2);
});

test('device low battery scope works correctly', function () {
    Device::create([
        'site_id' => $this->site->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000020', 'name' => 'Low Battery',
        'battery_pct' => 15, 'status' => 'active',
    ]);
    Device::create([
        'site_id' => $this->site->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000021', 'name' => 'Good Battery',
        'battery_pct' => 85, 'status' => 'active',
    ]);

    expect(Device::lowBattery()->count())->toBe(1);
});

test('device isOnline method works', function () {
    $online = Device::create([
        'site_id' => $this->site->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000030', 'name' => 'Online',
        'last_reading_at' => now()->subMinutes(5),
    ]);
    $offline = Device::create([
        'site_id' => $this->site->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000031', 'name' => 'Offline',
        'last_reading_at' => now()->subHour(),
    ]);

    expect($online->isOnline())->toBeTrue()
        ->and($offline->isOnline())->toBeFalse();
});

test('deleting a gateway nullifies device gateway_id', function () {
    $device = Device::create([
        'site_id' => $this->site->id,
        'gateway_id' => $this->gateway->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE000040',
        'name' => 'Sensor',
    ]);

    $this->gateway->delete();

    $device->refresh();
    expect($device->gateway_id)->toBeNull();
});
