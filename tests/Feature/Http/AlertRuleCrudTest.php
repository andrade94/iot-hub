<?php

// Covers: WF-RULES — Alert rule CRUD with permission gating

use App\Models\AlertRule;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('client_org_admin', $this->org);
    $this->device = createDevice($this->site, ['name' => 'Cooler Sensor', 'zone' => 'Walk-in']);
});

test('create page loads with site devices', function () {
    $response = $this->actingAs($this->user)
        ->get(route('rules.create', $this->site));

    $response->assertOk();

    $page = $response->viewData('page');
    $devices = $page['props']['devices'];

    expect($devices)->toBeArray()
        ->and(count($devices))->toBe(1);

    expect($devices[0]['name'])->toBe('Cooler Sensor');
});

test('store creates rule with conditions', function () {
    $this->actingAs($this->user)
        ->post(route('rules.store', $this->site), [
            'name' => 'Walk-in Over Temp',
            'device_id' => $this->device->id,
            'conditions' => [
                [
                    'metric' => 'temperature',
                    'condition' => 'above',
                    'threshold' => 6,
                    'duration_minutes' => 10,
                    'severity' => 'high',
                ],
            ],
            'severity' => 'high',
            'cooldown_minutes' => 15,
        ])
        ->assertRedirect();

    $rule = AlertRule::where('name', 'Walk-in Over Temp')->first();
    expect($rule)->not->toBeNull()
        ->and($rule->site_id)->toBe($this->site->id)
        ->and($rule->device_id)->toBe($this->device->id)
        ->and($rule->conditions)->toBeArray()
        ->and($rule->conditions[0]['metric'])->toBe('temperature')
        ->and($rule->conditions[0]['threshold'])->toBe(6)
        ->and($rule->cooldown_minutes)->toBe(15);
});

test('edit page loads with rule data pre-populated', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'name' => 'Existing Rule',
        'conditions' => [['metric' => 'humidity', 'condition' => 'below', 'threshold' => 30, 'duration_minutes' => 15, 'severity' => 'medium']],
        'severity' => 'medium',
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('rules.edit', [$this->site, $rule]));

    $response->assertOk();

    $page = $response->viewData('page');
    $ruleData = $page['props']['rule'];
    $devicesData = $page['props']['devices'];

    expect($ruleData['name'])->toBe('Existing Rule')
        ->and($ruleData['severity'])->toBe('medium')
        ->and($ruleData['conditions'])->toBeArray()
        ->and(count($ruleData['conditions']))->toBe(1);

    expect($devicesData)->toBeArray()
        ->and(count($devicesData))->toBe(1);
});

test('update modifies rule name and severity', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Old Name',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    $this->actingAs($this->user)
        ->put(route('rules.update', [$this->site, $rule]), [
            'name' => 'Updated Rule Name',
            'severity' => 'critical',
        ])
        ->assertRedirect();

    $rule->refresh();
    expect($rule->name)->toBe('Updated Rule Name')
        ->and($rule->severity)->toBe('critical');
});

test('update modifies rule conditions', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Condition Test',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    $newConditions = [
        ['metric' => 'humidity', 'condition' => 'below', 'threshold' => 20, 'duration_minutes' => 10, 'severity' => 'critical'],
    ];

    $this->actingAs($this->user)
        ->put(route('rules.update', [$this->site, $rule]), [
            'conditions' => $newConditions,
        ])
        ->assertRedirect();

    $rule->refresh();
    expect($rule->conditions[0]['metric'])->toBe('humidity')
        ->and($rule->conditions[0]['threshold'])->toBe(20);
});

test('requires manage alert rules permission — site_viewer is blocked', function () {
    $viewer = createUserWithRole('client_site_viewer', $this->org);
    $viewer->sites()->attach($this->site->id, ['assigned_at' => now()]);

    // Cannot list rules
    $this->actingAs($viewer)
        ->get(route('rules.index', $this->site))
        ->assertForbidden();

    // Cannot create rules
    $this->actingAs($viewer)
        ->get(route('rules.create', $this->site))
        ->assertForbidden();

    // Cannot store rules
    $this->actingAs($viewer)
        ->post(route('rules.store', $this->site), [
            'name' => 'Blocked',
            'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
            'severity' => 'high',
        ])
        ->assertForbidden();
});

test('site_manager with manage alert rules permission can create rules', function () {
    $manager = createUserWithRole('client_site_manager', $this->org);
    $manager->sites()->attach($this->site->id, ['assigned_at' => now()]);

    $this->actingAs($manager)
        ->post(route('rules.store', $this->site), [
            'name' => 'Manager Rule',
            'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
            'severity' => 'high',
        ])
        ->assertRedirect();

    expect(AlertRule::where('name', 'Manager Rule')->exists())->toBeTrue();
});

test('store with multiple conditions', function () {
    $this->actingAs($this->user)
        ->post(route('rules.store', $this->site), [
            'name' => 'Multi-condition Rule',
            'conditions' => [
                ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high'],
                ['metric' => 'humidity', 'condition' => 'below', 'threshold' => 20, 'duration_minutes' => 10, 'severity' => 'critical'],
            ],
            'severity' => 'critical',
        ])
        ->assertRedirect();

    $rule = AlertRule::where('name', 'Multi-condition Rule')->first();
    expect(count($rule->conditions))->toBe(2);
});

test('guest is redirected to login', function () {
    $this->get(route('rules.index', $this->site))
        ->assertRedirect(route('login'));
});
