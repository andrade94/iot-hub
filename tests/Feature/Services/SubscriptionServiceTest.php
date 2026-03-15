<?php

use App\Models\BillingProfile;
use App\Models\SubscriptionItem;
use App\Services\Billing\SubscriptionService;

beforeEach(function () {
    $this->org = createOrg();
    $this->profile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Test Profile',
        'rfc' => 'ABC123456789',
        'razon_social' => 'Test Corp',
    ]);
    $this->service = new SubscriptionService;
});

test('can create a subscription', function () {
    $sub = $this->service->createSubscription($this->org, $this->profile);

    expect($sub->org_id)->toBe($this->org->id);
    expect($sub->status)->toBe('active');
    expect((float) $sub->base_fee)->toBe(500.00);
});

test('can add device to subscription with correct pricing', function () {
    $sub = $this->service->createSubscription($this->org, $this->profile);
    $site = createSite($this->org);
    $device = createDevice($site, ['model' => 'EM300-TH']);

    $item = $this->service->addDevice($sub, $device);

    expect((float) $item->monthly_fee)->toBe(150.00);
    expect($item->sensor_model)->toBe('EM300-TH');
});

test('unknown sensor model uses default pricing', function () {
    $sub = $this->service->createSubscription($this->org, $this->profile);
    $site = createSite($this->org);
    $device = createDevice($site, ['model' => 'UNKNOWN-MODEL']);

    $item = $this->service->addDevice($sub, $device);

    expect((float) $item->monthly_fee)->toBe(100.00); // Default
});

test('sensor pricing map returns expected models', function () {
    $pricing = $this->service->getSensorPricing();

    expect($pricing)->toHaveKey('EM300-TH');
    expect($pricing)->toHaveKey('CT101');
    expect($pricing)->toHaveKey('WS301');
    expect($pricing['CT101'])->toBe(200.00);
});

test('monthly total includes base fee and device fees', function () {
    $sub = $this->service->createSubscription($this->org, $this->profile);
    $site = createSite($this->org);

    $this->service->addDevice($sub, createDevice($site, ['model' => 'EM300-TH']));
    $this->service->addDevice($sub, createDevice($site, ['model' => 'CT101']));

    $total = $sub->calculateMonthlyTotal();

    // 500 (base) + 150 (EM300-TH) + 200 (CT101) = 850
    expect($total)->toBe(850.00);
});

test('discount reduces base fee', function () {
    $sub = $this->service->createSubscription($this->org, $this->profile);
    $sub->update(['discount_pct' => 10.00]);

    $site = createSite($this->org);
    $this->service->addDevice($sub, createDevice($site, ['model' => 'WS301']));

    $total = $sub->fresh()->calculateMonthlyTotal();

    // 500 * 0.9 (10% discount) + 100 (WS301) = 550
    expect($total)->toBe(550.00);
});
