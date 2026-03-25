<?php

// Covers: WF-BILLING — Cancel invoice, CdP generation, profile CRUD

use App\Models\BillingProfile;
use App\Models\Invoice;
use App\Models\Subscription;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->user = createUserWithRole('client_org_admin', $this->org);

    $this->profile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Test Profile',
        'rfc' => 'TST123456789',
        'razon_social' => 'Test Corp SA',
        'is_default' => true,
    ]);
});

// ── Cancel Invoice ─────────────────────────────────────────────

test('cancel invoice changes status to cancelled for sent invoice', function () {
    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'period' => '2026-03',
        'subtotal' => 1000,
        'iva' => 160,
        'total' => 1160,
        'status' => 'sent',
    ]);

    $this->actingAs($this->user)
        ->post(route('billing.invoices.cancel', $invoice))
        ->assertRedirect()
        ->assertSessionHas('success');

    $invoice->refresh();
    expect($invoice->status)->toBe('cancelled');
});

test('cancel invoice works for overdue invoices', function () {
    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'period' => '2026-02',
        'subtotal' => 500,
        'iva' => 80,
        'total' => 580,
        'status' => 'overdue',
    ]);

    $this->actingAs($this->user)
        ->post(route('billing.invoices.cancel', $invoice))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($invoice->fresh()->status)->toBe('cancelled');
});

test('cancel invoice fails for already paid invoices', function () {
    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'period' => '2026-01',
        'subtotal' => 1000,
        'iva' => 160,
        'total' => 1160,
        'status' => 'paid',
        'paid_at' => now(),
        'payment_method' => 'spei',
    ]);

    $this->actingAs($this->user)
        ->post(route('billing.invoices.cancel', $invoice))
        ->assertRedirect()
        ->assertSessionHas('error');

    expect($invoice->fresh()->status)->toBe('paid');
});

test('cancel invoice fails for already cancelled invoices', function () {
    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'period' => '2026-01',
        'subtotal' => 500,
        'iva' => 80,
        'total' => 580,
        'status' => 'cancelled',
    ]);

    $this->actingAs($this->user)
        ->post(route('billing.invoices.cancel', $invoice))
        ->assertRedirect()
        ->assertSessionHas('error');
});

// ── Generate Complemento de Pago (CdP) ────────────────────────

test('generate CdP returns success for paid invoices', function () {
    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'period' => '2026-03',
        'subtotal' => 1000,
        'iva' => 160,
        'total' => 1160,
        'status' => 'paid',
        'paid_at' => now(),
        'payment_method' => 'spei',
    ]);

    $this->actingAs($this->user)
        ->post(route('billing.invoices.cdp', $invoice))
        ->assertRedirect()
        ->assertSessionHas('success');
});

test('generate CdP fails for unpaid invoices', function () {
    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'period' => '2026-03',
        'subtotal' => 1000,
        'iva' => 160,
        'total' => 1160,
        'status' => 'sent',
    ]);

    $this->actingAs($this->user)
        ->post(route('billing.invoices.cdp', $invoice))
        ->assertRedirect()
        ->assertSessionHas('error');
});

// ── Update Billing Profile ─────────────────────────────────────

test('update billing profile works', function () {
    $this->actingAs($this->user)
        ->put(route('billing.profiles.update', $this->profile), [
            'name' => 'Updated Profile',
            'rfc' => 'UPD987654321',
            'razon_social' => 'Updated Corp SA',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->profile->refresh();
    expect($this->profile->name)->toBe('Updated Profile')
        ->and($this->profile->rfc)->toBe('UPD987654321')
        ->and($this->profile->razon_social)->toBe('Updated Corp SA');
});

test('update profile from different org is forbidden', function () {
    $otherOrg = createOrg(['name' => 'Other Org']);
    $otherUser = createUserWithRole('client_org_admin', $otherOrg);

    $this->actingAs($otherUser)
        ->put(route('billing.profiles.update', $this->profile), [
            'name' => 'Hacked',
            'rfc' => 'HAK000000000',
            'razon_social' => 'Hacked Corp',
        ])
        ->assertForbidden();
});

// ── Delete Billing Profile ─────────────────────────────────────

test('delete billing profile works when not the last one', function () {
    // Create a second profile so deletion is allowed
    $secondProfile = BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Second Profile',
        'rfc' => 'SEC123456789',
        'razon_social' => 'Second Corp SA',
    ]);

    $this->actingAs($this->user)
        ->delete(route('billing.profiles.destroy', $secondProfile))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(BillingProfile::find($secondProfile->id))->toBeNull();
});

test('delete the last billing profile is prevented', function () {
    // Only one profile exists (from beforeEach)
    $this->actingAs($this->user)
        ->delete(route('billing.profiles.destroy', $this->profile))
        ->assertRedirect()
        ->assertSessionHas('error');

    expect(BillingProfile::find($this->profile->id))->not->toBeNull();
});

test('delete profile from different org is forbidden', function () {
    $otherOrg = createOrg(['name' => 'Other Org']);
    $otherUser = createUserWithRole('client_org_admin', $otherOrg);

    $this->actingAs($otherUser)
        ->delete(route('billing.profiles.destroy', $this->profile))
        ->assertForbidden();
});

test('delete profile linked to active subscription is prevented', function () {
    // Create a second profile so "last profile" guard doesn't trigger
    BillingProfile::create([
        'org_id' => $this->org->id,
        'name' => 'Backup Profile',
        'rfc' => 'BAK123456789',
        'razon_social' => 'Backup Corp SA',
    ]);

    // Link the profile to an active subscription
    Subscription::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'base_fee' => 1000,
        'discount_pct' => 0,
        'status' => 'active',
        'started_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->delete(route('billing.profiles.destroy', $this->profile))
        ->assertRedirect()
        ->assertSessionHas('error');

    expect(BillingProfile::find($this->profile->id))->not->toBeNull();
});

// ── Auth Guard ─────────────────────────────────────────────────

test('guest is redirected from billing actions', function () {
    $invoice = Invoice::create([
        'org_id' => $this->org->id,
        'billing_profile_id' => $this->profile->id,
        'period' => '2026-03',
        'subtotal' => 100,
        'iva' => 16,
        'total' => 116,
        'status' => 'sent',
    ]);

    $this->post(route('billing.invoices.cancel', $invoice))
        ->assertRedirect(route('login'));
});
