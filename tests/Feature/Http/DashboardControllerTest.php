<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\WorkOrder;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->admin = createUserWithRole('org_admin', $this->org);
});

// ──────────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────────

test('guest is redirected to login', function () {
    $this->get(route('dashboard'))
        ->assertRedirect(route('login'));
});

test('authenticated user can view dashboard', function () {
    $this->actingAs($this->admin)
        ->get(route('dashboard'))
        ->assertOk();
});

// ──────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────

test('dashboard returns kpis and siteStats props', function () {
    $this->actingAs($this->admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('kpis')
            ->has('kpis.total_devices')
            ->has('kpis.online_devices')
            ->has('kpis.active_alerts')
            ->has('kpis.open_work_orders')
            ->has('siteStats')
        );
});

// ──────────────────────────────────────────────────────────────────────
// KPI Data
// ──────────────────────────────────────────────────────────────────────

test('dashboard shows real device counts per site', function () {
    // Create devices in the site — 2 online, 1 offline
    createDevice($this->site, [
        'name' => 'Online Sensor 1',
        'last_reading_at' => now()->subMinutes(5),
    ]);
    createDevice($this->site, [
        'name' => 'Online Sensor 2',
        'last_reading_at' => now()->subMinutes(10),
    ]);
    createDevice($this->site, [
        'name' => 'Offline Sensor',
        'last_reading_at' => now()->subHours(2),
    ]);

    // Create an unresolved alert
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Temp rule',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    // Create an open work order
    WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Fix sensor',
        'type' => 'corrective',
        'status' => 'open',
        'priority' => 'high',
        'created_by' => $this->admin->id,
    ]);

    $response = $this->actingAs($this->admin)
        ->get(route('dashboard'))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->where('kpis.total_devices', 3)
        ->where('kpis.online_devices', 2)
        ->where('kpis.active_alerts', 1)
        ->where('kpis.open_work_orders', 1)
    );
});

test('dashboard siteStats includes device counts for each site', function () {
    // Create a second site with its own devices
    $site2 = createSite($this->org, ['name' => 'Second Site']);

    createDevice($this->site, [
        'name' => 'Site1 Device',
        'last_reading_at' => now()->subMinutes(3),
    ]);
    createDevice($site2, [
        'name' => 'Site2 Device 1',
        'last_reading_at' => now()->subMinutes(2),
    ]);
    createDevice($site2, [
        'name' => 'Site2 Device 2',
        'last_reading_at' => now()->subHours(1),
    ]);

    $response = $this->actingAs($this->admin)
        ->get(route('dashboard'))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->has('siteStats', 2)
    );
});
