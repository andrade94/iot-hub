<?php

use App\Models\Organization;
use App\Models\ReportSchedule;
use App\Models\Site;
use App\Models\User;

beforeEach(function () {
    seedPermissions();
    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id]);

    $this->admin = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->admin->assignRole('client_org_admin');

    $this->viewer = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->viewer->assignRole('client_site_viewer');
});

test('org_admin can view report schedules', function () {
    $this->actingAs($this->admin)
        ->get('/settings/report-schedules')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/report-schedules/index')->has('schedules')->has('sites'));
});

test('site_viewer cannot view report schedules', function () {
    $this->actingAs($this->viewer)
        ->get('/settings/report-schedules')
        ->assertForbidden();
});

test('org_admin can create report schedule', function () {
    $this->actingAs($this->admin)
        ->post('/settings/report-schedules', [
            'type' => 'temperature_compliance',
            'site_id' => $this->site->id,
            'frequency' => 'weekly',
            'day_of_week' => 1,
            'time' => '08:00',
            'recipients_json' => ['report@example.com'],
            'active' => true,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('report_schedules', [
        'org_id' => $this->org->id,
        'type' => 'temperature_compliance',
        'frequency' => 'weekly',
    ]);
});

test('create validates required fields', function () {
    $this->actingAs($this->admin)
        ->post('/settings/report-schedules', [])
        ->assertSessionHasErrors(['type', 'frequency', 'time', 'recipients_json']);
});

test('create validates recipients are emails', function () {
    $this->actingAs($this->admin)
        ->post('/settings/report-schedules', [
            'type' => 'temperature_compliance',
            'frequency' => 'daily',
            'time' => '08:00',
            'recipients_json' => ['not-an-email'],
        ])
        ->assertSessionHasErrors('recipients_json.0');
});

test('org_admin can update report schedule', function () {
    $schedule = ReportSchedule::factory()->create([
        'org_id' => $this->org->id,
        'created_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->put("/settings/report-schedules/{$schedule->id}", [
            'type' => 'energy_summary',
            'frequency' => 'monthly',
            'time' => '09:00',
            'recipients_json' => ['new@example.com'],
            'active' => false,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($schedule->fresh()->type)->toBe('energy_summary');
    expect($schedule->fresh()->active)->toBeFalse();
});

test('org_admin can delete report schedule', function () {
    $schedule = ReportSchedule::factory()->create([
        'org_id' => $this->org->id,
        'created_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->delete("/settings/report-schedules/{$schedule->id}")
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseMissing('report_schedules', ['id' => $schedule->id]);
});

test('guest cannot access report schedules', function () {
    $this->get('/settings/report-schedules')->assertRedirect('/login');
});
