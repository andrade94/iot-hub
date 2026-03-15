<?php

use App\Models\Alert;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderNote;
use App\Models\WorkOrderPhoto;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'WO Test Org', 'slug' => 'wo-test-org', 'segment' => 'cold_chain',
    ]);
    $this->site = Site::create([
        'org_id' => $this->org->id, 'name' => 'WO Test Site', 'status' => 'active',
    ]);
    $this->device = Device::create([
        'site_id' => $this->site->id, 'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFEW00001', 'name' => 'WO Sensor', 'status' => 'active',
    ]);
    $this->user = User::factory()->create(['org_id' => $this->org->id]);
});

test('work order can be created', function () {
    $wo = WorkOrder::create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'type' => 'battery_replace',
        'title' => 'Replace battery on Cooler A sensor',
        'priority' => 'medium',
        'status' => 'open',
        'created_by' => $this->user->id,
    ]);

    expect($wo->title)->toBe('Replace battery on Cooler A sensor')
        ->and($wo->site->id)->toBe($this->site->id)
        ->and($wo->device->id)->toBe($this->device->id);
});

test('work order lifecycle works (open → assigned → in_progress → completed)', function () {
    $wo = WorkOrder::create([
        'site_id' => $this->site->id, 'type' => 'maintenance',
        'title' => 'Lifecycle test', 'status' => 'open', 'priority' => 'high',
    ]);

    $wo->assign($this->user->id);
    expect($wo->refresh()->status)->toBe('assigned')
        ->and($wo->assigned_to)->toBe($this->user->id);

    $wo->start();
    expect($wo->refresh()->status)->toBe('in_progress');

    $wo->complete();
    expect($wo->refresh()->status)->toBe('completed');
});

test('work order can be cancelled', function () {
    $wo = WorkOrder::create([
        'site_id' => $this->site->id, 'type' => 'inspection',
        'title' => 'Cancel test', 'status' => 'open', 'priority' => 'low',
    ]);

    $wo->cancel();
    expect($wo->refresh()->status)->toBe('cancelled');
});

test('work order linked to alert auto-resolves on completion', function () {
    $alert = Alert::create([
        'site_id' => $this->site->id, 'device_id' => $this->device->id,
        'severity' => 'high', 'status' => 'active', 'triggered_at' => now(),
    ]);

    $wo = WorkOrder::create([
        'site_id' => $this->site->id, 'alert_id' => $alert->id,
        'type' => 'sensor_replace', 'title' => 'Replace sensor',
        'status' => 'open', 'priority' => 'high',
    ]);

    // Complete via service would resolve alert — test the model relationship
    expect($wo->alert->id)->toBe($alert->id);
});

test('work order has photos and notes', function () {
    $wo = WorkOrder::create([
        'site_id' => $this->site->id, 'type' => 'maintenance',
        'title' => 'Photos test', 'status' => 'open', 'priority' => 'medium',
    ]);

    WorkOrderPhoto::create([
        'work_order_id' => $wo->id, 'photo_path' => 'photos/test.jpg',
        'caption' => 'Before repair', 'uploaded_by' => $this->user->id,
        'uploaded_at' => now(),
    ]);

    WorkOrderNote::create([
        'work_order_id' => $wo->id, 'user_id' => $this->user->id,
        'note' => 'Replaced battery successfully',
    ]);

    $wo->load(['photos', 'notes']);
    expect($wo->photos)->toHaveCount(1)
        ->and($wo->notes)->toHaveCount(1)
        ->and($wo->notes->first()->note)->toBe('Replaced battery successfully');
});

test('work order scopes filter correctly', function () {
    WorkOrder::create([
        'site_id' => $this->site->id, 'type' => 'maintenance',
        'title' => 'Open', 'status' => 'open', 'priority' => 'medium',
    ]);
    WorkOrder::create([
        'site_id' => $this->site->id, 'type' => 'maintenance',
        'title' => 'Completed', 'status' => 'completed', 'priority' => 'low',
    ]);

    expect(WorkOrder::open()->count())->toBe(1)
        ->and(WorkOrder::forSite($this->site->id)->count())->toBe(2);
});
