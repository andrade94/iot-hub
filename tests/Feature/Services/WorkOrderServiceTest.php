<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Services\WorkOrders\WorkOrderService;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
    $this->service = new WorkOrderService;
});

test('can create work order from alert', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'High temp',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $wo = $this->service->createFromAlert($alert, 'maintenance', 'high');

    expect($wo->alert_id)->toBe($alert->id);
    expect($wo->site_id)->toBe($this->site->id);
    expect($wo->device_id)->toBe($this->device->id);
    expect($wo->type)->toBe('maintenance');
});

test('can create work order from trigger', function () {
    $wo = $this->service->createFromTrigger($this->device, 'battery_replace', 'medium', 'Low battery');

    expect($wo->device_id)->toBe($this->device->id);
    expect($wo->title)->toBe('Low battery');
    expect($wo->type)->toBe('battery_replace');
});

test('complete auto-resolves linked alert', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Rule',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $wo = $this->service->createFromAlert($alert, 'maintenance', 'high');
    $wo->assign(1);
    $wo->start();

    $user = \App\Models\User::factory()->create(['org_id' => $this->org->id]);
    $this->service->complete($wo, $user->id);

    expect($wo->fresh()->status)->toBe('completed');
    expect($alert->fresh()->status)->toBe('resolved');
});

test('complete without alert works fine', function () {
    $wo = $this->service->createFromTrigger($this->device, 'maintenance', 'low', 'Routine check');
    $wo->assign(1);
    $wo->start();

    $user = \App\Models\User::factory()->create(['org_id' => $this->org->id]);
    $this->service->complete($wo, $user->id);

    expect($wo->fresh()->status)->toBe('completed');
});

test('work order title is generated from alert details', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Freezer Alert',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => -15, 'duration_minutes' => 5, 'severity' => 'critical']],
        'severity' => 'critical',
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'critical',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $wo = $this->service->createFromAlert($alert, 'maintenance', 'high');

    expect($wo->title)->toContain('Freezer Alert');
});
