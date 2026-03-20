<?php

use App\Jobs\DetectPlatformOutage;
use App\Models\SensorReading;
use App\Notifications\PlatformOutageAlert;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Redis;

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg();
    $this->site = createSite($this->org);
    Redis::flushdb();
});

test('no alert when recent readings exist', function () {
    Notification::fake();

    $device = createDevice($this->site);
    SensorReading::create([
        'device_id' => $device->id,
        'time' => now(),
        'metric' => 'temperature',
        'value' => 22.5,
    ]);

    (new DetectPlatformOutage)->handle();

    Notification::assertNothingSent();
});

test('alert sent to super_admins when no readings in 10 minutes', function () {
    Notification::fake();

    $superAdmin = createUserWithRole('super_admin', $this->org);
    $device = createDevice($this->site);

    // Only old reading exists
    SensorReading::create([
        'device_id' => $device->id,
        'time' => now()->subMinutes(15),
        'metric' => 'temperature',
        'value' => 22.5,
    ]);

    (new DetectPlatformOutage)->handle();

    Notification::assertSentTo($superAdmin, PlatformOutageAlert::class);
});

test('alert sent when no readings exist at all', function () {
    Notification::fake();

    $superAdmin = createUserWithRole('super_admin', $this->org);

    (new DetectPlatformOutage)->handle();

    Notification::assertSentTo($superAdmin, PlatformOutageAlert::class);
});

test('duplicate alert not sent within cooldown window', function () {
    Notification::fake();

    $superAdmin = createUserWithRole('super_admin', $this->org);

    (new DetectPlatformOutage)->handle();
    (new DetectPlatformOutage)->handle();

    Notification::assertSentToTimes($superAdmin, PlatformOutageAlert::class, 1);
});

test('non-super_admin users are not notified', function () {
    Notification::fake();

    $orgAdmin = createUserWithRole('org_admin', $this->org);

    (new DetectPlatformOutage)->handle();

    Notification::assertNotSentTo($orgAdmin, PlatformOutageAlert::class);
});

test('outage flag cleared when readings resume', function () {
    Notification::fake();

    $superAdmin = createUserWithRole('super_admin', $this->org);
    $device = createDevice($this->site);

    // First: trigger outage
    (new DetectPlatformOutage)->handle();
    expect(Redis::get('platform_outage_alerted'))->not->toBeNull();

    // Then: readings resume
    SensorReading::create([
        'device_id' => $device->id,
        'time' => now(),
        'metric' => 'temperature',
        'value' => 22.5,
    ]);

    (new DetectPlatformOutage)->handle();
    expect(Redis::get('platform_outage_alerted'))->toBeNull();
});
