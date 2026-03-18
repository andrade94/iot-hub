<?php

use App\Jobs\SyncSubscriptionMetering;
use App\Models\Subscription;
use App\Models\SubscriptionItem;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

test('adds subscription items for new active devices', function () {
    $subscription = Subscription::factory()->create([
        'org_id' => $this->org->id,
        'status' => 'active',
    ]);

    $device = createDevice($this->site, [
        'model' => 'EM300-TH',
        'status' => 'active',
    ]);

    (new SyncSubscriptionMetering)->handle();

    $this->assertDatabaseHas('subscription_items', [
        'subscription_id' => $subscription->id,
        'device_id' => $device->id,
        'sensor_model' => 'EM300-TH',
        'monthly_fee' => 150.00,
    ]);
});

test('assigns correct price per sensor model', function () {
    $subscription = Subscription::factory()->create([
        'org_id' => $this->org->id,
        'status' => 'active',
    ]);

    $deviceCo2 = createDevice($this->site, [
        'model' => 'EM500-CO2',
        'status' => 'active',
    ]);

    $deviceVs = createDevice($this->site, [
        'model' => 'VS121',
        'status' => 'active',
    ]);

    (new SyncSubscriptionMetering)->handle();

    $this->assertDatabaseHas('subscription_items', [
        'subscription_id' => $subscription->id,
        'device_id' => $deviceCo2->id,
        'monthly_fee' => 250.00,
    ]);

    $this->assertDatabaseHas('subscription_items', [
        'subscription_id' => $subscription->id,
        'device_id' => $deviceVs->id,
        'monthly_fee' => 200.00,
    ]);
});

test('removes items for inactive devices', function () {
    $subscription = Subscription::factory()->create([
        'org_id' => $this->org->id,
        'status' => 'active',
    ]);

    $device = createDevice($this->site, [
        'model' => 'EM300-TH',
        'status' => 'inactive',
    ]);

    // Manually create a subscription item for the now-inactive device
    SubscriptionItem::create([
        'subscription_id' => $subscription->id,
        'device_id' => $device->id,
        'sensor_model' => 'EM300-TH',
        'monthly_fee' => 150.00,
    ]);

    expect($subscription->items()->count())->toBe(1);

    (new SyncSubscriptionMetering)->handle();

    expect($subscription->items()->count())->toBe(0);
});

test('does not duplicate existing subscription items', function () {
    $subscription = Subscription::factory()->create([
        'org_id' => $this->org->id,
        'status' => 'active',
    ]);

    $device = createDevice($this->site, [
        'model' => 'EM300-TH',
        'status' => 'active',
    ]);

    // Pre-create the subscription item
    SubscriptionItem::create([
        'subscription_id' => $subscription->id,
        'device_id' => $device->id,
        'sensor_model' => 'EM300-TH',
        'monthly_fee' => 150.00,
    ]);

    // Run the sync job
    (new SyncSubscriptionMetering)->handle();

    // Should still be exactly 1 item — no duplicates
    expect($subscription->items()->count())->toBe(1);
});

test('handles empty subscriptions gracefully', function () {
    // No active subscriptions at all
    (new SyncSubscriptionMetering)->handle();

    expect(SubscriptionItem::count())->toBe(0);
});

test('only processes active subscriptions', function () {
    $pausedSub = Subscription::factory()->create([
        'org_id' => $this->org->id,
        'status' => 'paused',
    ]);

    createDevice($this->site, [
        'model' => 'EM300-TH',
        'status' => 'active',
    ]);

    (new SyncSubscriptionMetering)->handle();

    expect($pausedSub->items()->count())->toBe(0);
});

test('uses default fee for unknown sensor models', function () {
    $subscription = Subscription::factory()->create([
        'org_id' => $this->org->id,
        'status' => 'active',
    ]);

    $device = createDevice($this->site, [
        'model' => 'UNKNOWN-MODEL',
        'status' => 'active',
    ]);

    (new SyncSubscriptionMetering)->handle();

    $this->assertDatabaseHas('subscription_items', [
        'subscription_id' => $subscription->id,
        'device_id' => $device->id,
        'monthly_fee' => 150.00, // Default fee
    ]);
});
