<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\AlertSnooze;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;

beforeEach(function () {
    seedPermissions();
    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id]);
    $this->device = Device::factory()->create(['site_id' => $this->site->id]);
    $this->rule = AlertRule::factory()->create(['site_id' => $this->site->id]);
    $this->alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
        'severity' => 'high',
    ]);

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

test('user can snooze an active alert', function () {
    $this->actingAs($this->manager)
        ->post("/alerts/{$this->alert->id}/snooze", ['duration_minutes' => 120])
        ->assertRedirect();

    $this->assertDatabaseHas('alert_snoozes', [
        'alert_id' => $this->alert->id,
        'user_id' => $this->manager->id,
    ]);

    $snooze = AlertSnooze::where('alert_id', $this->alert->id)->first();
    expect($snooze->expires_at->diffInMinutes(now(), absolute: true))->toBeBetween(119, 121);
});

test('user can snooze an acknowledged alert', function () {
    $this->alert->update(['status' => 'acknowledged']);

    $this->actingAs($this->manager)
        ->post("/alerts/{$this->alert->id}/snooze", ['duration_minutes' => 60])
        ->assertRedirect();

    $this->assertDatabaseHas('alert_snoozes', [
        'alert_id' => $this->alert->id,
        'user_id' => $this->manager->id,
    ]);
});

test('snooze validates duration_minutes', function () {
    $this->actingAs($this->manager)
        ->post("/alerts/{$this->alert->id}/snooze", ['duration_minutes' => 999])
        ->assertSessionHasErrors('duration_minutes');
});

test('snooze duration must be one of allowed values', function () {
    $this->actingAs($this->manager)
        ->post("/alerts/{$this->alert->id}/snooze", ['duration_minutes' => 45])
        ->assertSessionHasErrors('duration_minutes');
});

test('user can cancel a snooze', function () {
    AlertSnooze::factory()->create([
        'alert_id' => $this->alert->id,
        'user_id' => $this->manager->id,
        'expires_at' => now()->addHours(2),
    ]);

    $this->actingAs($this->manager)
        ->delete("/alerts/{$this->alert->id}/snooze")
        ->assertRedirect();

    $this->assertDatabaseMissing('alert_snoozes', [
        'alert_id' => $this->alert->id,
        'user_id' => $this->manager->id,
    ]);
});

test('re-snoozing updates existing snooze instead of creating duplicate', function () {
    AlertSnooze::factory()->create([
        'alert_id' => $this->alert->id,
        'user_id' => $this->manager->id,
        'expires_at' => now()->addMinutes(30),
    ]);

    $this->actingAs($this->manager)
        ->post("/alerts/{$this->alert->id}/snooze", ['duration_minutes' => 480])
        ->assertRedirect();

    expect(AlertSnooze::where('alert_id', $this->alert->id)
        ->where('user_id', $this->manager->id)
        ->count()
    )->toBe(1);

    $snooze = AlertSnooze::where('alert_id', $this->alert->id)->first();
    expect($snooze->expires_at->diffInMinutes(now(), absolute: true))->toBeBetween(479, 481);
});

test('multiple users can snooze the same alert independently', function () {
    $tech = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $tech->assignRole('technician');
    $tech->sites()->attach($this->site->id, [
        'assigned_at' => now(),
        'assigned_by' => $this->manager->id,
    ]);

    $this->actingAs($this->manager)
        ->post("/alerts/{$this->alert->id}/snooze", ['duration_minutes' => 120]);

    $this->actingAs($tech)
        ->post("/alerts/{$this->alert->id}/snooze", ['duration_minutes' => 60]);

    expect(AlertSnooze::where('alert_id', $this->alert->id)->count())->toBe(2);
});

test('alert show page returns user snooze data', function () {
    $snooze = AlertSnooze::factory()->create([
        'alert_id' => $this->alert->id,
        'user_id' => $this->manager->id,
        'expires_at' => now()->addHours(2),
    ]);

    $this->actingAs($this->manager)
        ->get("/alerts/{$this->alert->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('alerts/show')
            ->has('userSnooze')
            ->where('userSnooze.id', $snooze->id)
        );
});

test('alert show page returns null when no snooze active', function () {
    $this->actingAs($this->manager)
        ->get("/alerts/{$this->alert->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('alerts/show')
            ->where('userSnooze', null)
        );
});

test('isSnoozedFor returns true for active snooze', function () {
    AlertSnooze::factory()->create([
        'alert_id' => $this->alert->id,
        'user_id' => $this->manager->id,
        'expires_at' => now()->addHours(2),
    ]);

    expect($this->alert->isSnoozedFor($this->manager->id))->toBeTrue();
});

test('isSnoozedFor returns false for expired snooze', function () {
    AlertSnooze::factory()->create([
        'alert_id' => $this->alert->id,
        'user_id' => $this->manager->id,
        'expires_at' => now()->subMinutes(5),
    ]);

    expect($this->alert->isSnoozedFor($this->manager->id))->toBeFalse();
});

test('site_viewer with acknowledge permission can snooze', function () {
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

    $this->actingAs($viewer)
        ->post("/alerts/{$this->alert->id}/snooze", ['duration_minutes' => 120])
        ->assertRedirect();

    $this->assertDatabaseHas('alert_snoozes', [
        'alert_id' => $this->alert->id,
        'user_id' => $viewer->id,
    ]);
});
