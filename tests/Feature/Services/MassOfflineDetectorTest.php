<?php

use App\Models\Alert;
use App\Models\Device;
use App\Models\Gateway;
use App\Services\Alerts\MassOfflineDetector;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->detector = new MassOfflineDetector;
});

test('detects mass offline when >50% devices offline', function () {
    // Create 10 devices, make 6 offline (60%)
    for ($i = 0; $i < 4; $i++) {
        createDevice($this->site, ['status' => 'active', 'last_reading_at' => now()]);
    }
    for ($i = 0; $i < 6; $i++) {
        createDevice($this->site, ['status' => 'offline', 'last_reading_at' => now()->subMinutes(10)]);
    }

    $result = $this->detector->check($this->site);

    expect($result)->toBeTrue();
    expect(Alert::where('site_id', $this->site->id)->where('data->type', 'mass_offline')->count())->toBe(1);
});

test('does not trigger for <50% offline', function () {
    // Create 10 devices, make 4 offline (40%)
    for ($i = 0; $i < 6; $i++) {
        createDevice($this->site, ['status' => 'active', 'last_reading_at' => now()]);
    }
    for ($i = 0; $i < 4; $i++) {
        createDevice($this->site, ['status' => 'offline', 'last_reading_at' => now()->subMinutes(10)]);
    }

    $result = $this->detector->check($this->site);

    expect($result)->toBeFalse();
    expect(Alert::where('data->type', 'mass_offline')->count())->toBe(0);
});

test('creates single site-level alert not per-device alerts', function () {
    for ($i = 0; $i < 8; $i++) {
        createDevice($this->site, ['status' => 'offline', 'last_reading_at' => now()->subMinutes(10)]);
    }

    $this->detector->check($this->site);

    // Only 1 alert, not 8
    expect(Alert::where('site_id', $this->site->id)->count())->toBe(1);
    expect(Alert::first()->severity)->toBe('critical');
    expect(Alert::first()->data['type'])->toBe('mass_offline');
});

test('detects gateway offline as root cause', function () {
    Gateway::factory()->create([
        'site_id' => $this->site->id,
        'status' => 'registered',
        'last_seen_at' => now()->subHours(1), // offline
    ]);

    for ($i = 0; $i < 5; $i++) {
        createDevice($this->site, ['status' => 'offline', 'last_reading_at' => now()->subMinutes(10)]);
    }

    $this->detector->check($this->site);

    $alert = Alert::first();
    expect($alert->data['gateway_offline'])->toBeTrue();
    expect($alert->data['rule_name'])->toBe('Gateway Offline');
});

test('cooldown prevents duplicate mass offline alerts', function () {
    for ($i = 0; $i < 5; $i++) {
        createDevice($this->site, ['status' => 'offline', 'last_reading_at' => now()->subMinutes(10)]);
    }

    $this->detector->check($this->site);
    $this->detector->check($this->site);

    expect(Alert::where('data->type', 'mass_offline')->count())->toBe(1);
});

test('returns false for site with no devices', function () {
    $result = $this->detector->check($this->site);

    expect($result)->toBeFalse();
});
