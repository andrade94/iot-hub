<?php

use App\Models\BillingProfile;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Services\Billing\InvoiceService;

beforeEach(function () {
    $this->org = createOrg();
    $this->profile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Main Profile',
        'rfc' => 'ABC123456789',
        'razon_social' => 'Test Corp SA',
    ]);
});

test('command runs with no active subscriptions', function () {
    $this->artisan('billing:generate-invoices')
        ->expectsOutput('No active subscriptions found.')
        ->assertSuccessful();
});

test('command generates invoice for active subscription', function () {
    $subscription = Subscription::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'base_fee' => 1000,
        'discount_pct' => 0,
        'status' => 'active',
        'started_at' => now()->subMonth(),
    ]);

    $period = now()->format('Y-m');

    $this->artisan('billing:generate-invoices', ['--period' => $period])
        ->assertSuccessful();

    expect(Invoice::where('org_id', $this->org->id)->where('period', $period)->exists())->toBeTrue();
});

test('command skips already-invoiced period', function () {
    $subscription = Subscription::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'base_fee' => 500,
        'discount_pct' => 0,
        'status' => 'active',
        'started_at' => now()->subMonth(),
    ]);

    $period = now()->format('Y-m');

    // Pre-create an invoice for this period via the billing profile
    Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'period' => $period,
        'subtotal' => 500,
        'iva' => 80,
        'total' => 580,
        'status' => 'draft',
    ]);

    $this->artisan('billing:generate-invoices', ['--period' => $period])
        ->assertSuccessful();

    // Only the original invoice should exist — no duplicate
    expect(Invoice::where('org_id', $this->org->id)->where('period', $period)->count())->toBe(1);
});

test('dry-run mode shows what would be generated without creating', function () {
    Subscription::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'base_fee' => 750,
        'discount_pct' => 0,
        'status' => 'active',
        'started_at' => now()->subMonth(),
    ]);

    $period = now()->format('Y-m');

    $this->artisan('billing:generate-invoices', ['--period' => $period, '--dry-run' => true])
        ->expectsOutput('DRY RUN — no invoices will be created.')
        ->assertSuccessful();

    // No invoice should be created in dry-run mode
    expect(Invoice::where('org_id', $this->org->id)->where('period', $period)->exists())->toBeFalse();
});

test('--org flag filters to specific org', function () {
    $otherOrg = createOrg(['name' => 'Other Org']);
    $otherProfile = BillingProfile::create([
        'org_id' => $otherOrg->id,
        'name' => 'Other Profile',
        'rfc' => 'XYZ987654321',
        'razon_social' => 'Other Corp SA',
    ]);

    Subscription::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'base_fee' => 500,
        'discount_pct' => 0,
        'status' => 'active',
        'started_at' => now()->subMonth(),
    ]);

    Subscription::create([
        'org_id' => $otherOrg->id,
        'billing_profile_id' => $otherProfile->id,
        'base_fee' => 800,
        'discount_pct' => 0,
        'status' => 'active',
        'started_at' => now()->subMonth(),
    ]);

    $period = now()->format('Y-m');

    $this->artisan('billing:generate-invoices', ['--period' => $period, '--org' => $this->org->id])
        ->assertSuccessful();

    // Only the targeted org should have an invoice
    expect(Invoice::where('org_id', $this->org->id)->where('period', $period)->exists())->toBeTrue();
    expect(Invoice::where('org_id', $otherOrg->id)->where('period', $period)->exists())->toBeFalse();
});
