<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\EscalationChain;
use App\Models\Gateway;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Services\Alerts\AlertRouter;
use App\Services\Alerts\EscalationService;
use App\Services\RulesEngine\RuleEvaluator;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'Alert Test Org', 'slug' => 'alert-test-org', 'segment' => 'cold_chain',
    ]);

    $this->site = Site::create([
        'org_id' => $this->org->id,
        'name' => 'Alert Test Site',
        'status' => 'active',
    ]);

    $this->device = Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE900001',
        'name' => 'Test Cooler',
        'zone' => 'Cooler A',
        'status' => 'active',
    ]);
});

// ── AlertRule Model Tests ────────────────────────────

test('alert rules can be created with conditions', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'High Temp Alert',
        'type' => 'simple',
        'conditions' => [
            ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 10, 'severity' => 'high'],
        ],
        'severity' => 'high',
        'cooldown_minutes' => 30,
        'active' => true,
    ]);

    expect($rule->conditions)->toBeArray()
        ->and($rule->conditions[0]['metric'])->toBe('temperature')
        ->and($rule->active)->toBeTrue();
});

test('active scope filters rules correctly', function () {
    AlertRule::create([
        'site_id' => $this->site->id, 'name' => 'Active', 'conditions' => [],
        'severity' => 'high', 'active' => true,
    ]);
    AlertRule::create([
        'site_id' => $this->site->id, 'name' => 'Inactive', 'conditions' => [],
        'severity' => 'low', 'active' => false,
    ]);

    expect(AlertRule::active()->count())->toBe(1);
});

// ── Alert Model Tests ────────────────────────────────

test('alert can be created and has relationships', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id, 'name' => 'Test Rule',
        'conditions' => [], 'severity' => 'high',
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
        'data' => ['metric' => 'temperature', 'value' => 12.5],
    ]);

    expect($alert->rule->id)->toBe($rule->id)
        ->and($alert->site->id)->toBe($this->site->id)
        ->and($alert->device->id)->toBe($this->device->id)
        ->and($alert->data['value'])->toBe(12.5);
});

test('alert acknowledge method works', function () {
    $alert = Alert::create([
        'site_id' => $this->site->id, 'device_id' => $this->device->id,
        'severity' => 'high', 'status' => 'active', 'triggered_at' => now(),
    ]);

    $user = User::factory()->create(['org_id' => $this->org->id]);
    $alert->acknowledge($user->id);

    $alert->refresh();
    expect($alert->status)->toBe('acknowledged')
        ->and($alert->acknowledged_at)->not->toBeNull();
});

test('alert resolve method works', function () {
    $alert = Alert::create([
        'site_id' => $this->site->id, 'device_id' => $this->device->id,
        'severity' => 'high', 'status' => 'active', 'triggered_at' => now(),
    ]);

    $user = User::factory()->create(['org_id' => $this->org->id]);
    $alert->resolve($user->id, 'manual');

    $alert->refresh();
    expect($alert->status)->toBe('resolved')
        ->and($alert->resolved_by)->toBe($user->id)
        ->and($alert->resolution_type)->toBe('manual');
});

test('alert dismiss method works', function () {
    $alert = Alert::create([
        'site_id' => $this->site->id, 'device_id' => $this->device->id,
        'severity' => 'low', 'status' => 'active', 'triggered_at' => now(),
    ]);

    $user = User::factory()->create(['org_id' => $this->org->id]);
    $alert->dismiss($user->id);

    $alert->refresh();
    expect($alert->status)->toBe('dismissed')
        ->and($alert->resolution_type)->toBe('dismissed');
});

test('alert scopes filter correctly', function () {
    Alert::create([
        'site_id' => $this->site->id, 'severity' => 'high',
        'status' => 'active', 'triggered_at' => now(),
    ]);
    Alert::create([
        'site_id' => $this->site->id, 'severity' => 'low',
        'status' => 'resolved', 'triggered_at' => now()->subHour(),
        'resolved_at' => now(),
    ]);
    Alert::create([
        'site_id' => $this->site->id, 'severity' => 'medium',
        'status' => 'acknowledged', 'triggered_at' => now()->subMinutes(30),
    ]);

    expect(Alert::active()->count())->toBe(1)
        ->and(Alert::unresolved()->count())->toBe(2) // active + acknowledged
        ->and(Alert::forSite($this->site->id)->count())->toBe(3);
});

// ── RuleEvaluator Tests ──────────────────────────────

test('RuleEvaluator triggers alert on immediate breach (duration=0)', function () {
    AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Immediate Temp Alert',
        'conditions' => [
            ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 0, 'severity' => 'critical'],
        ],
        'severity' => 'critical',
        'cooldown_minutes' => 0,
    ]);

    $evaluator = app(RuleEvaluator::class);
    $evaluator->evaluate($this->device, [
        'temperature' => ['value' => 12.5, 'unit' => '°C'],
    ]);

    expect(Alert::where('device_id', $this->device->id)->count())->toBe(1);

    $alert = Alert::where('device_id', $this->device->id)->first();
    expect($alert->severity)->toBe('critical')
        ->and($alert->data['metric'])->toBe('temperature')
        ->and($alert->data['value'])->toBe(12.5);
});

test('RuleEvaluator does not trigger when value is within threshold', function () {
    AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'No Trigger Rule',
        'conditions' => [
            ['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 0, 'severity' => 'high'],
        ],
        'severity' => 'high',
    ]);

    $evaluator = app(RuleEvaluator::class);
    $evaluator->evaluate($this->device, [
        'temperature' => ['value' => 5.0, 'unit' => '°C'],
    ]);

    expect(Alert::count())->toBe(0);
});

test('RuleEvaluator handles below condition', function () {
    AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Freezer Too Cold',
        'conditions' => [
            ['metric' => 'temperature', 'condition' => 'below', 'threshold' => -25, 'duration_minutes' => 0, 'severity' => 'medium'],
        ],
        'severity' => 'medium',
        'cooldown_minutes' => 0,
    ]);

    $evaluator = app(RuleEvaluator::class);
    $evaluator->evaluate($this->device, [
        'temperature' => ['value' => -28.0, 'unit' => '°C'],
    ]);

    expect(Alert::count())->toBe(1);
    expect(Alert::first()->severity)->toBe('medium');
});

test('RuleEvaluator handles equals condition (door open)', function () {
    $door = Device::create([
        'site_id' => $this->site->id, 'model' => 'WS301',
        'dev_eui' => 'A81758FFFE900002', 'name' => 'Door Sensor',
        'status' => 'active',
    ]);

    AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Door Open Alert',
        'conditions' => [
            ['metric' => 'door_status', 'condition' => 'equals', 'threshold' => 1, 'duration_minutes' => 0, 'severity' => 'high'],
        ],
        'severity' => 'high',
        'cooldown_minutes' => 0,
    ]);

    $evaluator = app(RuleEvaluator::class);
    $evaluator->evaluate($door, [
        'door_status' => ['value' => 1.0, 'unit' => ''],
    ]);

    expect(Alert::where('device_id', $door->id)->count())->toBe(1);
});

// ── EscalationService Tests ─────────────────────────

test('EscalationService skips escalation if alert already acknowledged', function () {
    $alert = Alert::create([
        'site_id' => $this->site->id, 'severity' => 'critical',
        'status' => 'acknowledged', 'triggered_at' => now(),
        'acknowledged_at' => now(),
    ]);

    $user = User::factory()->create(['org_id' => $this->org->id]);
    $chain = EscalationChain::create([
        'site_id' => $this->site->id, 'level' => 2,
        'user_id' => $user->id, 'delay_minutes' => 10, 'channel' => 'push',
    ]);

    $service = app(EscalationService::class);
    $service->escalate($alert, $chain);

    // No new notification should be dispatched (we can check notification count)
    expect($alert->refresh()->status)->toBe('acknowledged');
});

// ── AlertRouter Tests ────────────────────────────────

test('AlertRouter severity determines escalation levels', function () {
    $router = app(AlertRouter::class);

    // Use reflection to test getLevelsForSeverity
    $method = new ReflectionMethod($router, 'getLevelsForSeverity');

    expect($method->invoke($router, 'critical', 3))->toBe([1, 2, 3])
        ->and($method->invoke($router, 'high', 3))->toBe([1, 2])
        ->and($method->invoke($router, 'medium', 3))->toBe([1])
        ->and($method->invoke($router, 'low', 3))->toBe([1]);
});
