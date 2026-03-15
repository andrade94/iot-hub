<?php

use App\Models\Gateway;
use App\Services\ChirpStack\DeviceProvisioner;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
    config(['services.chirpstack.url' => 'https://chirpstack.test']);
    config(['services.chirpstack.api_key' => 'test-key']);
    config(['services.chirpstack.tenant_id' => 'tenant-1']);

    $this->provisioner = new DeviceProvisioner;
});

test('provision device successfully', function () {
    Http::fake([
        'chirpstack.test/api/devices' => Http::response([], 200),
        'chirpstack.test/api/devices/*/keys' => Http::response([], 200),
    ]);

    $device = createDevice($this->site, ['app_key' => 'AABBCCDD11223344', 'status' => 'pending']);

    $result = $this->provisioner->provisionDevice($device, 'app-1', 'dp-1');

    expect($result)->toBeTrue();
    expect($device->fresh()->status)->toBe('provisioned');
});

test('provision device failure returns false', function () {
    Http::fake([
        'chirpstack.test/api/devices' => Http::response('Error', 500),
    ]);

    $device = createDevice($this->site, ['status' => 'pending']);

    $result = $this->provisioner->provisionDevice($device, 'app-1', 'dp-1');

    expect($result)->toBeFalse();
    expect($device->fresh()->status)->toBe('pending'); // Unchanged
});

test('provision gateway successfully', function () {
    Http::fake([
        'chirpstack.test/api/gateways' => Http::response([], 200),
    ]);

    $gateway = Gateway::create([
        'site_id' => $this->site->id,
        'model' => 'UG65',
        'serial' => 'GW-PROV-001',
        'status' => 'offline',
    ]);

    $result = $this->provisioner->provisionGateway($gateway);

    expect($result)->toBeTrue();
    expect($gateway->fresh()->status)->toBe('registered');
    expect($gateway->fresh()->chirpstack_id)->toBe('GW-PROV-001');
});

test('provision gateway failure returns false', function () {
    Http::fake([
        'chirpstack.test/api/gateways' => Http::response('Error', 500),
    ]);

    $gateway = Gateway::create([
        'site_id' => $this->site->id,
        'model' => 'UG65',
        'serial' => 'GW-FAIL-001',
        'status' => 'offline',
    ]);

    $result = $this->provisioner->provisionGateway($gateway);

    expect($result)->toBeFalse();
});

test('deprovision device makes delete request', function () {
    Http::fake([
        'chirpstack.test/api/devices/*' => Http::response([], 200),
    ]);

    $device = createDevice($this->site);

    $result = $this->provisioner->deprovisionDevice($device);

    expect($result)->toBeTrue();
    Http::assertSentCount(1);
});

test('provision device sets OTAA keys when app_key present', function () {
    Http::fake([
        'chirpstack.test/api/devices' => Http::response([], 200),
        'chirpstack.test/api/devices/*/keys' => Http::response([], 200),
    ]);

    $device = createDevice($this->site, ['app_key' => 'KEY12345678ABCDEF', 'status' => 'pending']);

    $this->provisioner->provisionDevice($device, 'app-1', 'dp-1');

    Http::assertSentCount(2); // Device create + keys set
});

test('network error returns false gracefully', function () {
    Http::fake(function () {
        throw new \Illuminate\Http\Client\ConnectionException('Network error');
    });

    $device = createDevice($this->site, ['status' => 'pending']);

    $result = $this->provisioner->provisionDevice($device, 'app-1', 'dp-1');

    expect($result)->toBeFalse();
});
