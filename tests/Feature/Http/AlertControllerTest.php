<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('client_org_admin', $this->org);
    $this->device = createDevice($this->site);

    $this->rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'High temp',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);
});

test('org_admin can list alerts', function () {
    Alert::create([
        'rule_id' => $this->rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->get(route('alerts.index'))
        ->assertOk();
});

test('alerts default to active and acknowledged', function () {
    Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);
    Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'low', 'status' => 'resolved', 'triggered_at' => now()->subHour()]);

    $this->actingAs($this->user)
        ->get(route('alerts.index'))
        ->assertOk();
});

test('alerts can be filtered by severity', function () {
    Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'critical', 'status' => 'active', 'triggered_at' => now()]);

    $this->actingAs($this->user)
        ->get(route('alerts.index', ['severity' => 'critical']))
        ->assertOk();
});

test('alerts can be filtered by status', function () {
    Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'resolved', 'triggered_at' => now()]);

    $this->actingAs($this->user)
        ->get(route('alerts.index', ['status' => 'resolved']))
        ->assertOk();
});

test('alerts can be filtered by site_id', function () {
    Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);

    $this->actingAs($this->user)
        ->get(route('alerts.index', ['site_id' => $this->site->id]))
        ->assertOk();
});

test('alerts can be filtered by date range', function () {
    Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);

    $this->actingAs($this->user)
        ->get(route('alerts.index', ['from' => now()->subDay()->toDateTimeString(), 'to' => now()->toDateTimeString()]))
        ->assertOk();
});

test('alerts are scoped to user accessible sites', function () {
    $otherOrg = createOrg(['name' => 'Other']);
    $otherSite = createSite($otherOrg, ['name' => 'Other Site']);
    $otherRule = AlertRule::create(['site_id' => $otherSite->id, 'name' => 'Other', 'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']], 'severity' => 'high']);
    Alert::create(['rule_id' => $otherRule->id, 'site_id' => $otherSite->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);

    $this->actingAs($this->user)
        ->get(route('alerts.index'))
        ->assertOk();
});

test('org_admin can view an alert', function () {
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);

    $this->actingAs($this->user)
        ->get(route('alerts.show', $alert))
        ->assertOk();
});

test('org_admin can acknowledge an alert', function () {
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);

    $this->actingAs($this->user)
        ->post(route('alerts.acknowledge', $alert))
        ->assertRedirect();

    expect($alert->fresh()->status)->toBe('acknowledged');
});

test('org_admin can resolve an alert', function () {
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);

    $this->actingAs($this->user)
        ->post(route('alerts.resolve', $alert))
        ->assertRedirect();

    expect($alert->fresh()->status)->toBe('resolved');
});

test('org_admin can dismiss an alert', function () {
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);

    $this->actingAs($this->user)
        ->post(route('alerts.dismiss', $alert))
        ->assertRedirect();

    expect($alert->fresh()->status)->toBe('dismissed');
});

test('guest is redirected to login', function () {
    $this->get(route('alerts.index'))
        ->assertRedirect(route('login'));
});
