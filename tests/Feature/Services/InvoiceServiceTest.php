<?php

use App\Models\BillingProfile;
use App\Models\Subscription;
use App\Services\Billing\InvoiceService;

beforeEach(function () {
    $this->org = createOrg();
    $this->profile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Profile',
        'rfc' => 'RFC123456789',
        'razon_social' => 'Corp',
    ]);
    $this->sub = Subscription::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'base_fee' => 1000.00,
        'discount_pct' => 0,
        'status' => 'active',
        'started_at' => now(),
    ]);
    $this->service = new InvoiceService;
});

test('can generate invoice with correct IVA', function () {
    $invoice = $this->service->generateInvoice($this->sub, '2026-03');

    expect((float) $invoice->subtotal)->toBe(1000.00);
    expect((float) $invoice->iva)->toBe(160.00); // 16% IVA
    expect((float) $invoice->total)->toBe(1160.00);
    expect($invoice->status)->toBe('draft');
});

test('invoice period is stored correctly', function () {
    $invoice = $this->service->generateInvoice($this->sub, '2026-03');

    expect($invoice->period)->toBe('2026-03');
});

test('invoice belongs to correct org', function () {
    $invoice = $this->service->generateInvoice($this->sub, '2026-03');

    expect($invoice->org_id)->toBe($this->org->id);
});

test('can mark invoice as paid', function () {
    $invoice = $this->service->generateInvoice($this->sub, '2026-03');
    $paid = $this->service->markPaid($invoice, 'transfer');

    expect($paid->status)->toBe('paid');
    expect($paid->payment_method)->toBe('transfer');
    expect($paid->paid_at)->not->toBeNull();
});

test('IVA calculation with discount', function () {
    $this->sub->update(['discount_pct' => 20.00]);

    $invoice = $this->service->generateInvoice($this->sub->fresh(), '2026-03');

    // 1000 * 0.8 = 800 subtotal, 800 * 0.16 = 128 IVA
    expect((float) $invoice->subtotal)->toBe(800.00);
    expect((float) $invoice->iva)->toBe(128.00);
    expect((float) $invoice->total)->toBe(928.00);
});
