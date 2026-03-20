<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\WorkOrder;

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

// ── Feature 1: Dashboard Action Cards ──────────

test('dashboard returns action card counts', function () {
    $user = createUserWithRole('org_admin', $this->org);
    $user->sites()->attach($this->site);
    $device = createDevice($this->site);

    // Create unacknowledged alerts
    Alert::factory()->count(3)->create([
        'site_id' => $this->site->id,
        'device_id' => $device->id,
        'status' => 'active',
    ]);

    // Create overdue work orders (>3 days old)
    WorkOrder::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $device->id,
        'status' => 'open',
        'created_at' => now()->subDays(5),
    ]);

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk();
    $props = $response->original->getData()['page']['props'];
    expect($props['actionCards']['unacknowledged_alerts'])->toBe(3);
    expect($props['actionCards']['overdue_work_orders'])->toBe(1);
});

// ── Feature 3: LFPDPPP Consent ──────────

test('user without consent is redirected to privacy page', function () {
    $user = createUserWithRole('org_admin', $this->org);
    $user->sites()->attach($this->site);
    // Override: clear consent to test redirect
    $user->update(['privacy_accepted_at' => null, 'privacy_policy_version' => null]);

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertRedirect(route('privacy.show'));
});

test('user can accept privacy policy', function () {
    $user = createUserWithRole('org_admin', $this->org);
    $user->update(['privacy_accepted_at' => null, 'privacy_policy_version' => null]);

    $response = $this->actingAs($user)->post(route('privacy.accept'));

    $response->assertRedirect('/dashboard');
    expect($user->fresh()->privacy_accepted_at)->not->toBeNull();
    expect($user->fresh()->privacy_policy_version)->toBe('1.0');
});

test('accepted user can access dashboard normally', function () {
    $user = createUserWithRole('org_admin', $this->org);
    $user->sites()->attach($this->site);
    // User already has consent from createUserWithRole

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk();
});

test('privacy consent page renders', function () {
    $user = createUserWithRole('org_admin', $this->org);
    $user->update(['privacy_accepted_at' => null, 'privacy_policy_version' => null]);

    $response = $this->actingAs($user)->get(route('privacy.show'));

    $response->assertOk();
});

// ── Feature 4: Device Replacement ──────────

test('site_manager can replace active device', function () {
    $user = createUserWithRole('site_manager', $this->org);
    $user->sites()->attach($this->site);

    $device = createDevice($this->site, ['status' => 'active', 'zone' => 'Walk-in Cooler']);
    $rule = AlertRule::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id]);

    $response = $this->actingAs($user)->post(route('devices.replace', [$this->site, $device]), [
        'new_dev_eui' => 'ABCD1234ABCD1234',
        'new_app_key' => 'KEY1234567890ABCDEF1234567890AB',
    ]);

    $response->assertRedirect();

    // Old device marked as replaced
    expect($device->fresh()->status)->toBe('replaced');

    // New device created with inherited config
    $newDevice = Device::where('dev_eui', 'ABCD1234ABCD1234')->first();
    expect($newDevice)->not->toBeNull();
    expect($newDevice->zone)->toBe('Walk-in Cooler');
    expect($newDevice->site_id)->toBe($this->site->id);
    expect($newDevice->status)->toBe('pending');
    expect($newDevice->replaced_device_id)->toBe($device->id);

    // Alert rules transferred to new device
    expect($rule->fresh()->device_id)->toBe($newDevice->id);
});

test('cannot replace pending device', function () {
    $user = createUserWithRole('site_manager', $this->org);
    $user->sites()->attach($this->site);

    $device = createDevice($this->site, ['status' => 'pending']);

    $response = $this->actingAs($user)->post(route('devices.replace', [$this->site, $device]), [
        'new_dev_eui' => 'ABCD1234ABCD1234',
        'new_app_key' => 'KEY1234567890ABCDEF1234567890AB',
    ]);

    $response->assertStatus(422);
});

test('new dev_eui must be unique', function () {
    $user = createUserWithRole('site_manager', $this->org);
    $user->sites()->attach($this->site);

    $existingDevice = createDevice($this->site);
    $device = createDevice($this->site, ['status' => 'active']);

    $response = $this->actingAs($user)->post(route('devices.replace', [$this->site, $device]), [
        'new_dev_eui' => $existingDevice->dev_eui, // already taken
        'new_app_key' => 'KEY1234567890ABCDEF1234567890AB',
    ]);

    $response->assertSessionHasErrors('new_dev_eui');
});
