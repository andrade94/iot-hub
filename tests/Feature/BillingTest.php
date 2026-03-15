<?php

use App\Models\BillingProfile;
use App\Models\Device;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Site;
use App\Models\Subscription;
use App\Models\SubscriptionItem;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'Billing Test Org', 'slug' => 'billing-test-org', 'segment' => 'cold_chain',
    ]);
    $this->site = Site::create([
        'org_id' => $this->org->id, 'name' => 'Billing Site', 'status' => 'active',
    ]);
});

test('billing profile can be created', function () {
    $profile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Main Profile',
        'rfc' => 'XAXX010101000',
        'razon_social' => 'Test Company SA de CV',
        'regimen_fiscal' => '601',
        'is_default' => true,
    ]);

    expect($profile->rfc)->toBe('XAXX010101000')
        ->and($profile->is_default)->toBeTrue()
        ->and($profile->organization->id)->toBe($this->org->id);
});

test('subscription can be created with items', function () {
    $profile = BillingProfile::create([
        'org_id' => $this->org->id, 'name' => 'Profile', 'rfc' => 'TEST010101',
        'razon_social' => 'Test', 'is_default' => true,
    ]);

    $sub = Subscription::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $profile->id,
        'base_fee' => 500,
        'discount_pct' => 10,
        'status' => 'active',
        'started_at' => now(),
        'contract_type' => 'monthly',
    ]);

    $device = Device::create([
        'site_id' => $this->site->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFEB00001', 'name' => 'Billed Sensor', 'status' => 'active',
    ]);

    SubscriptionItem::create([
        'subscription_id' => $sub->id,
        'device_id' => $device->id,
        'sensor_model' => 'EM300-TH',
        'monthly_fee' => 150,
    ]);

    $sub->load('items');
    expect($sub->items)->toHaveCount(1)
        ->and((float) $sub->items->first()->monthly_fee)->toBe(150.00);

    // Calculate monthly total: 500 * (1 - 10/100) + 150 = 450 + 150 = 600
    $total = $sub->calculateMonthlyTotal();
    expect($total)->toBe(600.00);
});

test('invoice can be created', function () {
    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'period' => '2026-03',
        'subtotal' => 600,
        'iva' => 96,
        'total' => 696,
        'status' => 'draft',
    ]);

    expect((float) $invoice->total)->toBe(696.00)
        ->and($invoice->status)->toBe('draft');
});

test('invoice scopes work', function () {
    Invoice::create([
        'org_id' => $this->org->id, 'period' => '2026-01',
        'subtotal' => 500, 'iva' => 80, 'total' => 580, 'status' => 'draft',
    ]);
    Invoice::create([
        'org_id' => $this->org->id, 'period' => '2026-02',
        'subtotal' => 500, 'iva' => 80, 'total' => 580, 'status' => 'paid',
        'paid_at' => now(),
    ]);

    expect(Invoice::draft()->count())->toBe(1)
        ->and(Invoice::forOrg($this->org->id)->count())->toBe(2);
});
