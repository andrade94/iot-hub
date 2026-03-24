<?php

use App\Models\Device;
use App\Models\DeviceCalibration;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    seedPermissions();
    Storage::fake('public');

    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id]);
    $this->device = Device::factory()->create(['site_id' => $this->site->id]);

    $this->admin = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->admin->assignRole('client_org_admin');
});

test('org_admin can add calibration record', function () {
    $this->actingAs($this->admin)
        ->post("/devices/{$this->device->id}/calibrations", [
            'calibrated_at' => '2026-03-01',
            'expires_at' => '2027-03-01',
            'calibrated_by' => 'Lab CENAM',
            'method' => 'comparison',
            'notes' => 'Verified within ±0.2°C',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('device_calibrations', [
        'device_id' => $this->device->id,
        'calibrated_by' => 'Lab CENAM',
        'method' => 'comparison',
    ]);
});

test('calibration record with certificate upload', function () {
    $pdf = UploadedFile::fake()->create('certificate.pdf', 500, 'application/pdf');

    $this->actingAs($this->admin)
        ->post("/devices/{$this->device->id}/calibrations", [
            'calibrated_at' => '2026-03-01',
            'expires_at' => '2027-03-01',
            'certificate' => $pdf,
        ])
        ->assertRedirect();

    $cal = DeviceCalibration::first();
    expect($cal->certificate_path)->not->toBeNull();
    Storage::disk('public')->assertExists($cal->certificate_path);
});

test('validates calibrated_at not in future', function () {
    $this->actingAs($this->admin)
        ->post("/devices/{$this->device->id}/calibrations", [
            'calibrated_at' => '2027-01-01',
            'expires_at' => '2028-01-01',
        ])
        ->assertSessionHasErrors('calibrated_at');
});

test('validates expires_at is after calibrated_at', function () {
    $this->actingAs($this->admin)
        ->post("/devices/{$this->device->id}/calibrations", [
            'calibrated_at' => '2026-03-01',
            'expires_at' => '2026-02-01',
        ])
        ->assertSessionHasErrors('expires_at');
});

test('org_admin can delete calibration record', function () {
    $cal = DeviceCalibration::factory()->create([
        'device_id' => $this->device->id,
        'uploaded_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->delete("/calibrations/{$cal->id}")
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseMissing('device_calibrations', ['id' => $cal->id]);
});

test('calibrationStatus returns correct values', function () {
    // No calibration
    expect($this->device->calibrationStatus())->toBe('none');

    // Valid calibration
    DeviceCalibration::factory()->create([
        'device_id' => $this->device->id,
        'expires_at' => now()->addMonths(6),
    ]);
    $this->device->refresh();
    $this->device->unsetRelation('latestCalibration');
    expect($this->device->calibrationStatus())->toBe('valid');

    // Create a newer calibration that's expiring soon (within 30 days)
    DeviceCalibration::where('device_id', $this->device->id)->delete();
    DeviceCalibration::factory()->expiringSoon()->create([
        'device_id' => $this->device->id,
    ]);
    $this->device->refresh();
    $this->device->unsetRelation('latestCalibration');
    expect($this->device->calibrationStatus())->toBe('expiring');
});

test('expired calibration detected correctly', function () {
    $cal = DeviceCalibration::factory()->expired()->create([
        'device_id' => $this->device->id,
    ]);

    expect($cal->isExpired())->toBeTrue();
    expect($cal->calibrationStatus())->toBe('expired');
});

test('guest cannot add calibration', function () {
    $this->post("/devices/{$this->device->id}/calibrations", [
        'calibrated_at' => '2026-03-01',
        'expires_at' => '2027-03-01',
    ])->assertRedirect('/login');
});
