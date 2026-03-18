<?php

use App\Jobs\SendAlertNotification;
use App\Jobs\SendBatchAlertSummary;
use App\Models\Alert;
use App\Models\EscalationChain;
use App\Services\Alerts\AlertRouter;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
    $this->admin = createUserWithRole('org_admin', $this->org);

    // Set up a basic escalation chain so non-batched alerts route normally
    EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [
            ['level' => 1, 'delay_minutes' => 0, 'user_ids' => [$this->admin->id], 'channels' => ['whatsapp']],
        ],
    ]);

    // Clear any Redis keys from previous tests
    Redis::del(
        "alert_batch:{$this->org->id}",
        "alert_batch_ids:{$this->org->id}",
        "alert_batch_scheduled:{$this->org->id}",
    );
});

test('alerts below threshold route normally', function () {
    Queue::fake();

    $router = new AlertRouter;

    // Send 5 alerts (threshold is >5, so these should route individually)
    for ($i = 0; $i < 5; $i++) {
        $alert = Alert::create([
            'site_id' => $this->site->id,
            'device_id' => $this->device->id,
            'severity' => 'high',
            'status' => 'active',
            'triggered_at' => now(),
        ]);

        $router->route($alert);
    }

    // Each alert should have dispatched SendAlertNotification (not batched)
    Queue::assertPushed(SendAlertNotification::class, 5);
    Queue::assertNotPushed(SendBatchAlertSummary::class);
});

test('6th alert in 10-minute window triggers batching', function () {
    Queue::fake();

    $router = new AlertRouter;

    // Send 6 alerts — first 5 route individually, 6th triggers batch
    for ($i = 0; $i < 6; $i++) {
        $alert = Alert::create([
            'site_id' => $this->site->id,
            'device_id' => $this->device->id,
            'severity' => 'high',
            'status' => 'active',
            'triggered_at' => now(),
        ]);

        $router->route($alert);
    }

    // First 5 alerts routed normally, 6th was batched
    Queue::assertPushed(SendAlertNotification::class, 5);
    Queue::assertPushed(SendBatchAlertSummary::class, 1);
});

test('batch job is dispatched with delay', function () {
    Queue::fake();

    $router = new AlertRouter;

    // Fill the counter to 5 (threshold)
    for ($i = 0; $i < 5; $i++) {
        Alert::create([
            'site_id' => $this->site->id,
            'device_id' => $this->device->id,
            'severity' => 'medium',
            'status' => 'active',
            'triggered_at' => now(),
        ]);
        Redis::incr("alert_batch:{$this->org->id}");
    }

    // Clear fake queue of anything from above, we only want to check the 6th alert dispatch
    Queue::fake();

    // 6th alert triggers batching
    $alert = Alert::create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'medium',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $router->route($alert);

    Queue::assertPushed(SendBatchAlertSummary::class, function ($job) {
        return $job->orgId === $this->org->id;
    });
});

test('Redis keys are set correctly during batching', function () {
    Queue::fake();

    // Pre-fill the counter past the threshold
    $batchKey = "alert_batch:{$this->org->id}";
    Redis::set($batchKey, 5);
    Redis::expire($batchKey, 600);

    $router = new AlertRouter;

    $alert = Alert::create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'critical',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $router->route($alert);

    // The alert ID should be in the batch set
    $setKey = "alert_batch_ids:{$this->org->id}";
    $scheduledKey = "alert_batch_scheduled:{$this->org->id}";

    expect(Redis::sismember($setKey, $alert->id))->toBeTrue();
    expect(Redis::exists($scheduledKey))->toBe(1);
});
