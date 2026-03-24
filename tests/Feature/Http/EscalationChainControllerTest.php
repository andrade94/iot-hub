<?php

use App\Models\EscalationChain;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->admin = createUserWithRole('client_org_admin', $this->org);
});

// ──────────────────────────────────────────────────────────────────────
// Auth & Permissions
// ──────────────────────────────────────────────────────────────────────

test('guest is redirected to login', function () {
    $this->get(route('escalation-chains.index'))
        ->assertRedirect(route('login'));
});

test('site_viewer is forbidden from accessing escalation chains', function () {
    $viewer = createUserWithRole('client_site_viewer', $this->org);

    $this->actingAs($viewer)
        ->get(route('escalation-chains.index'))
        ->assertForbidden();
});

// ──────────────────────────────────────────────────────────────────────
// Index
// ──────────────────────────────────────────────────────────────────────

test('org_admin can access escalation chains index', function () {
    $this->actingAs($this->admin)
        ->get(route('escalation-chains.index'))
        ->assertOk();
});

// ──────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────

test('org_admin can create an escalation chain', function () {
    $this->actingAs($this->admin)
        ->post(route('escalation-chains.store'), [
            'name' => 'Critical Chain',
            'site_id' => $this->site->id,
            'levels' => [
                [
                    'level' => 1,
                    'delay_minutes' => 0,
                    'user_ids' => [$this->admin->id],
                    'channels' => ['push'],
                ],
            ],
        ])
        ->assertRedirect();
});

test('store validates required fields', function () {
    $this->actingAs($this->admin)
        ->post(route('escalation-chains.store'), [])
        ->assertSessionHasErrors(['name', 'site_id', 'levels']);
});

test('store validates site_id exists', function () {
    $this->actingAs($this->admin)
        ->post(route('escalation-chains.store'), [
            'name' => 'Bad Site Chain',
            'site_id' => 99999,
            'levels' => [
                [
                    'level' => 1,
                    'delay_minutes' => 0,
                    'user_ids' => [$this->admin->id],
                    'channels' => ['push'],
                ],
            ],
        ])
        ->assertSessionHasErrors(['site_id']);
});

test('store validates levels array structure', function () {
    $this->actingAs($this->admin)
        ->post(route('escalation-chains.store'), [
            'name' => 'Incomplete levels',
            'site_id' => $this->site->id,
            'levels' => [
                ['level' => 1], // missing delay_minutes, user_ids, channels
            ],
        ])
        ->assertSessionHasErrors();
});

// ──────────────────────────────────────────────────────────────────────
// Update
// ──────────────────────────────────────────────────────────────────────

test('org_admin can update an escalation chain', function () {
    $chain = EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [['level' => 1, 'delay_minutes' => 5, 'user_ids' => [$this->admin->id], 'channels' => ['push']]],
    ]);

    $this->actingAs($this->admin)
        ->put(route('escalation-chains.update', $chain), [
            'name' => 'Updated Chain',
            'site_id' => $this->site->id,
            'levels' => [
                [
                    'level' => 1,
                    'delay_minutes' => 10,
                    'user_ids' => [$this->admin->id],
                    'channels' => ['push', 'email'],
                ],
            ],
        ])
        ->assertRedirect();
});

// ──────────────────────────────────────────────────────────────────────
// Destroy
// ──────────────────────────────────────────────────────────────────────

test('org_admin can delete an escalation chain', function () {
    $chain = EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [['level' => 1, 'delay_minutes' => 5, 'user_ids' => [$this->admin->id], 'channels' => ['push']]],
    ]);

    $this->actingAs($this->admin)
        ->delete(route('escalation-chains.destroy', $chain))
        ->assertRedirect();

    expect(EscalationChain::find($chain->id))->toBeNull();
});

test('site_viewer is forbidden from store update and delete', function () {
    $viewer = createUserWithRole('client_site_viewer', $this->org);

    $chain = EscalationChain::create([
        'site_id' => $this->site->id,
        'name' => 'Test Chain',
        'levels' => [['level' => 1, 'delay_minutes' => 5, 'user_ids' => [$this->admin->id], 'channels' => ['push']]],
    ]);

    $this->actingAs($viewer)
        ->post(route('escalation-chains.store'), [
            'name' => 'Blocked',
            'site_id' => $this->site->id,
            'levels' => [
                [
                    'level' => 1,
                    'delay_minutes' => 0,
                    'user_ids' => [$this->admin->id],
                    'channels' => ['push'],
                ],
            ],
        ])
        ->assertForbidden();

    $this->actingAs($viewer)
        ->put(route('escalation-chains.update', $chain), [
            'name' => 'Blocked',
            'site_id' => $this->site->id,
            'levels' => [
                [
                    'level' => 1,
                    'delay_minutes' => 0,
                    'user_ids' => [$this->admin->id],
                    'channels' => ['push'],
                ],
            ],
        ])
        ->assertForbidden();

    $this->actingAs($viewer)
        ->delete(route('escalation-chains.destroy', $chain))
        ->assertForbidden();
});
