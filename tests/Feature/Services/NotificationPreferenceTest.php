<?php

use App\Models\Alert;
use App\Models\AlertRule;
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
    $this->user->assignRole('client_site_manager');
    $this->user->sites()->attach($this->site->id, [
        'assigned_at' => now(),
        'assigned_by' => $this->user->id,
    ]);

    $this->router = new AlertRouter;
});

test('wantsChannel returns true by default', function () {
    expect($this->user->wantsChannel('whatsapp'))->toBeTrue();
    expect($this->user->wantsChannel('push'))->toBeTrue();
    expect($this->user->wantsChannel('email'))->toBeTrue();
});

test('wantsChannel returns false when disabled', function () {
    $this->user->update(['notify_whatsapp' => false]);
    expect($this->user->fresh()->wantsChannel('whatsapp'))->toBeFalse();
    expect($this->user->fresh()->wantsChannel('push'))->toBeTrue();
});

test('wantsSeverity filters by minimum level', function () {
    $this->user->update(['notify_min_severity' => 'high']);
    $user = $this->user->fresh();

    expect($user->wantsSeverity('critical'))->toBeTrue();
    expect($user->wantsSeverity('high'))->toBeTrue();
    expect($user->wantsSeverity('medium'))->toBeFalse();
    expect($user->wantsSeverity('low'))->toBeFalse();
});

test('wantsSeverity defaults to all when set to low', function () {
    $this->user->update(['notify_min_severity' => 'low']);
    $user = $this->user->fresh();

    expect($user->wantsSeverity('low'))->toBeTrue();
    expect($user->wantsSeverity('medium'))->toBeTrue();
    expect($user->wantsSeverity('critical'))->toBeTrue();
});

test('notification prefs can be saved via profile update', function () {
    $this->actingAs($this->user)
        ->patch('/settings/profile', [
            'name' => $this->user->name,
            'email' => $this->user->email,
            'notify_whatsapp' => false,
            'notify_push' => true,
            'notify_email' => false,
            'notify_min_severity' => 'high',
        ])
        ->assertRedirect();

    $this->user->refresh();
    expect($this->user->notify_whatsapp)->toBeFalse();
    expect($this->user->notify_push)->toBeTrue();
    expect($this->user->notify_email)->toBeFalse();
    expect($this->user->notify_min_severity)->toBe('high');
});

test('invalid severity value rejected', function () {
    $this->actingAs($this->user)
        ->patch('/settings/profile', [
            'name' => $this->user->name,
            'email' => $this->user->email,
            'notify_min_severity' => 'extreme',
        ])
        ->assertSessionHasErrors('notify_min_severity');
});
