<?php

use App\Models\Gateway;
use App\Services\ChirpStack\DeviceProvisioner;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('org_admin', $this->org);

    // GatewayController uses $this->authorize() which requires a policy.
    // Grant all abilities to org_admin for gateway operations.
    Gate::before(function ($user) {
        if ($user->hasRole('super_admin') || $user->hasRole('org_admin')) {
            return true;
        }
    });
});

test('org_admin can list gateways', function () {
    Gateway::create(['site_id' => $this->site->id, 'model' => 'UG65', 'serial' => 'GW-001', 'status' => 'online']);

    $this->actingAs($this->user)
        ->get(route('gateways.index', $this->site))
        ->assertOk();
});

test('org_admin can store a gateway', function () {
    Http::fake(['*' => Http::response(['id' => 'gw-123'], 200)]);

    $this->actingAs($this->user)
        ->post(route('gateways.store', $this->site), [
            'model' => 'UG65',
            'serial' => 'GW-NEW-001',
        ])
        ->assertRedirect();

    expect(Gateway::where('serial', 'GW-NEW-001')->exists())->toBeTrue();
});

test('store gateway fails without required fields', function () {
    $this->actingAs($this->user)
        ->post(route('gateways.store', $this->site), [])
        ->assertSessionHasErrors(['model', 'serial']);
});

test('store gateway handles ChirpStack failure gracefully', function () {
    Http::fake(['*' => Http::response('Server Error', 500)]);

    $this->actingAs($this->user)
        ->post(route('gateways.store', $this->site), [
            'model' => 'UG65',
            'serial' => 'GW-FAIL-001',
        ])
        ->assertRedirect();

    // Gateway still created locally even if ChirpStack fails
    expect(Gateway::where('serial', 'GW-FAIL-001')->exists())->toBeTrue();
});

test('org_admin can view a gateway', function () {
    $gateway = Gateway::create(['site_id' => $this->site->id, 'model' => 'UG65', 'serial' => 'GW-002', 'status' => 'online']);

    $this->actingAs($this->user)
        ->get(route('gateways.show', [$this->site, $gateway]))
        ->assertOk();
});

test('org_admin can delete a gateway', function () {
    $gateway = Gateway::create(['site_id' => $this->site->id, 'model' => 'UG65', 'serial' => 'GW-DEL', 'status' => 'online']);

    $this->actingAs($this->user)
        ->delete(route('gateways.destroy', [$this->site, $gateway]))
        ->assertRedirect();

    expect(Gateway::find($gateway->id))->toBeNull();
});

test('site_viewer cannot manage gateways', function () {
    $viewer = createUserWithRole('site_viewer', $this->org);
    $viewer->sites()->attach($this->site->id, ['assigned_at' => now()]);

    $this->actingAs($viewer)
        ->post(route('gateways.store', $this->site), [
            'model' => 'UG65',
            'serial' => 'GW-BLOCKED',
        ])
        ->assertForbidden();
});

test('user from another org cannot access gateways', function () {
    $otherOrg = createOrg(['name' => 'Other']);
    $otherUser = createUserWithRole('org_admin', $otherOrg);

    $this->actingAs($otherUser)
        ->get(route('gateways.index', $this->site))
        ->assertForbidden();
});

test('guest is redirected to login', function () {
    $this->get(route('gateways.index', $this->site))
        ->assertRedirect(route('login'));
});
