<?php

use App\Models\FloorPlan;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('client_org_admin', $this->org);
});

test('org_admin can upload a floor plan', function () {
    Storage::fake('public');

    $this->actingAs($this->user)
        ->post(route('floor-plans.store', $this->site), [
            'name' => 'Ground Floor',
            'floor_number' => 0,
            'image' => UploadedFile::fake()->image('floor.png', 800, 600),
        ])
        ->assertRedirect();

    expect(FloorPlan::where('name', 'Ground Floor')->exists())->toBeTrue();
    expect($this->site->fresh()->floor_plan_count)->toBe(1);
});

test('store floor plan fails without required fields', function () {
    $this->actingAs($this->user)
        ->post(route('floor-plans.store', $this->site), [])
        ->assertSessionHasErrors(['name', 'floor_number', 'image']);
});

test('org_admin can update a floor plan', function () {
    $floorPlan = FloorPlan::create([
        'site_id' => $this->site->id,
        'name' => 'Old Name',
        'floor_number' => 1,
        'image_path' => 'floor-plans/1/test.png',
    ]);

    $this->actingAs($this->user)
        ->put(route('floor-plans.update', [$this->site, $floorPlan]), [
            'name' => 'New Name',
        ])
        ->assertRedirect();

    expect($floorPlan->fresh()->name)->toBe('New Name');
});

test('org_admin can delete a floor plan', function () {
    Storage::fake('public');

    $floorPlan = FloorPlan::create([
        'site_id' => $this->site->id,
        'name' => 'Delete Me',
        'floor_number' => 2,
        'image_path' => 'floor-plans/1/test.png',
    ]);

    $this->actingAs($this->user)
        ->delete(route('floor-plans.destroy', [$this->site, $floorPlan]))
        ->assertRedirect();

    expect(FloorPlan::find($floorPlan->id))->toBeNull();
});

test('deleting floor plan detaches devices', function () {
    Storage::fake('public');

    $floorPlan = FloorPlan::create([
        'site_id' => $this->site->id,
        'name' => 'Floor',
        'floor_number' => 1,
        'image_path' => 'floor-plans/1/test.png',
    ]);

    $device = createDevice($this->site, ['floor_id' => $floorPlan->id, 'floor_x' => 100, 'floor_y' => 200]);

    $this->actingAs($this->user)
        ->delete(route('floor-plans.destroy', [$this->site, $floorPlan]))
        ->assertRedirect();

    expect($device->fresh()->floor_id)->toBeNull();
    expect($device->fresh()->floor_x)->toBeNull();
});

test('site_viewer cannot manage floor plans', function () {
    $viewer = createUserWithRole('client_site_viewer', $this->org);
    $viewer->sites()->attach($this->site->id, ['assigned_at' => now()]);

    $this->actingAs($viewer)
        ->post(route('floor-plans.store', $this->site), [
            'name' => 'Blocked',
            'floor_number' => 0,
            'image' => UploadedFile::fake()->image('floor.png'),
        ])
        ->assertForbidden();
});
