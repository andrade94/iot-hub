<?php

use App\Models\Alert;
use App\Models\CorrectiveAction;

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

test('user with permission can log corrective action on critical alert', function () {
    $user = createUserWithRole('client_site_manager', $this->org);
    $user->sites()->attach($this->site);
    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'severity' => 'critical',
        'status' => 'active',
    ]);

    $response = $this->actingAs($user)->post(route('corrective-actions.store', $alert), [
        'action_taken' => 'Moved product to backup cooler and called technician for compressor repair.',
    ]);

    $response->assertRedirect();
    expect(CorrectiveAction::count())->toBe(1);

    $ca = CorrectiveAction::first();
    expect($ca->alert_id)->toBe($alert->id);
    expect($ca->site_id)->toBe($this->site->id);
    expect($ca->taken_by)->toBe($user->id);
    expect($ca->status)->toBe('logged');
});

test('user with permission can log corrective action on high severity alert', function () {
    $user = createUserWithRole('client_site_viewer', $this->org);
    $user->sites()->attach($this->site);
    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'severity' => 'high',
        'status' => 'active',
    ]);

    $response = $this->actingAs($user)->post(route('corrective-actions.store', $alert), [
        'action_taken' => 'Checked the sensor and reported issue to manager immediately.',
    ]);

    $response->assertRedirect();
    expect(CorrectiveAction::count())->toBe(1);
});

test('cannot log corrective action on medium severity alert', function () {
    $user = createUserWithRole('client_site_manager', $this->org);
    $user->sites()->attach($this->site);
    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'severity' => 'medium',
        'status' => 'active',
    ]);

    $response = $this->actingAs($user)->post(route('corrective-actions.store', $alert), [
        'action_taken' => 'This should not be allowed for medium severity alerts.',
    ]);

    $response->assertForbidden();
    expect(CorrectiveAction::count())->toBe(0);
});

test('action_taken must be at least 10 characters', function () {
    $user = createUserWithRole('client_site_manager', $this->org);
    $user->sites()->attach($this->site);
    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'severity' => 'critical',
        'status' => 'active',
    ]);

    $response = $this->actingAs($user)->post(route('corrective-actions.store', $alert), [
        'action_taken' => 'short',
    ]);

    $response->assertSessionHasErrors('action_taken');
});

test('different user can verify corrective action', function () {
    $userA = createUserWithRole('client_site_viewer', $this->org);
    $userA->sites()->attach($this->site);
    $userB = createUserWithRole('client_site_manager', $this->org);
    $userB->sites()->attach($this->site);

    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'severity' => 'critical',
        'status' => 'active',
    ]);

    $ca = CorrectiveAction::create([
        'alert_id' => $alert->id,
        'site_id' => $this->site->id,
        'action_taken' => 'Moved product to backup cooler and called technician.',
        'status' => 'logged',
        'taken_by' => $userA->id,
        'taken_at' => now(),
    ]);

    $response = $this->actingAs($userB)->post(
        route('corrective-actions.verify', [$alert, $ca])
    );

    $response->assertRedirect();
    expect($ca->fresh()->status)->toBe('verified');
    expect($ca->fresh()->verified_by)->toBe($userB->id);
});

test('same user cannot verify their own corrective action', function () {
    $user = createUserWithRole('client_site_manager', $this->org);
    $user->sites()->attach($this->site);

    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'severity' => 'critical',
        'status' => 'active',
    ]);

    $ca = CorrectiveAction::create([
        'alert_id' => $alert->id,
        'site_id' => $this->site->id,
        'action_taken' => 'Moved product to backup cooler and called technician.',
        'status' => 'logged',
        'taken_by' => $user->id,
        'taken_at' => now(),
    ]);

    $response = $this->actingAs($user)->post(
        route('corrective-actions.verify', [$alert, $ca])
    );

    $response->assertForbidden();
    expect($ca->fresh()->status)->toBe('logged');
});

test('site_viewer cannot verify corrective actions', function () {
    $userA = createUserWithRole('client_site_manager', $this->org);
    $userA->sites()->attach($this->site);
    $viewer = createUserWithRole('client_site_viewer', $this->org);
    $viewer->sites()->attach($this->site);

    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'severity' => 'critical',
        'status' => 'active',
    ]);

    $ca = CorrectiveAction::create([
        'alert_id' => $alert->id,
        'site_id' => $this->site->id,
        'action_taken' => 'Moved product to backup cooler and called technician.',
        'status' => 'logged',
        'taken_by' => $userA->id,
        'taken_at' => now(),
    ]);

    $response = $this->actingAs($viewer)->post(
        route('corrective-actions.verify', [$alert, $ca])
    );

    $response->assertForbidden();
});

test('corrective actions appear on alert detail page', function () {
    $user = createUserWithRole('client_org_admin', $this->org);
    $user->sites()->attach($this->site);

    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'severity' => 'critical',
        'status' => 'active',
        'device_id' => createDevice($this->site)->id,
    ]);

    CorrectiveAction::create([
        'alert_id' => $alert->id,
        'site_id' => $this->site->id,
        'action_taken' => 'Moved product to backup cooler and called technician.',
        'status' => 'logged',
        'taken_by' => $user->id,
        'taken_at' => now(),
    ]);

    $response = $this->actingAs($user)->get(route('alerts.show', $alert));

    $response->assertOk();
    $alertData = $response->original->getData()['page']['props']['alert'];
    expect($alertData['corrective_actions'])->toHaveCount(1);
    expect($alertData['corrective_actions'][0]['taken_by_user'])->not->toBeNull();
});

test('guest cannot log corrective actions', function () {
    $alert = Alert::factory()->create([
        'site_id' => $this->site->id,
        'severity' => 'critical',
        'status' => 'active',
    ]);

    $response = $this->post(route('corrective-actions.store', $alert), [
        'action_taken' => 'This should not work without authentication.',
    ]);

    $response->assertRedirect(route('login'));
});
