<?php

use App\Models\OutageDeclaration;

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

test('super_admin can declare outage', function () {
    $user = createUserWithRole('super_admin', $this->org);

    $response = $this->actingAs($user)->post(route('command-center.outage.declare'), [
        'reason' => 'ChirpStack Cloud experiencing downtime',
        'affected_services' => ['chirpstack', 'mqtt'],
    ]);

    $response->assertRedirect();
    expect(OutageDeclaration::count())->toBe(1);

    $outage = OutageDeclaration::first();
    expect($outage->status)->toBe('active');
    expect($outage->affected_services)->toBe(['chirpstack', 'mqtt']);
    expect($outage->declared_by)->toBe($user->id);
});

test('super_admin can resolve outage', function () {
    $user = createUserWithRole('super_admin', $this->org);

    OutageDeclaration::create([
        'reason' => 'Test outage',
        'affected_services' => ['chirpstack'],
        'status' => 'active',
        'declared_by' => $user->id,
        'declared_at' => now(),
    ]);

    $response = $this->actingAs($user)->delete(route('command-center.outage.resolve'));

    $response->assertRedirect();
    expect(OutageDeclaration::first()->status)->toBe('resolved');
    expect(OutageDeclaration::first()->resolved_by)->toBe($user->id);
});

test('non-super_admin cannot declare outage', function () {
    $user = createUserWithRole('org_admin', $this->org);

    $response = $this->actingAs($user)->post(route('command-center.outage.declare'), [
        'reason' => 'Should not work',
        'affected_services' => ['chirpstack'],
    ]);

    $response->assertForbidden();
    expect(OutageDeclaration::count())->toBe(0);
});

test('outage isActive returns correct state', function () {
    expect(OutageDeclaration::isActive())->toBeFalse();

    $user = createUserWithRole('super_admin', $this->org);
    $outage = OutageDeclaration::create([
        'reason' => 'Test',
        'affected_services' => ['chirpstack'],
        'status' => 'active',
        'declared_by' => $user->id,
        'declared_at' => now(),
    ]);

    expect(OutageDeclaration::isActive())->toBeTrue();

    $outage->resolve($user->id);

    expect(OutageDeclaration::isActive())->toBeFalse();
});

test('outage shared via Inertia as active_outage', function () {
    $user = createUserWithRole('super_admin', $this->org);
    $user->sites()->attach($this->site);

    OutageDeclaration::create([
        'reason' => 'ChirpStack down',
        'affected_services' => ['chirpstack'],
        'status' => 'active',
        'declared_by' => $user->id,
        'declared_at' => now(),
    ]);

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertOk();
    $props = $response->original->getData()['page']['props'];
    expect($props['active_outage'])->not->toBeNull();
    expect($props['active_outage']['reason'])->toBe('ChirpStack down');
});

test('validates reason is required', function () {
    $user = createUserWithRole('super_admin', $this->org);

    $response = $this->actingAs($user)->post(route('command-center.outage.declare'), [
        'affected_services' => ['chirpstack'],
    ]);

    $response->assertSessionHasErrors('reason');
});

test('validates affected_services must have at least one', function () {
    $user = createUserWithRole('super_admin', $this->org);

    $response = $this->actingAs($user)->post(route('command-center.outage.declare'), [
        'reason' => 'Valid reason here',
        'affected_services' => [],
    ]);

    $response->assertSessionHasErrors('affected_services');
});
