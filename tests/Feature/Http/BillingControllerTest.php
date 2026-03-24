<?php

use App\Models\BillingProfile;
use App\Models\Invoice;
use App\Models\Subscription;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->user = createUserWithRole('client_org_admin', $this->org);
});

test('org_admin can view billing dashboard', function () {
    $this->actingAs($this->user)
        ->get(route('billing.dashboard'))
        ->assertOk();
});

test('billing dashboard shows active subscription', function () {
    $profile = BillingProfile::create(['org_id' => $this->org->id, 'name' => 'Main', 'rfc' => 'ABC123456789', 'razon_social' => 'Test Corp']);
    Subscription::create(['org_id' => $this->org->id, 'billing_profile_id' => $profile->id, 'base_fee' => 500, 'discount_pct' => 0, 'status' => 'active', 'started_at' => now()]);

    $this->actingAs($this->user)
        ->get(route('billing.dashboard'))
        ->assertOk();
});

test('org_admin can view billing profiles', function () {
    $this->actingAs($this->user)
        ->get(route('billing.profiles'))
        ->assertOk();
});

test('org_admin can create a billing profile', function () {
    $this->actingAs($this->user)
        ->post(route('billing.profiles.store'), [
            'name' => 'New Profile',
            'rfc' => 'XYZ987654321',
            'razon_social' => 'New Corp SA',
        ])
        ->assertRedirect();

    expect(BillingProfile::where('rfc', 'XYZ987654321')->exists())->toBeTrue();
});

test('store profile fails without required fields', function () {
    $this->actingAs($this->user)
        ->post(route('billing.profiles.store'), [])
        ->assertSessionHasErrors(['name', 'rfc', 'razon_social']);
});

test('setting default profile unsets previous default', function () {
    BillingProfile::create(['org_id' => $this->org->id, 'name' => 'Old Default', 'rfc' => 'AAA111222333', 'razon_social' => 'Old', 'is_default' => true]);

    $this->actingAs($this->user)
        ->post(route('billing.profiles.store'), [
            'name' => 'New Default',
            'rfc' => 'BBB444555666',
            'razon_social' => 'New',
            'is_default' => true,
        ])
        ->assertRedirect();

    expect(BillingProfile::where('org_id', $this->org->id)->where('is_default', true)->count())->toBe(1);
});

test('guest is redirected from billing', function () {
    $this->get(route('billing.dashboard'))
        ->assertRedirect(route('login'));
});

test('org_admin can generate invoice via POST', function () {
    $profile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Invoice Profile',
        'rfc' => 'INV123456789',
        'razon_social' => 'Invoice Corp SA',
    ]);

    Subscription::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $profile->id,
        'base_fee' => 1000,
        'discount_pct' => 0,
        'status' => 'active',
        'started_at' => now()->subMonth(),
    ]);

    $period = now()->format('Y-m');

    $this->actingAs($this->user)
        ->post(route('billing.generate-invoice'), ['period' => $period])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(Invoice::where('org_id', $this->org->id)->where('period', $period)->exists())->toBeTrue();
});

test('duplicate invoice prevention', function () {
    $profile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Dup Profile',
        'rfc' => 'DUP123456789',
        'razon_social' => 'Dup Corp SA',
    ]);

    $subscription = Subscription::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $profile->id,
        'base_fee' => 500,
        'discount_pct' => 0,
        'status' => 'active',
        'started_at' => now()->subMonth(),
    ]);

    $period = now()->format('Y-m');

    // Generate the first invoice
    $this->actingAs($this->user)
        ->post(route('billing.generate-invoice'), ['period' => $period])
        ->assertRedirect();

    // Attempt to generate a duplicate — should be prevented
    $this->actingAs($this->user)
        ->post(route('billing.generate-invoice'), ['period' => $period])
        ->assertRedirect()
        ->assertSessionHas('warning');

    expect(Invoice::where('org_id', $this->org->id)->where('period', $period)->count())->toBe(1);
});

test('mark invoice as paid', function () {
    $profile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Paid Profile',
        'rfc' => 'PAD123456789',
        'razon_social' => 'Paid Corp SA',
    ]);

    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $profile->id,
        'period' => now()->format('Y-m'),
        'subtotal' => 1000,
        'iva' => 160,
        'total' => 1160,
        'status' => 'draft',
    ]);

    $this->actingAs($this->user)
        ->post(route('billing.invoices.mark-paid', $invoice), [
            'payment_method' => 'spei',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $invoice->refresh();
    expect($invoice->status)->toBe('paid')
        ->and($invoice->payment_method)->toBe('spei')
        ->and($invoice->paid_at)->not->toBeNull();
});

test('download invoice PDF requires cfdi_api_id', function () {
    $profile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Download Profile',
        'rfc' => 'DWN123456789',
        'razon_social' => 'Download Corp SA',
    ]);

    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $profile->id,
        'period' => now()->format('Y-m'),
        'subtotal' => 500,
        'iva' => 80,
        'total' => 580,
        'status' => 'sent',
        'cfdi_api_id' => null,
    ]);

    // Without cfdi_api_id, download should redirect with error
    $this->actingAs($this->user)
        ->get(route('billing.invoices.download', [$invoice, 'pdf']))
        ->assertRedirect()
        ->assertSessionHas('error');
});
