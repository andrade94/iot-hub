<?php

use App\Models\DataExport;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    seedPermissions();
    $this->org = Organization::factory()->create();

    $this->admin = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->admin->assignRole('org_admin');

    $this->viewer = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->viewer->assignRole('site_viewer');
});

test('org_admin can view export page', function () {
    $this->actingAs($this->admin)
        ->get('/settings/export-data')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/export-data/index')->has('exports'));
});

test('site_viewer cannot view export page', function () {
    $this->actingAs($this->viewer)
        ->get('/settings/export-data')
        ->assertForbidden();
});

test('org_admin can request export', function () {
    Queue::fake();

    $this->actingAs($this->admin)
        ->post('/settings/export-data', [
            'date_from' => '2026-01-01',
            'date_to' => '2026-03-01',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('data_exports', [
        'org_id' => $this->org->id,
        'status' => 'queued',
        'requested_by' => $this->admin->id,
    ]);

    Queue::assertPushed(\App\Jobs\ExportOrganizationData::class);
});

test('cannot request export when one is already active', function () {
    DataExport::factory()->create([
        'org_id' => $this->org->id,
        'status' => 'processing',
        'requested_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->post('/settings/export-data')
        ->assertStatus(422);
});

test('export validates date_to is after date_from', function () {
    $this->actingAs($this->admin)
        ->post('/settings/export-data', [
            'date_from' => '2026-03-01',
            'date_to' => '2026-01-01',
        ])
        ->assertSessionHasErrors('date_to');
});

test('guest cannot access exports', function () {
    $this->get('/settings/export-data')->assertRedirect('/login');
    $this->post('/settings/export-data')->assertRedirect('/login');
});
