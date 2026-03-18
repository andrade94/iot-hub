<?php

use App\Jobs\CheckDeviceHealth;
use App\Jobs\CreateWorkOrder;
use App\Models\Gateway;
use App\Models\WorkOrder;
use Illuminate\Support\Facades\Queue;

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

test('auto-creates work order for device offline over 2 hours', function () {
    Queue::fake();

    $device = createDevice($this->site, [
        'status' => 'active',
        'last_reading_at' => now()->subHours(3),
    ]);

    (new CheckDeviceHealth)->handle();

    expect($device->fresh()->status)->toBe('offline');

    Queue::assertPushed(CreateWorkOrder::class, function ($job) use ($device) {
        return $job->deviceId === $device->id
            && $job->type === 'device_offline';
    });
});

test('auto-creates work order for low battery', function () {
    Queue::fake();

    $device = createDevice($this->site, [
        'status' => 'active',
        'battery_pct' => 10,
        'last_reading_at' => now(),
    ]);

    (new CheckDeviceHealth)->handle();

    Queue::assertPushed(CreateWorkOrder::class, function ($job) use ($device) {
        return $job->deviceId === $device->id
            && $job->type === 'low_battery';
    });
});

test('does not create duplicate work orders', function () {
    Queue::fake();

    $device = createDevice($this->site, [
        'status' => 'active',
        'battery_pct' => 10,
        'last_reading_at' => now(),
    ]);

    // Pre-create an open work order of the same type
    WorkOrder::create([
        'site_id' => $this->site->id,
        'device_id' => $device->id,
        'type' => 'low_battery',
        'title' => "Device '{$device->name}' battery at 10% — needs replacement.",
        'status' => 'open',
        'priority' => 'medium',
    ]);

    (new CheckDeviceHealth)->handle();

    // CreateWorkOrder should NOT be dispatched since an open one already exists
    Queue::assertNotPushed(CreateWorkOrder::class, function ($job) use ($device) {
        return $job->deviceId === $device->id
            && $job->type === 'low_battery';
    });
});

test('checks offline gateways', function () {
    Queue::fake();

    $gateway = Gateway::create([
        'site_id' => $this->site->id,
        'model' => 'UG67',
        'serial' => 'GW-001',
        'status' => 'registered',
        'last_seen_at' => now()->subMinutes(45),
    ]);

    // Attach a device to the gateway so a work order can be created
    $device = createDevice($this->site, [
        'gateway_id' => $gateway->id,
        'status' => 'active',
        'last_reading_at' => now(),
    ]);

    (new CheckDeviceHealth)->handle();

    Queue::assertPushed(CreateWorkOrder::class, function ($job) use ($device) {
        return $job->deviceId === $device->id
            && $job->type === 'gateway_offline';
    });
});
