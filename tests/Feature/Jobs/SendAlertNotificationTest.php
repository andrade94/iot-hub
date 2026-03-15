<?php

use App\Jobs\SendAlertNotification;
use App\Models\Alert;
use App\Models\AlertNotification;
use App\Models\AlertRule;
use App\Models\User;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
    $this->rule = AlertRule::create(['site_id' => $this->site->id, 'name' => 'Rule', 'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']], 'severity' => 'high']);
});

test('creates AlertNotification record on push', function () {
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);
    $user = User::factory()->create(['org_id' => $this->org->id]);

    (new SendAlertNotification($alert, $user->id, 'push'))->handle();

    expect(AlertNotification::where('alert_id', $alert->id)->where('user_id', $user->id)->exists())->toBeTrue();
    expect(AlertNotification::first()->channel)->toBe('push');
});

test('skips sending if alert is resolved', function () {
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'resolved', 'triggered_at' => now()]);
    $user = User::factory()->create(['org_id' => $this->org->id]);

    (new SendAlertNotification($alert, $user->id, 'push'))->handle();

    expect(AlertNotification::count())->toBe(0);
});

test('skips sending if alert is dismissed', function () {
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'dismissed', 'triggered_at' => now()]);
    $user = User::factory()->create(['org_id' => $this->org->id]);

    (new SendAlertNotification($alert, $user->id, 'push'))->handle();

    expect(AlertNotification::count())->toBe(0);
});

test('skips if user not found', function () {
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);

    (new SendAlertNotification($alert, 99999, 'push'))->handle();

    expect(AlertNotification::count())->toBe(0);
});

test('job has correct retry config', function () {
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);

    $job = new SendAlertNotification($alert, 1, 'push');

    expect($job->tries)->toBe(3);
    expect($job->backoff)->toBe(30);
});
