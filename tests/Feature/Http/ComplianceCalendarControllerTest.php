<?php

use App\Models\ComplianceEvent;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->admin = createUserWithRole('client_org_admin', $this->org);
});

// ──────────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────────

test('guest is redirected to login', function () {
    $this->get(route('compliance.index'))
        ->assertRedirect(route('login'));
});

test('authenticated user can access compliance calendar index', function () {
    $this->actingAs($this->admin)
        ->get(route('compliance.index'))
        ->assertOk();
});

// ──────────────────────────────────────────────────────────────────────
// Index — Inertia Props
// ──────────────────────────────────────────────────────────────────────

test('index returns events grouped by month', function () {
    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'due_date' => now()->addDays(10),
        'status' => 'upcoming',
    ]);

    $response = $this->actingAs($this->admin)
        ->get(route('compliance.index'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/compliance/index')
            ->has('events')
            ->has('sites')
            ->has('types')
        );
});

test('index filters by site_id', function () {
    $otherSite = createSite($this->org);

    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'due_date' => now()->addDays(5),
    ]);

    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $otherSite->id,
        'due_date' => now()->addDays(5),
    ]);

    $this->actingAs($this->admin)
        ->get(route('compliance.index', ['site_id' => $this->site->id]))
        ->assertOk();
});

test('index filters by type', function () {
    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'type' => 'calibration',
        'due_date' => now()->addDays(5),
    ]);

    $this->actingAs($this->admin)
        ->get(route('compliance.index', ['type' => 'calibration']))
        ->assertOk();
});

test('index filters by status', function () {
    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'status' => 'upcoming',
        'due_date' => now()->addDays(5),
    ]);

    $this->actingAs($this->admin)
        ->get(route('compliance.index', ['status' => 'upcoming']))
        ->assertOk();
});

// ──────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────

test('org_admin can create a compliance event', function () {
    $this->actingAs($this->admin)
        ->post(route('compliance.store'), [
            'site_id' => $this->site->id,
            'type' => 'calibration',
            'title' => 'Annual Sensor Calibration',
            'description' => 'All sensors must be calibrated.',
            'due_date' => now()->addDays(30)->toDateString(),
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('compliance_events', [
        'org_id' => $this->org->id,
        'title' => 'Annual Sensor Calibration',
        'type' => 'calibration',
    ]);
});

test('store validates required fields', function () {
    $this->actingAs($this->admin)
        ->post(route('compliance.store'), [])
        ->assertSessionHasErrors(['site_id', 'type', 'title', 'due_date']);
});

test('store validates type must be a valid option', function () {
    $this->actingAs($this->admin)
        ->post(route('compliance.store'), [
            'site_id' => $this->site->id,
            'type' => 'invalid_type',
            'title' => 'Test Event',
            'due_date' => now()->addDays(5)->toDateString(),
        ])
        ->assertSessionHasErrors(['type']);
});

test('store validates due_date must be today or later', function () {
    $this->actingAs($this->admin)
        ->post(route('compliance.store'), [
            'site_id' => $this->site->id,
            'type' => 'inspection',
            'title' => 'Past Event',
            'due_date' => now()->subDay()->toDateString(),
        ])
        ->assertSessionHasErrors(['due_date']);
});

test('store validates site_id must exist', function () {
    $this->actingAs($this->admin)
        ->post(route('compliance.store'), [
            'site_id' => 99999,
            'type' => 'inspection',
            'title' => 'Nonexistent Site',
            'due_date' => now()->addDays(5)->toDateString(),
        ])
        ->assertSessionHasErrors(['site_id']);
});

test('store validates title max length', function () {
    $this->actingAs($this->admin)
        ->post(route('compliance.store'), [
            'site_id' => $this->site->id,
            'type' => 'inspection',
            'title' => str_repeat('A', 256),
            'due_date' => now()->addDays(5)->toDateString(),
        ])
        ->assertSessionHasErrors(['title']);
});

// ──────────────────────────────────────────────────────────────────────
// Update
// ──────────────────────────────────────────────────────────────────────

test('org_admin can update a compliance event', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Original Title',
        'due_date' => now()->addDays(15),
    ]);

    $this->actingAs($this->admin)
        ->put(route('compliance.update', $event), [
            'site_id' => $this->site->id,
            'type' => 'inspection',
            'title' => 'Updated Title',
            'due_date' => now()->addDays(20)->toDateString(),
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($event->fresh()->title)->toBe('Updated Title');
});

test('update validates required fields', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
    ]);

    $this->actingAs($this->admin)
        ->put(route('compliance.update', $event), [])
        ->assertSessionHasErrors(['site_id', 'type', 'title', 'due_date']);
});

// ──────────────────────────────────────────────────────────────────────
// Complete
// ──────────────────────────────────────────────────────────────────────

test('org_admin can mark a compliance event as completed', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'status' => 'upcoming',
        'title' => 'Pending Inspection',
    ]);

    $this->actingAs($this->admin)
        ->post(route('compliance.complete', $event))
        ->assertRedirect()
        ->assertSessionHas('success');

    $event->refresh();
    expect($event->status)->toBe('completed');
    expect($event->completed_at)->not->toBeNull();
    expect($event->completed_by)->toBe($this->admin->name);
});

// ──────────────────────────────────────────────────────────────────────
// Delete
// ──────────────────────────────────────────────────────────────────────

test('org_admin can delete a compliance event', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
    ]);

    $this->actingAs($this->admin)
        ->delete(route('compliance.destroy', $event))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(ComplianceEvent::find($event->id))->toBeNull();
});
