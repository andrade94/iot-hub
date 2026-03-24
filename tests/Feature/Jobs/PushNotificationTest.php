<?php

use App\Jobs\SendMorningSummary;
use App\Jobs\SendWorkOrderNotification;
use App\Models\PushToken;
use App\Models\Site;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\Push\PushNotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);

    $this->siteManager = createUserWithRole('client_site_manager', $this->org);
    $this->siteManager->sites()->attach($this->site->id, ['role' => 'client_site_manager', 'assigned_at' => now()]);

    $this->technician = createUserWithRole('technician', $this->org);
    $this->technician->sites()->attach($this->site->id, ['role' => 'technician', 'assigned_at' => now()]);
});

// ──────────────────────────────────────────────────────────────────────────
// SendWorkOrderNotification — assigned event
// ──────────────────────────────────────────────────────────────────────────

test('SendWorkOrderNotification sends push to assigned user on assigned event', function () {
    Http::fake([
        'exp.host/*' => Http::response(['data' => [['status' => 'ok']]], 200),
    ]);

    PushToken::create([
        'user_id' => $this->technician->id,
        'token' => 'ExponentPushToken[assigned-test-token]',
        'platform' => 'ios',
    ]);

    $wo = WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Replace battery on sensor',
        'type' => 'battery_replace',
        'priority' => 'high',
        'status' => 'assigned',
        'assigned_to' => $this->technician->id,
        'created_by' => $this->siteManager->id,
    ]);

    $job = new SendWorkOrderNotification($wo, 'assigned');
    $job->handle(app(PushNotificationService::class));

    Http::assertSent(function ($request) use ($wo) {
        $body = $request->data();

        return str_contains($request->url(), 'exp.host')
            && $body[0]['to'] === 'ExponentPushToken[assigned-test-token]'
            && str_contains($body[0]['title'], 'Assigned')
            && str_contains($body[0]['body'], 'Replace battery on sensor')
            && $body[0]['data']['event'] === 'assigned'
            && $body[0]['data']['work_order_id'] === $wo->id;
    });
});

// ──────────────────────────────────────────────────────────────────────────
// SendWorkOrderNotification — status_changed event
// ──────────────────────────────────────────────────────────────────────────

test('SendWorkOrderNotification sends push to creator on status_changed event', function () {
    Http::fake([
        'exp.host/*' => Http::response(['data' => [['status' => 'ok']]], 200),
    ]);

    PushToken::create([
        'user_id' => $this->siteManager->id,
        'token' => 'ExponentPushToken[creator-test-token]',
        'platform' => 'android',
    ]);

    $wo = WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Maintenance check',
        'type' => 'maintenance',
        'priority' => 'medium',
        'status' => 'in_progress',
        'assigned_to' => $this->technician->id,
        'created_by' => $this->siteManager->id,
    ]);

    $job = new SendWorkOrderNotification($wo, 'status_changed');
    $job->handle(app(PushNotificationService::class));

    Http::assertSent(function ($request) use ($wo) {
        $body = $request->data();

        return str_contains($request->url(), 'exp.host')
            && $body[0]['to'] === 'ExponentPushToken[creator-test-token]'
            && str_contains($body[0]['title'], 'Updated')
            && str_contains($body[0]['body'], 'in_progress')
            && $body[0]['data']['event'] === 'status_changed'
            && $body[0]['data']['work_order_id'] === $wo->id;
    });
});

// ──────────────────────────────────────────────────────────────────────────
// SendWorkOrderNotification — missing recipient
// ──────────────────────────────────────────────────────────────────────────

test('SendWorkOrderNotification handles missing recipient gracefully', function () {
    Http::fake();

    $wo = WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Orphan work order',
        'type' => 'maintenance',
        'priority' => 'low',
        'status' => 'open',
        'assigned_to' => null,
        'created_by' => $this->siteManager->id,
    ]);

    // 'assigned' event with no assigned_to user — should return early without error
    $job = new SendWorkOrderNotification($wo, 'assigned');
    $job->handle(app(PushNotificationService::class));

    Http::assertNothingSent();
});

// ──────────────────────────────────────────────────────────────────────────
// PushNotificationService — empty token list
// ──────────────────────────────────────────────────────────────────────────

test('PushNotificationService handles empty token list', function () {
    Http::fake();

    $service = app(PushNotificationService::class);

    // sendToUser with a user that has no tokens
    $userWithoutTokens = User::factory()->create(['org_id' => $this->org->id]);
    $result = $service->sendToUser($userWithoutTokens, 'Test Title', 'Test Body');

    expect($result)->toBeFalse();
    Http::assertNothingSent();

    // send() with an explicitly empty array
    $result = $service->send([], 'Test Title', 'Test Body');

    expect($result)->toBeFalse();
    Http::assertNothingSent();
});

// ──────────────────────────────────────────────────────────────────────────
// Morning summary jobs call PushNotificationService
// ──────────────────────────────────────────────────────────────────────────

test('SendMorningSummary calls PushNotificationService for matching sites', function () {
    Http::fake([
        'exp.host/*' => Http::response(['data' => [['status' => 'ok']]], 200),
    ]);

    Carbon::setTestNow(Carbon::parse('2026-03-16 14:00:00', 'UTC'));

    // Create a site_viewer user with a push token attached to the site
    $viewer = createUserWithRole('client_site_viewer', $this->org);
    $viewer->sites()->attach($this->site->id, ['role' => 'client_site_viewer', 'assigned_at' => now()]);

    PushToken::create([
        'user_id' => $viewer->id,
        'token' => 'ExponentPushToken[morning-summary-token]',
        'platform' => 'ios',
    ]);

    // Update the site to match the current UTC time as opening time in its timezone
    // UTC 14:00 = America/Mexico_City 08:00
    $this->site->update([
        'timezone' => 'America/Mexico_City',
        'opening_hour' => Carbon::parse('08:00'),
    ]);

    (new SendMorningSummary)->handle(app(\App\Services\Reports\MorningSummaryService::class));

    Http::assertSent(function ($request) {
        $body = $request->data();

        return str_contains($request->url(), 'exp.host')
            && $body[0]['to'] === 'ExponentPushToken[morning-summary-token]'
            && str_contains($body[0]['title'], 'Good morning')
            && $body[0]['data']['type'] === 'morning_summary';
    });

    Carbon::setTestNow();
});
