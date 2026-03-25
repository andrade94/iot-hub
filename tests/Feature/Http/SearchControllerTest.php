<?php

// Covers: WF-CMD-K — Global search endpoint

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\WorkOrder;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org, ['name' => 'Main Warehouse']);
    $this->user = createUserWithRole('client_org_admin', $this->org);
    $this->device = createDevice($this->site, ['name' => 'Freezer Sensor A1']);
});

test('guest is redirected to login', function () {
    $this->getJson(route('search', ['q' => 'test']))
        ->assertUnauthorized();
});

test('search returns sites matching query', function () {
    $response = $this->actingAs($this->user)
        ->getJson(route('search', ['q' => 'Warehouse']));

    $response->assertOk()
        ->assertJsonPath('sites.0.name', 'Main Warehouse');
});

test('search returns devices matching query by name', function () {
    $response = $this->actingAs($this->user)
        ->getJson(route('search', ['q' => 'Freezer']));

    $response->assertOk()
        ->assertJsonPath('devices.0.name', 'Freezer Sensor A1');
});

test('search returns devices matching query by dev_eui', function () {
    $devEui = $this->device->dev_eui;

    $response = $this->actingAs($this->user)
        ->getJson(route('search', ['q' => substr($devEui, 0, 8)]));

    $response->assertOk()
        ->assertJsonStructure(['devices']);
});

test('search returns alerts matching query', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'High Temperature Alert',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
        'data' => ['rule_name' => 'High Temperature Alert', 'device_name' => 'Freezer Sensor A1'],
    ]);

    $response = $this->actingAs($this->user)
        ->getJson(route('search', ['q' => 'Temperature']));

    $response->assertOk()
        ->assertJsonStructure(['alerts']);
});

test('search respects org scoping — user cannot see other org data', function () {
    $otherOrg = createOrg(['name' => 'Other Org']);
    $otherSite = createSite($otherOrg, ['name' => 'Secret Site']);
    createDevice($otherSite, ['name' => 'Secret Sensor']);

    $response = $this->actingAs($this->user)
        ->getJson(route('search', ['q' => 'Secret']));

    $response->assertOk()
        ->assertJsonMissing(['name' => 'Secret Site'])
        ->assertJsonMissing(['name' => 'Secret Sensor']);
});

test('empty query returns validation error', function () {
    $this->actingAs($this->user)
        ->getJson(route('search', ['q' => '']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('q');
});

test('missing query returns validation error', function () {
    $this->actingAs($this->user)
        ->getJson(route('search'))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('q');
});

test('query exceeding max length returns validation error', function () {
    $this->actingAs($this->user)
        ->getJson(route('search', ['q' => str_repeat('a', 101)]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('q');
});

test('search returns work orders matching query', function () {
    WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Compressor Repair Needed',
        'status' => 'open',
        'priority' => 'high',
        'type' => 'corrective',
    ]);

    $response = $this->actingAs($this->user)
        ->getJson(route('search', ['q' => 'Compressor']));

    $response->assertOk()
        ->assertJsonPath('work_orders.0.name', 'Compressor Repair Needed');
});

test('search with no matches returns empty result', function () {
    $response = $this->actingAs($this->user)
        ->getJson(route('search', ['q' => 'nonexistent_xyz_12345']));

    $response->assertOk()
        ->assertExactJson([]);
});
