<?php

use App\Models\Device;
use App\Models\FloorPlan;
use App\Models\Organization;
use App\Models\Site;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'Test Org', 'slug' => 'test-org-fp', 'segment' => 'cold_chain',
    ]);

    $this->site = Site::create([
        'org_id' => $this->org->id,
        'name' => 'Test Site',
        'status' => 'active',
    ]);
});

test('floor plans can be created for a site', function () {
    $floorPlan = FloorPlan::create([
        'site_id' => $this->site->id,
        'name' => 'Ground Floor',
        'floor_number' => 1,
        'image_path' => 'floor-plans/1/ground.png',
        'width_px' => 1920,
        'height_px' => 1080,
    ]);

    expect($floorPlan)->toBeInstanceOf(FloorPlan::class)
        ->and($floorPlan->name)->toBe('Ground Floor')
        ->and($floorPlan->site->id)->toBe($this->site->id);
});

test('devices can be placed on floor plans', function () {
    $floorPlan = FloorPlan::create([
        'site_id' => $this->site->id,
        'name' => 'Ground Floor',
        'floor_number' => 1,
        'image_path' => 'floor-plans/1/ground.png',
        'width_px' => 1920,
        'height_px' => 1080,
    ]);

    $device = Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE300001',
        'name' => 'Cooler Sensor',
        'floor_id' => $floorPlan->id,
        'floor_x' => 500,
        'floor_y' => 300,
    ]);

    expect($device->floorPlan->id)->toBe($floorPlan->id)
        ->and($device->floor_x)->toBe(500)
        ->and($device->floor_y)->toBe(300);

    expect($floorPlan->devices)->toHaveCount(1);
});

test('site has many floor plans', function () {
    FloorPlan::create([
        'site_id' => $this->site->id, 'name' => 'Ground', 'floor_number' => 1,
        'image_path' => 'fp/1/ground.png',
    ]);
    FloorPlan::create([
        'site_id' => $this->site->id, 'name' => 'First Floor', 'floor_number' => 2,
        'image_path' => 'fp/1/first.png',
    ]);

    expect($this->site->floorPlans)->toHaveCount(2);
});

test('deleting floor plan nullifies device floor_id', function () {
    $floorPlan = FloorPlan::create([
        'site_id' => $this->site->id, 'name' => 'Ground', 'floor_number' => 1,
        'image_path' => 'fp/1/ground.png',
    ]);

    $device = Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE300002',
        'name' => 'Sensor',
        'floor_id' => $floorPlan->id,
        'floor_x' => 100,
        'floor_y' => 200,
    ]);

    $floorPlan->delete();
    $device->refresh();

    expect($device->floor_id)->toBeNull();
});
