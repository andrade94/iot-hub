<?php

use App\Models\BillingProfile;
use App\Models\Invoice;
use App\Services\Billing\FacturapiService;

beforeEach(function () {
    $this->org = createOrg();
    $this->profile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Profile',
        'rfc' => 'RFC123456789',
        'razon_social' => 'Corp',
    ]);
    $this->service = new FacturapiService;
});

test('createCfdi generates UUID and updates invoice', function () {
    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'period' => '2026-03',
        'subtotal' => 1000,
        'iva' => 160,
        'total' => 1160,
        'status' => 'draft',
    ]);

    $uuid = $this->service->createCfdi($invoice);

    expect($uuid)->toBeString();
    expect(strlen($uuid))->toBe(36); // UUID format
    expect($invoice->fresh()->cfdi_uuid)->toBe($uuid);
    expect($invoice->fresh()->status)->toBe('sent');
});

test('downloadPdf returns null (placeholder)', function () {
    $result = $this->service->downloadPdf('test-uuid');

    expect($result)->toBeNull();
});

test('downloadXml returns null (placeholder)', function () {
    $result = $this->service->downloadXml('test-uuid');

    expect($result)->toBeNull();
});
