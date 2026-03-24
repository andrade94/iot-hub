<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    seedPermissions();
    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id]);
    $this->device = Device::factory()->create(['site_id' => $this->site->id]);
    $this->rule = AlertRule::factory()->create(['site_id' => $this->site->id]);

    $this->manager = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->manager->assignRole('client_site_manager');
    $this->manager->sites()->attach($this->site->id, [
        'assigned_at' => now(),
        'assigned_by' => $this->manager->id,
    ]);
});

// ── Alert Bulk Operations ──────────────────────────────────────

test('bulk acknowledge acknowledges multiple active alerts', function () {
    $alerts = Alert::factory(3)->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
        'severity' => 'high',
    ]);

    $this->actingAs($this->manager)
        ->post('/alerts/bulk-acknowledge', ['ids' => $alerts->pluck('id')->toArray()])
        ->assertRedirect();

    foreach ($alerts as $alert) {
        expect($alert->fresh()->status)->toBe('acknowledged');
    }
});

test('bulk resolve resolves multiple alerts', function () {
    $alerts = Alert::factory(3)->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
        'severity' => 'medium',
    ]);

    $this->actingAs($this->manager)
        ->post('/alerts/bulk-resolve', ['ids' => $alerts->pluck('id')->toArray()])
        ->assertRedirect();

    foreach ($alerts as $alert) {
        expect($alert->fresh()->status)->toBe('resolved');
    }
});

test('bulk acknowledge skips already acknowledged alerts gracefully', function () {
    $active = Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
    ]);
    $resolved = Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'resolved',
    ]);

    $this->actingAs($this->manager)
        ->post('/alerts/bulk-acknowledge', ['ids' => [$active->id, $resolved->id]])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($active->fresh()->status)->toBe('acknowledged');
    expect($resolved->fresh()->status)->toBe('resolved'); // unchanged
});

test('bulk acknowledge validates ids are required', function () {
    $this->actingAs($this->manager)
        ->post('/alerts/bulk-acknowledge', ['ids' => []])
        ->assertSessionHasErrors('ids');
});

test('bulk acknowledge enforces max 100 limit', function () {
    $ids = range(1, 101);

    $this->actingAs($this->manager)
        ->post('/alerts/bulk-acknowledge', ['ids' => $ids])
        ->assertSessionHasErrors('ids');
});

test('site_viewer can bulk acknowledge alerts', function () {
    $viewer = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $viewer->assignRole('client_site_viewer');
    $viewer->sites()->attach($this->site->id, [
        'assigned_at' => now(),
        'assigned_by' => $this->manager->id,
    ]);

    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
    ]);

    $this->actingAs($viewer)
        ->post('/alerts/bulk-acknowledge', ['ids' => [$alert->id]])
        ->assertRedirect();

    expect($alert->fresh()->status)->toBe('acknowledged');
});

// ── Work Order Bulk Assign ─────────────────────────────────────

test('bulk assign assigns multiple work orders to a technician', function () {
    $tech = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $tech->assignRole('technician');

    $wos = WorkOrder::factory(3)->create([
        'site_id' => $this->site->id,
        'status' => 'open',
    ]);

    $this->actingAs($this->manager)
        ->post('/work-orders/bulk-assign', [
            'ids' => $wos->pluck('id')->toArray(),
            'assigned_to' => $tech->id,
        ])
        ->assertRedirect();

    foreach ($wos as $wo) {
        $wo->refresh();
        expect($wo->assigned_to)->toBe($tech->id);
        expect($wo->status)->toBe('assigned');
    }
});

test('bulk assign validates assigned_to is required', function () {
    $wo = WorkOrder::factory()->create(['site_id' => $this->site->id, 'status' => 'open']);

    $this->actingAs($this->manager)
        ->post('/work-orders/bulk-assign', ['ids' => [$wo->id]])
        ->assertSessionHasErrors('assigned_to');
});

test('bulk assign enforces max 50 limit', function () {
    $ids = range(1, 51);

    $this->actingAs($this->manager)
        ->post('/work-orders/bulk-assign', ['ids' => $ids, 'assigned_to' => 1])
        ->assertSessionHasErrors('ids');
});

test('bulk assign skips already completed work orders', function () {
    $tech = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $tech->assignRole('technician');

    $open = WorkOrder::factory()->create(['site_id' => $this->site->id, 'status' => 'open']);
    $completed = WorkOrder::factory()->create(['site_id' => $this->site->id, 'status' => 'completed']);

    $this->actingAs($this->manager)
        ->post('/work-orders/bulk-assign', [
            'ids' => [$open->id, $completed->id],
            'assigned_to' => $tech->id,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($open->fresh()->assigned_to)->toBe($tech->id);
    expect($completed->fresh()->status)->toBe('completed'); // unchanged
});
