<?php

use App\Events\AlertTriggered;
use App\Jobs\EscalateAlert;
use App\Jobs\SendAlertNotification;
use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\EscalationChain;
use App\Models\User;
use App\Services\Alerts\AlertRouter;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
    $this->router = new AlertRouter;

    // Clear Redis alert batch counters to prevent cross-test interference
    try {
        \Illuminate\Support\Facades\Redis::del("alert_batch:{$this->org->id}");
        \Illuminate\Support\Facades\Redis::del("alert_batch_ids:{$this->org->id}");
        \Illuminate\Support\Facades\Redis::del("alert_batch_scheduled:{$this->org->id}");
    } catch (\Exception $e) {
        // Redis unavailable — no cleanup needed
    }

    $this->rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);
});

test('routes alert to level 1 chain immediately', function () {
    Queue::fake();
    Event::fake();

    $user = User::factory()->create(['org_id' => $this->org->id]);
    EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [
            ['level' => 1, 'delay_minutes' => 0, 'user_ids' => [$user->id], 'channels' => ['push']],
        ],
    ]);

    $alert = Alert::create([
        'rule_id' => $this->rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'medium',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->router->route($alert);

    Queue::assertPushed(SendAlertNotification::class);
});

test('critical alert triggers up to level 3', function () {
    Queue::fake();
    Event::fake();

    $user1 = User::factory()->create(['org_id' => $this->org->id]);
    $user2 = User::factory()->create(['org_id' => $this->org->id]);
    EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [
            ['level' => 1, 'delay_minutes' => 0, 'user_ids' => [$user1->id], 'channels' => ['push']],
            ['level' => 2, 'delay_minutes' => 5, 'user_ids' => [$user2->id], 'channels' => ['whatsapp']],
        ],
    ]);

    $alert = Alert::create([
        'rule_id' => $this->rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'critical',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->router->route($alert);

    Queue::assertPushed(SendAlertNotification::class);
    Queue::assertPushed(EscalateAlert::class);
});

test('broadcasts alert via Reverb', function () {
    Event::fake();
    Queue::fake();

    $user = User::factory()->create(['org_id' => $this->org->id]);
    EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [
            ['level' => 1, 'delay_minutes' => 0, 'user_ids' => [$user->id], 'channels' => ['push']],
        ],
    ]);

    $alert = Alert::create([
        'rule_id' => $this->rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->router->route($alert);

    Event::assertDispatched(AlertTriggered::class);
});

test('broadcasts as fallback when no escalation chain', function () {
    Event::fake();

    $alert = Alert::create([
        'rule_id' => $this->rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->router->route($alert);

    Event::assertDispatched(AlertTriggered::class);
});

test('low severity only triggers level 1', function () {
    Queue::fake();
    Event::fake();

    $user1 = User::factory()->create(['org_id' => $this->org->id]);
    $user2 = User::factory()->create(['org_id' => $this->org->id]);
    EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [
            ['level' => 1, 'delay_minutes' => 0, 'user_ids' => [$user1->id], 'channels' => ['push']],
            ['level' => 2, 'delay_minutes' => 5, 'user_ids' => [$user2->id], 'channels' => ['whatsapp']],
        ],
    ]);

    $alert = Alert::create([
        'rule_id' => $this->rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'low',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->router->route($alert);

    Queue::assertPushed(SendAlertNotification::class);
    Queue::assertNotPushed(EscalateAlert::class);
});

test('high severity triggers levels 1 and 2', function () {
    Queue::fake();
    Event::fake();

    $user1 = User::factory()->create(['org_id' => $this->org->id]);
    $user2 = User::factory()->create(['org_id' => $this->org->id]);
    $user3 = User::factory()->create(['org_id' => $this->org->id]);
    EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Multi-Level Chain',
        'levels' => [
            ['level' => 1, 'delay_minutes' => 0, 'user_ids' => [$user1->id], 'channels' => ['push']],
            ['level' => 2, 'delay_minutes' => 5, 'user_ids' => [$user2->id], 'channels' => ['whatsapp']],
            ['level' => 3, 'delay_minutes' => 15, 'user_ids' => [$user3->id], 'channels' => ['email']],
        ],
    ]);

    $alert = Alert::create([
        'rule_id' => $this->rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->router->route($alert);

    // Level 1: SendAlertNotification, Level 2: EscalateAlert, Level 3: skipped (high only goes to 2)
    Queue::assertPushed(SendAlertNotification::class, 1);
    Queue::assertPushed(EscalateAlert::class, 1);
});
