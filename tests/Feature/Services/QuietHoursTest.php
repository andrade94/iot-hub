<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\AlertSnooze;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Services\Alerts\AlertRouter;
use Illuminate\Support\Carbon;

beforeEach(function () {
    seedPermissions();
    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id]);
    $this->device = Device::factory()->create(['site_id' => $this->site->id]);
    $this->rule = AlertRule::factory()->create(['site_id' => $this->site->id]);

    $this->user = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->user->assignRole('site_manager');
    $this->user->sites()->attach($this->site->id, [
        'assigned_at' => now(),
        'assigned_by' => $this->user->id,
    ]);
});

test('isInQuietHours returns false when no quiet hours set', function () {
    expect($this->user->isInQuietHours())->toBeFalse();
});

test('isInQuietHours returns true during quiet period (same day range)', function () {
    $this->user->update([
        'quiet_hours_start' => '13:00',
        'quiet_hours_end' => '17:00',
        'quiet_hours_tz' => 'UTC',
    ]);

    Carbon::setTestNow(Carbon::createFromTime(14, 0, 0, 'UTC'));
    expect($this->user->fresh()->isInQuietHours())->toBeTrue();

    Carbon::setTestNow(Carbon::createFromTime(18, 0, 0, 'UTC'));
    expect($this->user->fresh()->isInQuietHours())->toBeFalse();

    Carbon::setTestNow();
});

test('isInQuietHours handles overnight range (23:00 → 06:00)', function () {
    $this->user->update([
        'quiet_hours_start' => '23:00',
        'quiet_hours_end' => '06:00',
        'quiet_hours_tz' => 'UTC',
    ]);

    // At midnight — should be in quiet hours
    Carbon::setTestNow(Carbon::createFromTime(0, 30, 0, 'UTC'));
    expect($this->user->fresh()->isInQuietHours())->toBeTrue();

    // At 23:30 — should be in quiet hours
    Carbon::setTestNow(Carbon::createFromTime(23, 30, 0, 'UTC'));
    expect($this->user->fresh()->isInQuietHours())->toBeTrue();

    // At 5:30 — should be in quiet hours
    Carbon::setTestNow(Carbon::createFromTime(5, 30, 0, 'UTC'));
    expect($this->user->fresh()->isInQuietHours())->toBeTrue();

    // At 7:00 — should NOT be in quiet hours
    Carbon::setTestNow(Carbon::createFromTime(7, 0, 0, 'UTC'));
    expect($this->user->fresh()->isInQuietHours())->toBeFalse();

    // At 12:00 — should NOT be in quiet hours
    Carbon::setTestNow(Carbon::createFromTime(12, 0, 0, 'UTC'));
    expect($this->user->fresh()->isInQuietHours())->toBeFalse();

    Carbon::setTestNow();
});

test('shouldNotifyUser suppresses low severity during quiet hours', function () {
    $this->user->update([
        'quiet_hours_start' => '22:00',
        'quiet_hours_end' => '07:00',
        'quiet_hours_tz' => 'UTC',
    ]);

    Carbon::setTestNow(Carbon::createFromTime(23, 0, 0, 'UTC'));

    $lowAlert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
        'severity' => 'low',
    ]);

    $router = new AlertRouter;
    expect($router->shouldNotifyUser($this->user->id, $lowAlert))->toBeFalse();

    Carbon::setTestNow();
});

test('shouldNotifyUser delivers critical during quiet hours', function () {
    $this->user->update([
        'quiet_hours_start' => '22:00',
        'quiet_hours_end' => '07:00',
        'quiet_hours_tz' => 'UTC',
    ]);

    Carbon::setTestNow(Carbon::createFromTime(23, 0, 0, 'UTC'));

    $criticalAlert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
        'severity' => 'critical',
    ]);

    $router = new AlertRouter;
    expect($router->shouldNotifyUser($this->user->id, $criticalAlert))->toBeTrue();

    Carbon::setTestNow();
});

test('shouldNotifyUser delivers high severity during quiet hours', function () {
    $this->user->update([
        'quiet_hours_start' => '22:00',
        'quiet_hours_end' => '07:00',
        'quiet_hours_tz' => 'UTC',
    ]);

    Carbon::setTestNow(Carbon::createFromTime(1, 0, 0, 'UTC'));

    $highAlert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
        'severity' => 'high',
    ]);

    $router = new AlertRouter;
    expect($router->shouldNotifyUser($this->user->id, $highAlert))->toBeTrue();

    Carbon::setTestNow();
});

test('shouldNotifyUser suppresses when alert is snoozed', function () {
    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
        'severity' => 'critical',
    ]);

    AlertSnooze::factory()->create([
        'alert_id' => $alert->id,
        'user_id' => $this->user->id,
        'expires_at' => now()->addHours(2),
    ]);

    $router = new AlertRouter;
    expect($router->shouldNotifyUser($this->user->id, $alert))->toBeFalse();
});

test('shouldNotifyUser delivers when snooze has expired', function () {
    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
        'severity' => 'high',
    ]);

    AlertSnooze::factory()->expired()->create([
        'alert_id' => $alert->id,
        'user_id' => $this->user->id,
    ]);

    $router = new AlertRouter;
    expect($router->shouldNotifyUser($this->user->id, $alert))->toBeTrue();
});

test('quiet hours can be saved via profile update', function () {
    $this->actingAs($this->user)
        ->patch('/settings/profile', [
            'name' => $this->user->name,
            'email' => $this->user->email,
            'quiet_hours_start' => '23:00',
            'quiet_hours_end' => '06:00',
            'quiet_hours_tz' => 'America/Mexico_City',
        ])
        ->assertRedirect();

    $this->user->refresh();
    expect($this->user->quiet_hours_start)->toContain('23:00');
    expect($this->user->quiet_hours_end)->toContain('06:00');
    expect($this->user->quiet_hours_tz)->toBe('America/Mexico_City');
});

test('quiet hours can be cleared by setting null', function () {
    $this->user->update([
        'quiet_hours_start' => '23:00',
        'quiet_hours_end' => '06:00',
        'quiet_hours_tz' => 'UTC',
    ]);

    $this->actingAs($this->user)
        ->patch('/settings/profile', [
            'name' => $this->user->name,
            'email' => $this->user->email,
            'quiet_hours_start' => null,
            'quiet_hours_end' => null,
            'quiet_hours_tz' => null,
        ])
        ->assertRedirect();

    $this->user->refresh();
    expect($this->user->quiet_hours_start)->toBeNull();
    expect($this->user->isInQuietHours())->toBeFalse();
});

test('quiet hours end must be different from start', function () {
    $this->actingAs($this->user)
        ->patch('/settings/profile', [
            'name' => $this->user->name,
            'email' => $this->user->email,
            'quiet_hours_start' => '23:00',
            'quiet_hours_end' => '23:00',
            'quiet_hours_tz' => 'UTC',
        ])
        ->assertSessionHasErrors('quiet_hours_end');
});
