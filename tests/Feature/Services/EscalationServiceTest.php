<?php

use App\Jobs\SendAlertNotification;
use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\EscalationChain;
use App\Models\User;
use App\Services\Alerts\EscalationService;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
    $this->service = new EscalationService;

    $this->rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Rule',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);
});

test('escalates active alert', function () {
    Queue::fake();

    $user = User::factory()->create(['org_id' => $this->org->id]);
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);
    $chain = EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [
            ['level' => 1, 'delay_minutes' => 0, 'user_ids' => [$user->id], 'channels' => ['push']],
            ['level' => 2, 'delay_minutes' => 5, 'user_ids' => [$user->id], 'channels' => ['whatsapp']],
        ],
    ]);

    $this->service->escalate($alert, $chain, 2);

    Queue::assertPushed(SendAlertNotification::class);
});

test('skips acknowledged alert', function () {
    Queue::fake();

    $user = User::factory()->create(['org_id' => $this->org->id]);
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'acknowledged', 'triggered_at' => now()]);
    $chain = EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [
            ['level' => 2, 'delay_minutes' => 5, 'user_ids' => [$user->id], 'channels' => ['whatsapp']],
        ],
    ]);

    $this->service->escalate($alert, $chain, 2);

    Queue::assertNotPushed(SendAlertNotification::class);
});

test('skips resolved alert', function () {
    Queue::fake();

    $user = User::factory()->create(['org_id' => $this->org->id]);
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'resolved', 'triggered_at' => now()]);
    $chain = EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [
            ['level' => 2, 'delay_minutes' => 5, 'user_ids' => [$user->id], 'channels' => ['whatsapp']],
        ],
    ]);

    $this->service->escalate($alert, $chain, 2);

    Queue::assertNotPushed(SendAlertNotification::class);
});

test('skips dismissed alert', function () {
    Queue::fake();

    $user = User::factory()->create(['org_id' => $this->org->id]);
    $alert = Alert::create(['rule_id' => $this->rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'dismissed', 'triggered_at' => now()]);
    $chain = EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [
            ['level' => 2, 'delay_minutes' => 5, 'user_ids' => [$user->id], 'channels' => ['whatsapp']],
        ],
    ]);

    $this->service->escalate($alert, $chain, 2);

    Queue::assertNotPushed(SendAlertNotification::class);
});
