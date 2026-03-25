<?php

// Covers: BLD-04 — Temperature Verification log

use App\Models\TemperatureVerification;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('client_org_admin', $this->org);
});

test('index loads with site verifications', function () {
    TemperatureVerification::create([
        'site_id' => $this->site->id,
        'zone' => 'Walk-in Cooler',
        'manual_reading' => 3.5,
        'sensor_reading' => 3.8,
        'discrepancy' => 0.3,
        'verified_by' => $this->user->id,
        'verified_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->get(route('sites.verifications', $this->site))
        ->assertOk();
});

test('store creates verification record', function () {
    $this->actingAs($this->user)
        ->post(route('sites.verifications.store', $this->site), [
            'zone' => 'Walk-in Cooler',
            'manual_reading' => 4.0,
            'sensor_reading' => 4.2,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(TemperatureVerification::where('site_id', $this->site->id)->count())->toBe(1);

    $record = TemperatureVerification::first();
    expect($record->zone)->toBe('Walk-in Cooler');
    expect((float) $record->manual_reading)->toBe(4.0);
    expect($record->verified_by)->toBe($this->user->id);
});

test('store computes discrepancy from manual and sensor readings', function () {
    $this->actingAs($this->user)
        ->post(route('sites.verifications.store', $this->site), [
            'zone' => 'Prep Area',
            'manual_reading' => 5.0,
            'sensor_reading' => 3.5,
        ])
        ->assertRedirect();

    $record = TemperatureVerification::first();
    expect((float) $record->discrepancy)->toBe(1.5);
});

test('store with null sensor_reading leaves discrepancy null', function () {
    $this->actingAs($this->user)
        ->post(route('sites.verifications.store', $this->site), [
            'zone' => 'Freezer',
            'manual_reading' => -18.0,
        ])
        ->assertRedirect();

    $record = TemperatureVerification::first();
    expect($record->discrepancy)->toBeNull();
});

test('user from different org cannot access site verifications', function () {
    $otherOrg = createOrg(['name' => 'Other']);
    $otherUser = createUserWithRole('client_org_admin', $otherOrg);

    $this->actingAs($otherUser)
        ->get(route('sites.verifications', $this->site))
        ->assertForbidden();
});

test('store validates required fields', function () {
    $this->actingAs($this->user)
        ->post(route('sites.verifications.store', $this->site), [])
        ->assertSessionHasErrors(['zone', 'manual_reading']);
});

test('store validates manual_reading is numeric', function () {
    $this->actingAs($this->user)
        ->post(route('sites.verifications.store', $this->site), [
            'zone' => 'Walk-in Cooler',
            'manual_reading' => 'not-a-number',
        ])
        ->assertSessionHasErrors('manual_reading');
});

test('store validates reading is within range', function () {
    $this->actingAs($this->user)
        ->post(route('sites.verifications.store', $this->site), [
            'zone' => 'Walk-in Cooler',
            'manual_reading' => 200, // beyond -100,100 range
        ])
        ->assertSessionHasErrors('manual_reading');
});

test('guest is redirected to login', function () {
    $this->get(route('sites.verifications', $this->site))
        ->assertRedirect(route('login'));
});

test('store with notes saves them correctly', function () {
    $this->actingAs($this->user)
        ->post(route('sites.verifications.store', $this->site), [
            'zone' => 'Walk-in Cooler',
            'manual_reading' => 4.0,
            'notes' => 'Calibration looks good',
        ])
        ->assertRedirect();

    $record = TemperatureVerification::first();
    expect($record->notes)->toBe('Calibration looks good');
});
