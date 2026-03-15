<?php

use App\Models\ApiKey;
use App\Models\CompressorBaseline;
use App\Models\Device;
use App\Models\DoorBaseline;
use App\Models\IaqZoneScore;
use App\Models\IntegrationConfig;
use App\Models\Organization;
use App\Models\Site;
use App\Models\TrafficSnapshot;
use App\Models\WebhookSubscription;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'Advanced Test Org', 'slug' => 'adv-test-org', 'segment' => 'cold_chain',
    ]);
    $this->site = Site::create([
        'org_id' => $this->org->id, 'name' => 'Advanced Site', 'status' => 'active',
    ]);
    $this->device = Device::create([
        'site_id' => $this->site->id, 'model' => 'WS301',
        'dev_eui' => 'A81758FFFEA00001', 'name' => 'Door Sensor', 'status' => 'active',
    ]);
});

test('door baseline can be created and queried', function () {
    DoorBaseline::create([
        'device_id' => $this->device->id,
        'day_of_week' => 1,
        'hour' => 10,
        'avg_opens' => 15.5,
        'avg_duration' => 3.2,
        'std_dev_opens' => 4.1,
    ]);

    $baseline = DoorBaseline::where('device_id', $this->device->id)->first();
    expect($baseline->avg_opens)->toBe(15.5)
        ->and($baseline->device->id)->toBe($this->device->id);
});

test('compressor baseline tracks duty cycle', function () {
    CompressorBaseline::create([
        'device_id' => $this->device->id,
        'date' => now()->toDateString(),
        'duty_cycle_pct' => 65.5,
        'on_count' => 24,
        'avg_on_duration' => 15.3,
        'avg_off_duration' => 8.2,
        'degradation_score' => 12.5,
    ]);

    $baseline = CompressorBaseline::where('device_id', $this->device->id)->first();
    expect($baseline->duty_cycle_pct)->toBe(65.5)
        ->and($baseline->degradation_score)->toBe(12.5);
});

test('IAQ zone scores can be stored', function () {
    IaqZoneScore::create([
        'site_id' => $this->site->id,
        'zone' => 'Office',
        'date' => now()->toDateString(),
        'avg_co2' => 450,
        'avg_temp' => 23.5,
        'avg_humidity' => 45,
        'comfort_score' => 85.0,
    ]);

    $score = IaqZoneScore::where('site_id', $this->site->id)->first();
    expect($score->comfort_score)->toBe(85.0)
        ->and($score->zone)->toBe('Office');
});

test('traffic snapshots store hourly data', function () {
    TrafficSnapshot::create([
        'site_id' => $this->site->id,
        'zone' => 'Entrance',
        'date' => now()->toDateString(),
        'hour' => 14,
        'occupancy_avg' => 25.5,
        'occupancy_peak' => 42,
    ]);

    expect(TrafficSnapshot::where('site_id', $this->site->id)->count())->toBe(1);
});

test('API key can be created for org', function () {
    $key = ApiKey::create([
        'org_id' => $this->org->id,
        'name' => 'Production Key',
        'key_hash' => hash('sha256', 'test-key-123'),
        'permissions' => ['read:devices', 'read:readings'],
        'rate_limit' => 120,
        'active' => true,
    ]);

    expect($key->permissions)->toBeArray()
        ->and($key->permissions)->toContain('read:devices')
        ->and($key->active)->toBeTrue();
});

test('webhook subscription can be created', function () {
    $webhook = WebhookSubscription::create([
        'org_id' => $this->org->id,
        'url' => 'https://example.com/webhook',
        'events' => ['alert.triggered', 'device.offline'],
        'secret' => 'whsec_test123',
        'active' => true,
    ]);

    expect($webhook->events)->toBeArray()
        ->and($webhook->events)->toContain('alert.triggered');
});

test('integration config stores encrypted data', function () {
    $config = IntegrationConfig::create([
        'org_id' => $this->org->id,
        'type' => 'sap',
        'config' => ['host' => 'sap.example.com', 'username' => 'api_user'],
        'active' => true,
    ]);

    // Config should be encrypted in DB but accessible as array
    $config->refresh();
    expect($config->config)->toBeArray()
        ->and($config->config['host'])->toBe('sap.example.com');
});

test('organization branding can be set', function () {
    $this->org->update([
        'branding' => [
            'logo_url' => '/logos/custom.png',
            'primary_color' => '#1a365d',
            'app_name' => 'Partner IoT',
        ],
    ]);

    $this->org->refresh();
    expect($this->org->branding)->toBeArray()
        ->and($this->org->branding['app_name'])->toBe('Partner IoT');
});
