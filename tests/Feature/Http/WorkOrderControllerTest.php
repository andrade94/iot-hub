<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\WorkOrder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('client_org_admin', $this->org);
    $this->device = createDevice($this->site);
});

test('org_admin can list work orders', function () {
    WorkOrder::create([
        'site_id' => $this->site->id,
        'type' => 'maintenance',
        'title' => 'Test WO',
        'priority' => 'medium',
    ]);

    $this->actingAs($this->user)
        ->get(route('work-orders.index'))
        ->assertOk();
});

test('work orders are scoped to accessible sites', function () {
    $otherOrg = createOrg(['name' => 'Other']);
    $otherSite = createSite($otherOrg, ['name' => 'Other Site']);
    WorkOrder::create(['site_id' => $otherSite->id, 'type' => 'maintenance', 'title' => 'Hidden WO', 'priority' => 'low']);

    $this->actingAs($this->user)
        ->get(route('work-orders.index'))
        ->assertOk();
});

test('work orders can be filtered by status', function () {
    WorkOrder::create(['site_id' => $this->site->id, 'type' => 'maintenance', 'title' => 'Open WO', 'priority' => 'medium', 'status' => 'open']);

    $this->actingAs($this->user)
        ->get(route('work-orders.index', ['status' => 'open']))
        ->assertOk();
});

test('work orders can be filtered by priority', function () {
    WorkOrder::create(['site_id' => $this->site->id, 'type' => 'maintenance', 'title' => 'Urgent WO', 'priority' => 'urgent']);

    $this->actingAs($this->user)
        ->get(route('work-orders.index', ['priority' => 'urgent']))
        ->assertOk();
});

test('work orders can be filtered by type', function () {
    WorkOrder::create(['site_id' => $this->site->id, 'type' => 'battery_replace', 'title' => 'Battery WO', 'priority' => 'low']);

    $this->actingAs($this->user)
        ->get(route('work-orders.index', ['type' => 'battery_replace']))
        ->assertOk();
});

test('org_admin can view a work order', function () {
    $wo = WorkOrder::create(['site_id' => $this->site->id, 'type' => 'maintenance', 'title' => 'Test WO', 'priority' => 'medium']);

    $this->actingAs($this->user)
        ->get(route('work-orders.show', $wo))
        ->assertOk();
});

test('org_admin can create a work order', function () {
    $this->actingAs($this->user)
        ->post(route('work-orders.store', $this->site), [
            'type' => 'maintenance',
            'title' => 'Fix compressor',
            'description' => 'Compressor failing',
            'priority' => 'high',
            'device_id' => $this->device->id,
        ])
        ->assertRedirect(route('work-orders.index'));

    expect(WorkOrder::where('title', 'Fix compressor')->exists())->toBeTrue();
});

test('create work order fails with invalid type', function () {
    $this->actingAs($this->user)
        ->post(route('work-orders.store', $this->site), [
            'type' => 'invalid_type',
            'title' => 'Bad WO',
            'priority' => 'low',
        ])
        ->assertSessionHasErrors('type');
});

test('create work order fails without required fields', function () {
    $this->actingAs($this->user)
        ->post(route('work-orders.store', $this->site), [])
        ->assertSessionHasErrors(['type', 'title', 'priority']);
});

test('work order status can be updated to assigned', function () {
    $wo = WorkOrder::create(['site_id' => $this->site->id, 'type' => 'maintenance', 'title' => 'WO', 'priority' => 'medium', 'status' => 'open']);

    $this->actingAs($this->user)
        ->put(route('work-orders.update-status', $wo), [
            'status' => 'assigned',
            'assigned_to' => $this->user->id,
        ])
        ->assertRedirect();

    expect($wo->fresh()->status)->toBe('assigned');
});

test('work order status can be updated to in_progress', function () {
    $wo = WorkOrder::create(['site_id' => $this->site->id, 'type' => 'maintenance', 'title' => 'WO', 'priority' => 'medium', 'status' => 'open']);
    $wo->assign($this->user->id);

    $this->actingAs($this->user)
        ->put(route('work-orders.update-status', $wo), ['status' => 'in_progress'])
        ->assertRedirect();

    expect($wo->fresh()->status)->toBe('in_progress');
});

test('work order status can be updated to completed', function () {
    $wo = WorkOrder::create(['site_id' => $this->site->id, 'type' => 'maintenance', 'title' => 'WO', 'priority' => 'medium', 'status' => 'open']);
    $wo->assign($this->user->id);
    $wo->start();

    $this->actingAs($this->user)
        ->put(route('work-orders.update-status', $wo), ['status' => 'completed'])
        ->assertRedirect();

    expect($wo->fresh()->status)->toBe('completed');
});

test('completing work order auto-resolves linked alert', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Temp alert',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $wo = WorkOrder::create(['site_id' => $this->site->id, 'alert_id' => $alert->id, 'device_id' => $this->device->id, 'type' => 'maintenance', 'title' => 'WO', 'priority' => 'high', 'status' => 'open']);
    $wo->assign($this->user->id);
    $wo->start();

    $this->actingAs($this->user)
        ->put(route('work-orders.update-status', $wo), ['status' => 'completed'])
        ->assertRedirect();

    expect($alert->fresh()->status)->toBe('resolved');
});

test('photo can be uploaded to a work order', function () {
    Storage::fake('public');

    $wo = WorkOrder::create(['site_id' => $this->site->id, 'type' => 'maintenance', 'title' => 'WO', 'priority' => 'medium']);

    $this->actingAs($this->user)
        ->post(route('work-orders.add-photo', $wo), [
            'photo' => UploadedFile::fake()->image('photo.jpg'),
            'caption' => 'Before repair',
        ])
        ->assertRedirect();

    expect($wo->photos()->count())->toBe(1);
});

test('note can be added to a work order', function () {
    $wo = WorkOrder::create(['site_id' => $this->site->id, 'type' => 'maintenance', 'title' => 'WO', 'priority' => 'medium']);

    $this->actingAs($this->user)
        ->post(route('work-orders.add-note', $wo), ['note' => 'Compressor replaced.'])
        ->assertRedirect();

    expect($wo->notes()->count())->toBe(1);
    expect($wo->notes()->first()->note)->toBe('Compressor replaced.');
});

test('guest is redirected to login', function () {
    $this->get(route('work-orders.index'))
        ->assertRedirect(route('login'));
});
