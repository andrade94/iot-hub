<?php

use App\Models\BillingProfile;
use App\Models\Invoice;
use App\Models\Subscription;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->user = createUserWithRole('org_admin', $this->org);
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
