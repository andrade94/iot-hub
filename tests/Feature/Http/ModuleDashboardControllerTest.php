<?php

use App\Models\CompressorBaseline;
use App\Models\Device;
use App\Models\IaqZoneScore;
use App\Models\SensorReading;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->admin = createUserWithRole('org_admin', $this->org);
});

// ──────────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────────

test('guest is redirected to login for IAQ dashboard', function () {
    $this->get(route('modules.iaq', $this->site))
        ->assertRedirect(route('login'));
});

test('guest is redirected to login for industrial dashboard', function () {
    $this->get(route('modules.industrial', $this->site))
        ->assertRedirect(route('login'));
});

// ──────────────────────────────────────────────────────────────────────
// IAQ Dashboard
// ──────────────────────────────────────────────────────────────────────

test('authenticated user can access IAQ dashboard', function () {
    $this->actingAs($this->admin)
        ->get(route('modules.iaq', $this->site))
        ->assertOk();
});

test('IAQ dashboard returns correct Inertia component and props', function () {
    IaqZoneScore::factory()->create([
        'site_id' => $this->site->id,
        'zone' => 'kitchen',
    ]);

    $this->actingAs($this->admin)
        ->get(route('modules.iaq', $this->site))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('modules/iaq')
            ->has('site')
            ->has('zones')
            ->has('chartData')
            ->where('site.id', $this->site->id)
            ->where('site.name', $this->site->name)
        );
});

test('IAQ dashboard returns empty zones when no data', function () {
    $this->actingAs($this->admin)
        ->get(route('modules.iaq', $this->site))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('modules/iaq')
            ->where('zones', [])
        );
});

// ──────────────────────────────────────────────────────────────────────
// Industrial Dashboard
// ──────────────────────────────────────────────────────────────────────

test('authenticated user can access industrial dashboard', function () {
    $this->actingAs($this->admin)
        ->get(route('modules.industrial', $this->site))
        ->assertOk();
});

test('industrial dashboard returns correct Inertia component and props', function () {
    $device = createDevice($this->site, [
        'model' => 'CT101',
        'status' => 'active',
    ]);

    SensorReading::create([
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 5.5,
        'unit' => 'A',
        'time' => now()->subMinutes(10),
    ]);

    $this->actingAs($this->admin)
        ->get(route('modules.industrial', $this->site))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('modules/industrial')
            ->has('site')
            ->has('devices')
            ->has('chartData')
            ->has('compressorHealth')
            ->where('site.id', $this->site->id)
        );
});

test('industrial dashboard returns empty devices when no matching models', function () {
    // Create a device with a non-industrial model
    createDevice($this->site, [
        'model' => 'EM300-TH',
        'status' => 'active',
    ]);

    $this->actingAs($this->admin)
        ->get(route('modules.industrial', $this->site))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('modules/industrial')
            ->where('devices', [])
        );
});

test('industrial dashboard includes compressor health data', function () {
    $device = createDevice($this->site, [
        'model' => 'CT101',
        'status' => 'active',
    ]);

    CompressorBaseline::factory()->create([
        'device_id' => $device->id,
        'degradation_score' => 15,
        'duty_cycle_pct' => 45,
    ]);

    $this->actingAs($this->admin)
        ->get(route('modules.industrial', $this->site))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('modules/industrial')
            ->has('compressorHealth')
        );
});

test('industrial dashboard supports period parameter', function () {
    $this->actingAs($this->admin)
        ->get(route('modules.industrial', ['site' => $this->site, 'period' => '7d']))
        ->assertOk();
});

test('user without site access is forbidden', function () {
    $otherOrg = createOrg(['name' => 'Other Org']);
    $otherSite = createSite($otherOrg);
    $viewer = createUserWithRole('site_viewer', $otherOrg);

    $this->actingAs($viewer)
        ->get(route('modules.iaq', $otherSite))
        ->assertForbidden();
});
