<?php

use App\Models\MaintenanceWindow;

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

test('site_manager can create maintenance window', function () {
    $user = createUserWithRole('client_site_manager', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->post(route('maintenance-windows.store'), [
        'site_id' => $this->site->id,
        'title' => 'Walk-in Cooler Cleaning',
        'recurrence' => 'weekly',
        'day_of_week' => 2, // Tuesday
        'start_time' => '14:00',
        'duration_minutes' => 120,
        'suppress_alerts' => true,
    ]);

    $response->assertRedirect();
    expect(MaintenanceWindow::count())->toBe(1);

    $window = MaintenanceWindow::first();
    expect($window->title)->toBe('Walk-in Cooler Cleaning');
    expect($window->recurrence)->toBe('weekly');
    expect($window->day_of_week)->toBe(2);
    expect($window->duration_minutes)->toBe(120);
    expect($window->suppress_alerts)->toBeTrue();
});

test('site_manager can update maintenance window', function () {
    $user = createUserWithRole('client_site_manager', $this->org);
    $user->sites()->attach($this->site);

    $window = MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'title' => 'Original Title',
        'recurrence' => 'daily',
        'start_time' => '10:00',
        'duration_minutes' => 60,
        'suppress_alerts' => true,
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->put(route('maintenance-windows.update', $window), [
        'title' => 'Updated Title',
        'recurrence' => 'weekly',
        'day_of_week' => 3,
        'start_time' => '14:00',
        'duration_minutes' => 120,
        'suppress_alerts' => true,
    ]);

    $response->assertRedirect();
    expect($window->fresh()->title)->toBe('Updated Title');
    expect($window->fresh()->recurrence)->toBe('weekly');
});

test('site_manager can delete maintenance window', function () {
    $user = createUserWithRole('client_site_manager', $this->org);
    $user->sites()->attach($this->site);

    $window = MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'title' => 'To Delete',
        'recurrence' => 'once',
        'start_time' => '10:00',
        'duration_minutes' => 60,
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->delete(route('maintenance-windows.destroy', $window));

    $response->assertRedirect();
    expect(MaintenanceWindow::count())->toBe(0);
});

test('site_viewer cannot manage maintenance windows', function () {
    $user = createUserWithRole('client_site_viewer', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->get(route('maintenance-windows.index'));

    $response->assertForbidden();
});

test('guest is redirected', function () {
    $response = $this->get(route('maintenance-windows.index'));

    $response->assertRedirect(route('login'));
});

test('zone-specific window only matches that zone', function () {
    $user = createUserWithRole('client_site_manager', $this->org);
    $user->sites()->attach($this->site);

    MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'zone' => 'Walk-in Cooler',
        'title' => 'Zone-specific window',
        'recurrence' => 'daily',
        'start_time' => now()->format('H:i'),
        'duration_minutes' => 120,
        'suppress_alerts' => true,
        'created_by' => $user->id,
    ]);

    // Active for the matching zone
    expect(MaintenanceWindow::isActiveForZone($this->site->id, 'Walk-in Cooler'))->toBeTrue();
    // NOT active for a different zone
    expect(MaintenanceWindow::isActiveForZone($this->site->id, 'Prep Area'))->toBeFalse();
});

test('site-wide window suppresses all zones', function () {
    $user = createUserWithRole('client_site_manager', $this->org);

    MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'zone' => null, // site-wide
        'title' => 'Site-wide window',
        'recurrence' => 'daily',
        'start_time' => now()->format('H:i'),
        'duration_minutes' => 120,
        'suppress_alerts' => true,
        'created_by' => $user->id,
    ]);

    expect(MaintenanceWindow::isActiveForZone($this->site->id, 'Walk-in Cooler'))->toBeTrue();
    expect(MaintenanceWindow::isActiveForZone($this->site->id, 'Prep Area'))->toBeTrue();
    expect(MaintenanceWindow::isActiveForZone($this->site->id, null))->toBeTrue();
});

test('disabled window does not suppress', function () {
    $user = createUserWithRole('client_site_manager', $this->org);

    MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'title' => 'Disabled window',
        'recurrence' => 'daily',
        'start_time' => now()->format('H:i'),
        'duration_minutes' => 120,
        'suppress_alerts' => false,
        'created_by' => $user->id,
    ]);

    expect(MaintenanceWindow::isActiveForZone($this->site->id, null))->toBeFalse();
});

test('window outside time range is not active', function () {
    $user = createUserWithRole('client_site_manager', $this->org);

    MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'title' => 'Past window',
        'recurrence' => 'daily',
        'start_time' => now()->subHours(3)->format('H:i'),
        'duration_minutes' => 60, // ended 2 hours ago
        'suppress_alerts' => true,
        'created_by' => $user->id,
    ]);

    expect(MaintenanceWindow::isActiveForZone($this->site->id, null))->toBeFalse();
});

test('validation requires title and start_time', function () {
    $user = createUserWithRole('client_site_manager', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->post(route('maintenance-windows.store'), [
        'site_id' => $this->site->id,
        'recurrence' => 'daily',
        'duration_minutes' => 60,
    ]);

    $response->assertSessionHasErrors(['title', 'start_time']);
});
