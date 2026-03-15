<?php

use App\Models\AlertRule;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('org_admin', $this->org);
    $this->device = createDevice($this->site);
});

test('org_admin can list alert rules for a site', function () {
    AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'High temp',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    $this->actingAs($this->user)
        ->get(route('rules.index', $this->site))
        ->assertOk();
});

test('org_admin can create an alert rule', function () {
    $this->actingAs($this->user)
        ->post(route('rules.store', $this->site), [
            'name' => 'Freezer temp',
            'conditions' => [
                ['metric' => 'temperature', 'condition' => 'above', 'threshold' => -15, 'duration_minutes' => 10, 'severity' => 'critical'],
            ],
            'severity' => 'critical',
            'cooldown_minutes' => 30,
        ])
        ->assertRedirect();

    expect(AlertRule::where('name', 'Freezer temp')->exists())->toBeTrue();
});

test('create rule fails without required fields', function () {
    $this->actingAs($this->user)
        ->post(route('rules.store', $this->site), [])
        ->assertSessionHasErrors(['name', 'conditions', 'severity']);
});

test('create rule validates conditions array structure', function () {
    $this->actingAs($this->user)
        ->post(route('rules.store', $this->site), [
            'name' => 'Bad rule',
            'conditions' => [['metric' => 'temperature']], // missing required fields
            'severity' => 'high',
        ])
        ->assertSessionHasErrors();
});

test('create rule validates severity values', function () {
    $this->actingAs($this->user)
        ->post(route('rules.store', $this->site), [
            'name' => 'Bad severity',
            'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
            'severity' => 'invalid',
        ])
        ->assertSessionHasErrors('severity');
});

test('org_admin can view an alert rule', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Rule 1',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    $this->actingAs($this->user)
        ->get(route('rules.show', [$this->site, $rule]))
        ->assertOk();
});

test('org_admin can update an alert rule', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Old Name',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    $this->actingAs($this->user)
        ->put(route('rules.update', [$this->site, $rule]), [
            'name' => 'New Name',
            'severity' => 'critical',
        ])
        ->assertRedirect();

    expect($rule->fresh()->name)->toBe('New Name');
    expect($rule->fresh()->severity)->toBe('critical');
});

test('org_admin can delete an alert rule', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Delete me',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);

    $this->actingAs($this->user)
        ->delete(route('rules.destroy', [$this->site, $rule]))
        ->assertRedirect();

    expect(AlertRule::find($rule->id))->toBeNull();
});

test('site_viewer cannot manage alert rules', function () {
    $viewer = createUserWithRole('site_viewer', $this->org);
    $viewer->sites()->attach($this->site->id, ['assigned_at' => now()]);

    $this->actingAs($viewer)
        ->post(route('rules.store', $this->site), [
            'name' => 'Blocked rule',
            'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
            'severity' => 'high',
        ])
        ->assertForbidden();
});

test('guest is redirected to login', function () {
    $this->get(route('rules.index', $this->site))
        ->assertRedirect(route('login'));
});
