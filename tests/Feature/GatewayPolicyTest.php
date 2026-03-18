<?php

use App\Models\Gateway;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Policies\GatewayPolicy;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg(['slug' => 'test-org-gw-policy']);
    $this->site = createSite($this->org);

    $this->user = User::factory()->create(['org_id' => $this->org->id]);
    $this->user->assignRole('org_admin');

    $this->gateway = Gateway::create([
        'site_id' => $this->site->id,
        'model' => 'UG65',
        'serial' => 'GW-POLICY-001',
        'status' => 'online',
    ]);

    $this->policy = new GatewayPolicy();
});

// ── viewAny ──────────────────────────────────────────────────────────────

test('user with manage devices permission and site access can viewAny gateways', function () {
    expect($this->policy->viewAny($this->user, $this->site))->toBeTrue();
});

test('user without manage devices permission cannot viewAny gateways', function () {
    $viewer = User::factory()->create(['org_id' => $this->org->id]);
    $viewer->assignRole('site_viewer'); // has view devices but not manage devices

    expect($this->policy->viewAny($viewer, $this->site))->toBeFalse();
});

test('user with permission but no site access cannot viewAny gateways', function () {
    $otherOrg = createOrg(['slug' => 'other-org-gw-policy']);
    $otherUser = User::factory()->create(['org_id' => $otherOrg->id]);
    $otherUser->assignRole('org_admin');

    expect($this->policy->viewAny($otherUser, $this->site))->toBeFalse();
});

// ── view ─────────────────────────────────────────────────────────────────

test('user with manage devices permission and site access can view a gateway', function () {
    expect($this->policy->view($this->user, $this->gateway, $this->site))->toBeTrue();
});

test('user without manage devices permission cannot view a gateway', function () {
    $viewer = User::factory()->create(['org_id' => $this->org->id]);
    $viewer->assignRole('site_viewer');

    expect($this->policy->view($viewer, $this->gateway, $this->site))->toBeFalse();
});

// ── create ───────────────────────────────────────────────────────────────

test('user with manage devices permission and site access can create a gateway', function () {
    expect($this->policy->create($this->user, $this->site))->toBeTrue();
});

test('user without manage devices permission cannot create a gateway', function () {
    $viewer = User::factory()->create(['org_id' => $this->org->id]);
    $viewer->assignRole('site_viewer');

    expect($this->policy->create($viewer, $this->site))->toBeFalse();
});

// ── delete ───────────────────────────────────────────────────────────────

test('user with manage devices permission and site access can delete a gateway', function () {
    expect($this->policy->delete($this->user, $this->gateway, $this->site))->toBeTrue();
});

test('user without manage devices permission cannot delete a gateway', function () {
    $viewer = User::factory()->create(['org_id' => $this->org->id]);
    $viewer->assignRole('site_viewer');

    expect($this->policy->delete($viewer, $this->gateway, $this->site))->toBeFalse();
});
