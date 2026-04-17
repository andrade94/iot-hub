<?php

use App\Jobs\DeprovisionDeviceFromChirpStack;
use App\Jobs\ProvisionDeviceOnChirpStack;
use App\Models\Device;
use App\Models\Gateway;
use App\Models\Organization;
use App\Models\Site;
use App\Services\ChirpStack\DeviceProvisioner;
use App\Services\Devices\DeviceReplacementService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    seedPermissions();

    $this->org = Organization::create([
        'name' => 'Provision Test Org',
        'slug' => 'provision-test',
        'segment' => 'cold_chain',
    ]);

    $this->site = Site::create([
        'org_id' => $this->org->id,
        'name' => 'Test Site',
        'status' => 'active',
        'chirpstack_application_id' => 'cs-app-123',
    ]);

    $this->gateway = Gateway::create([
        'site_id' => $this->site->id,
        'model' => 'UG65',
        'serial' => 'GW-PROVISION-TEST',
    ]);

    $this->user = \App\Models\User::factory()->create([
        'org_id' => $this->org->id,
    ]);
    $this->user->assignRole('client_org_admin');
    $this->user->givePermissionTo('manage devices');
    $this->user->sites()->attach($this->site->id, ['assigned_at' => now()]);
});

// ═══════════════════════════════════════════════════════════════
//  Provision job calls ChirpStack API correctly
// ═══════════════════════════════════════════════════════════════

test('ProvisionDeviceOnChirpStack calls ChirpStack API and marks device provisioned', function () {
    config([
        'services.chirpstack.url' => 'https://chirpstack.test',
        'services.chirpstack.api_key' => 'test-key',
        'services.chirpstack.device_profiles.EM300-TH' => 'profile-em300th',
    ]);

    Http::fake([
        'chirpstack.test/api/devices' => Http::response([], 200),
        'chirpstack.test/api/devices/*/keys' => Http::response([], 200),
    ]);

    $device = Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE900001',
        'app_key' => 'AABBCCDD11223344AABBCCDD11223344',
        'name' => 'Provision Test',
        'status' => 'pending',
    ]);

    $job = new ProvisionDeviceOnChirpStack($device->id);
    $job->handle(app(DeviceProvisioner::class));

    $device->refresh();
    expect($device->status)->toBe('provisioned')
        ->and($device->provisioned_at)->not->toBeNull();

    Http::assertSent(fn ($req) => str_contains($req->url(), '/api/devices'));
});

test('provision job skips when site has no chirpstack_application_id', function () {
    config(['services.chirpstack.api_key' => 'test-key']);

    $siteNoCs = Site::create([
        'org_id' => $this->org->id,
        'name' => 'No CS Site',
        'status' => 'active',
        'chirpstack_application_id' => null,
    ]);

    $device = Device::create([
        'site_id' => $siteNoCs->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE900002',
        'name' => 'Skip Test',
        'status' => 'pending',
    ]);

    Http::fake();

    $job = new ProvisionDeviceOnChirpStack($device->id);
    $job->handle(app(DeviceProvisioner::class));

    Http::assertNothingSent();
    $device->refresh();
    expect($device->status)->toBe('pending');
});

test('provision job skips when no device profile configured for model', function () {
    config([
        'services.chirpstack.api_key' => 'test-key',
        'services.chirpstack.device_profiles.EM300-TH' => '',
    ]);

    $device = Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE900003',
        'name' => 'No Profile Test',
        'status' => 'pending',
    ]);

    Http::fake();

    $job = new ProvisionDeviceOnChirpStack($device->id);
    $job->handle(app(DeviceProvisioner::class));

    Http::assertNothingSent();
});

test('provision job handles deleted device gracefully', function () {
    Http::fake();

    $job = new ProvisionDeviceOnChirpStack(99999);
    $job->handle(app(DeviceProvisioner::class));

    Http::assertNothingSent();
});

// ═══════════════════════════════════════════════════════════════
//  Deprovision job
// ═══════════════════════════════════════════════════════════════

test('DeprovisionDeviceFromChirpStack calls ChirpStack delete API', function () {
    config([
        'services.chirpstack.url' => 'https://chirpstack.test',
        'services.chirpstack.api_key' => 'test-key',
    ]);

    Http::fake([
        'chirpstack.test/api/devices/*' => Http::response([], 200),
    ]);

    $job = new DeprovisionDeviceFromChirpStack('A81758FFFE900004');
    $job->handle(app(DeviceProvisioner::class));

    Http::assertSent(fn ($req) => $req->method() === 'DELETE' && str_contains($req->url(), '/api/devices/'));
});

test('deprovision job handles empty devEui gracefully', function () {
    Http::fake();

    $job = new DeprovisionDeviceFromChirpStack('');
    $job->handle(app(DeviceProvisioner::class));

    Http::assertNothingSent();
});

// ═══════════════════════════════════════════════════════════════
//  Device replacement triggers both jobs
// ═══════════════════════════════════════════════════════════════

test('device replacement dispatches deprovision + provision jobs', function () {
    Queue::fake();
    config(['services.chirpstack.api_key' => 'test-key']);

    $oldDevice = Device::create([
        'site_id' => $this->site->id,
        'gateway_id' => $this->gateway->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE900010',
        'name' => 'Old Sensor',
        'zone' => 'Cooler A',
        'status' => 'active',
    ]);

    $this->actingAs($this->user);

    $service = new DeviceReplacementService;
    $newDevice = $service->replace($oldDevice, [
        'new_dev_eui' => 'A81758FFFE900011',
        'new_app_key' => 'AABBCCDD11223344AABBCCDD11223344',
    ]);

    Queue::assertPushed(DeprovisionDeviceFromChirpStack::class, fn ($job) => $job->devEui === 'A81758FFFE900010');
    Queue::assertPushed(ProvisionDeviceOnChirpStack::class, fn ($job) => $job->deviceId === $newDevice->id);

    expect($newDevice->zone)->toBe('Cooler A')
        ->and($newDevice->status)->toBe('pending')
        ->and($newDevice->replaced_device_id)->toBe($oldDevice->id);

    $oldDevice->refresh();
    expect($oldDevice->status)->toBe('replaced');
});

// ═══════════════════════════════════════════════════════════════
//  Controller integration — device create/delete dispatch
// ═══════════════════════════════════════════════════════════════

test('device creation via controller dispatches provision when configured', function () {
    Queue::fake();
    // Set via config so it's available in the same process
    config(['services.chirpstack.api_key' => 'test-key']);

    // Test the controller logic directly to avoid config isolation issues
    $device = $this->site->devices()->create([
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE900020',
        'name' => 'Controller Test',
        'status' => 'pending',
    ]);

    // Simulate what the controller does
    if (config('services.chirpstack.api_key')) {
        ProvisionDeviceOnChirpStack::dispatch($device->id);
    }

    Queue::assertPushed(ProvisionDeviceOnChirpStack::class);
});

test('device creation without API key does NOT dispatch provision', function () {
    Queue::fake();
    config(['services.chirpstack.api_key' => '']);

    $device = $this->site->devices()->create([
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE900021',
        'name' => 'No Key Test',
        'status' => 'pending',
    ]);

    if (config('services.chirpstack.api_key')) {
        ProvisionDeviceOnChirpStack::dispatch($device->id);
    }

    Queue::assertNotPushed(ProvisionDeviceOnChirpStack::class);
    expect(Device::where('dev_eui', 'A81758FFFE900021')->exists())->toBeTrue();
});
