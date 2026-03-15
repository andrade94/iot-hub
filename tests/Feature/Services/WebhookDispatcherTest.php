<?php

use App\Models\WebhookSubscription;
use App\Services\Api\WebhookDispatcher;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->org = createOrg();
    $this->dispatcher = new WebhookDispatcher;
});

test('dispatches to matching active subscription', function () {
    Http::fake(['*' => Http::response([], 200)]);

    WebhookSubscription::create([
        'org_id' => $this->org->id,
        'url' => 'https://example.com/webhook',
        'secret' => 'test-secret',
        'events' => ['alert.created'],
        'active' => true,
    ]);

    $count = $this->dispatcher->dispatch('alert.created', ['alert_id' => 1], $this->org->id);

    expect($count)->toBe(1);
    Http::assertSentCount(1);
});

test('skips inactive subscriptions', function () {
    Http::fake();

    WebhookSubscription::create([
        'org_id' => $this->org->id,
        'url' => 'https://example.com/webhook',
        'secret' => 'test-secret',
        'events' => ['alert.created'],
        'active' => false,
    ]);

    $count = $this->dispatcher->dispatch('alert.created', ['alert_id' => 1], $this->org->id);

    expect($count)->toBe(0);
    Http::assertSentCount(0);
});

test('skips subscriptions not matching event', function () {
    Http::fake();

    WebhookSubscription::create([
        'org_id' => $this->org->id,
        'url' => 'https://example.com/webhook',
        'secret' => 'test-secret',
        'events' => ['reading.threshold'],
        'active' => true,
    ]);

    $count = $this->dispatcher->dispatch('alert.created', ['alert_id' => 1], $this->org->id);

    expect($count)->toBe(0);
});

test('sends HMAC signature header', function () {
    Http::fake(['*' => Http::response([], 200)]);

    $sub = WebhookSubscription::create([
        'org_id' => $this->org->id,
        'url' => 'https://example.com/webhook',
        'secret' => 'my-secret',
        'events' => ['alert.created'],
        'active' => true,
    ]);

    $this->dispatcher->dispatch('alert.created', ['test' => true], $this->org->id);

    Http::assertSent(function ($request) {
        return $request->hasHeader('X-Webhook-Signature')
            && $request->hasHeader('X-Webhook-Event');
    });
});

test('increments failure count on error', function () {
    Http::fake(['*' => Http::response('Error', 500)]);

    $sub = WebhookSubscription::create([
        'org_id' => $this->org->id,
        'url' => 'https://example.com/webhook',
        'secret' => 'test-secret',
        'events' => ['alert.created'],
        'active' => true,
        'failure_count' => 0,
    ]);

    $this->dispatcher->dispatch('alert.created', ['test' => true], $this->org->id);

    expect($sub->fresh()->failure_count)->toBe(1);
});

test('deactivates subscription after 10 failures', function () {
    Http::fake(['*' => Http::response('Error', 500)]);

    $sub = WebhookSubscription::create([
        'org_id' => $this->org->id,
        'url' => 'https://example.com/webhook',
        'secret' => 'test-secret',
        'events' => ['alert.created'],
        'active' => true,
        'failure_count' => 9, // Next failure = 10 → deactivate
    ]);

    $this->dispatcher->dispatch('alert.created', ['test' => true], $this->org->id);

    expect($sub->fresh()->active)->toBeFalse();
    expect($sub->fresh()->failure_count)->toBe(10);
});
