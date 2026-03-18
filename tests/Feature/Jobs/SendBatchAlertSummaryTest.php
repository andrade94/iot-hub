<?php

use App\Jobs\SendBatchAlertSummary;
use App\Models\Alert;
use App\Services\WhatsApp\TwilioService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
});

test('job sends WhatsApp summary when batch alerts exist', function () {
    // Configure Twilio credentials for this test
    config([
        'services.twilio.account_sid' => 'ACtest',
        'services.twilio.auth_token' => 'test-token',
        'services.twilio.whatsapp_from' => '+14155238886',
    ]);

    $admin = createUserWithRole('org_admin', $this->org);
    $admin->update(['whatsapp_phone' => '+5215512345678']);

    // Create alerts
    $alerts = collect();
    for ($i = 0; $i < 3; $i++) {
        $alerts->push(Alert::create([
            'site_id' => $this->site->id,
            'device_id' => $this->device->id,
            'severity' => 'critical',
            'status' => 'active',
            'triggered_at' => now(),
        ]));
    }

    // Populate Redis batch set with alert IDs
    $setKey = "alert_batch_ids:{$this->org->id}";
    foreach ($alerts as $alert) {
        Redis::sadd($setKey, $alert->id);
    }
    Redis::expire($setKey, 660);

    // Mock Twilio HTTP calls
    Http::fake([
        'api.twilio.com/*' => Http::response(['sid' => 'SM123'], 200),
    ]);

    $job = new SendBatchAlertSummary($this->org->id);
    $job->handle();

    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'api.twilio.com')
            && str_contains($request->body(), '3+alerts');
    });
});

test('job clears Redis keys after processing', function () {
    $admin = createUserWithRole('org_admin', $this->org);
    $admin->update(['whatsapp_phone' => '+5215512345678']);

    $alert = Alert::create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $setKey = "alert_batch_ids:{$this->org->id}";
    $batchKey = "alert_batch:{$this->org->id}";
    $scheduledKey = "alert_batch_scheduled:{$this->org->id}";

    Redis::sadd($setKey, $alert->id);
    Redis::set($batchKey, 1);
    Redis::set($scheduledKey, 1);

    Http::fake([
        'api.twilio.com/*' => Http::response(['sid' => 'SM456'], 200),
    ]);

    $job = new SendBatchAlertSummary($this->org->id);
    $job->handle();

    // All batch keys should be cleaned up
    expect(Redis::exists($setKey))->toBe(0);
    expect(Redis::exists($batchKey))->toBe(0);
    expect(Redis::exists($scheduledKey))->toBe(0);
});

test('job handles empty batch gracefully', function () {
    Http::fake();

    $job = new SendBatchAlertSummary($this->org->id);
    $job->handle();

    // No HTTP requests should be sent
    Http::assertNothingSent();

    // Redis keys should still be cleaned up
    $setKey = "alert_batch_ids:{$this->org->id}";
    expect(Redis::exists($setKey))->toBe(0);
});
