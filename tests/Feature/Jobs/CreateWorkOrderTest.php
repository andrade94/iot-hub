<?php

use App\Jobs\CreateWorkOrder;
use App\Models\WorkOrder;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

test('creates work order for existing device', function () {
    $device = createDevice($this->site);

    (new CreateWorkOrder($device->id, 'battery_replace', 'medium', 'Low battery alert'))->handle(
        new \App\Services\WorkOrders\WorkOrderService
    );

    expect(WorkOrder::where('device_id', $device->id)->exists())->toBeTrue();
    expect(WorkOrder::first()->title)->toBe('Low battery alert');
});

test('handles missing device gracefully', function () {
    (new CreateWorkOrder(99999, 'maintenance', 'low', 'Test'))->handle(
        new \App\Services\WorkOrders\WorkOrderService
    );

    expect(WorkOrder::count())->toBe(0);
});

test('work order has correct attributes', function () {
    $device = createDevice($this->site);

    (new CreateWorkOrder($device->id, 'sensor_replace', 'high', 'Sensor failure'))->handle(
        new \App\Services\WorkOrders\WorkOrderService
    );

    $wo = WorkOrder::first();
    expect($wo->type)->toBe('sensor_replace');
    expect($wo->priority)->toBe('high');
    expect($wo->site_id)->toBe($this->site->id);
});
