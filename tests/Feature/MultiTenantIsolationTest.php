<?php

use App\Models\Alert;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    seedPermissions();

    // ── Org A ────────────────────────────────────────────────────
    $this->orgA = createOrg(['name' => 'Org A', 'slug' => 'org-a']);
    $this->siteA = createSite($this->orgA, ['name' => 'Site A']);
    $this->deviceA = createDevice($this->siteA, ['name' => 'Device A']);

    $this->alertA = Alert::create([
        'site_id' => $this->siteA->id,
        'device_id' => $this->deviceA->id,
        'severity' => 'critical',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->workOrderA = WorkOrder::create([
        'site_id' => $this->siteA->id,
        'device_id' => $this->deviceA->id,
        'type' => 'maintenance',
        'title' => 'WO for Org A',
        'status' => 'open',
        'priority' => 'high',
    ]);

    $this->userOrgA = createUserWithRole('org_admin', $this->orgA);

    // ── Org B ────────────────────────────────────────────────────
    $this->orgB = createOrg(['name' => 'Org B', 'slug' => 'org-b']);
    $this->siteB = createSite($this->orgB, ['name' => 'Site B']);
    $this->deviceB = createDevice($this->siteB, ['name' => 'Device B']);

    $this->alertB = Alert::create([
        'site_id' => $this->siteB->id,
        'device_id' => $this->deviceB->id,
        'severity' => 'warning',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->workOrderB = WorkOrder::create([
        'site_id' => $this->siteB->id,
        'device_id' => $this->deviceB->id,
        'type' => 'inspection',
        'title' => 'WO for Org B',
        'status' => 'open',
        'priority' => 'medium',
    ]);

    $this->userOrgB = createUserWithRole('org_admin', $this->orgB);

    // ── Site-scoped users (Org A, two sites) ─────────────────────
    $this->siteA2 = createSite($this->orgA, ['name' => 'Site A2']);
    $this->deviceA2 = createDevice($this->siteA2, ['name' => 'Device A2']);

    $this->managerSiteA = createUserWithRole('site_manager', $this->orgA);
    $this->managerSiteA->sites()->attach($this->siteA->id, ['assigned_at' => now()]);

    $this->viewerSiteA = createUserWithRole('site_viewer', $this->orgA);
    $this->viewerSiteA->sites()->attach($this->siteA->id, ['assigned_at' => now()]);

    // ── Super Admin ──────────────────────────────────────────────
    $this->superAdmin = createUserWithRole('super_admin');
});

// ─────────────────────────────────────────────────────────────────────
// BR-029: Organization Scope (EnsureOrganizationScope middleware)
// ─────────────────────────────────────────────────────────────────────

test('BR-029: org_admin of Org A sees their dashboard (200)', function () {
    $this->actingAs($this->userOrgA)
        ->get(route('dashboard'))
        ->assertOk();
});

test('BR-029: org_admin of Org A cannot view Org B site devices (403)', function () {
    // sites/{site}/devices uses site.access middleware — org_admin cannot
    // access a site belonging to another organization.
    $this->actingAs($this->userOrgA)
        ->get(route('devices.index', $this->siteB))
        ->assertForbidden();
});

test('BR-029: org_admin of Org A lists alerts — only sees Org A alerts', function () {
    $response = $this->actingAs($this->userOrgA)
        ->get(route('alerts.index', ['status' => 'active']))
        ->assertOk();

    $alerts = $response->original->getData()['page']['props']['alerts']['data'] ?? [];
    $alertIds = collect($alerts)->pluck('id')->all();

    expect($alertIds)->toContain($this->alertA->id)
        ->and($alertIds)->not->toContain($this->alertB->id);
});

test('BR-029: org_admin of Org A lists work orders — only sees Org A work orders', function () {
    $response = $this->actingAs($this->userOrgA)
        ->get(route('work-orders.index'))
        ->assertOk();

    $workOrders = $response->original->getData()['page']['props']['workOrders']['data'] ?? [];
    $woIds = collect($workOrders)->pluck('id')->all();

    expect($woIds)->toContain($this->workOrderA->id)
        ->and($woIds)->not->toContain($this->workOrderB->id);
});

// ─────────────────────────────────────────────────────────────────────
// BR-030: Site Access (EnsureSiteAccess middleware)
// ─────────────────────────────────────────────────────────────────────

test('BR-030: site_manager assigned to Site A can view Site A devices (200)', function () {
    $this->actingAs($this->managerSiteA)
        ->get(route('devices.index', $this->siteA))
        ->assertOk();
});

test('BR-030: site_manager assigned to Site A cannot view Site A2 in same org (403)', function () {
    $this->actingAs($this->managerSiteA)
        ->get(route('devices.index', $this->siteA2))
        ->assertForbidden();
});

test('BR-030: site_viewer can view device list for their assigned site (200)', function () {
    $this->actingAs($this->viewerSiteA)
        ->get("/sites/{$this->siteA->id}/devices/{$this->deviceA->id}")
        ->assertOk();
});

test('BR-030: site_viewer cannot view device from another site (403)', function () {
    $this->actingAs($this->viewerSiteA)
        ->get("/sites/{$this->siteA2->id}/devices/{$this->deviceA2->id}")
        ->assertForbidden();
});

// ─────────────────────────────────────────────────────────────────────
// BR-031: super_admin org switching
// ─────────────────────────────────────────────────────────────────────

test('BR-031: super_admin can access Org A site devices', function () {
    $this->actingAs($this->superAdmin)
        ->withSession(['current_org_id' => $this->orgA->id])
        ->get(route('devices.index', $this->siteA))
        ->assertOk();
});

test('BR-031: super_admin can access Org B site devices (cross-org)', function () {
    $this->actingAs($this->superAdmin)
        ->withSession(['current_org_id' => $this->orgB->id])
        ->get(route('devices.index', $this->siteB))
        ->assertOk();
});
