<?php

use App\Models\User;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->admin = createUserWithRole('org_admin', $this->org);

    // Bind the org in the container (the org.scope middleware does this normally)
    app()->instance('current_organization', $this->org);
});

// ──────────────────────────────────────────────────────────────────────
// Auth & Permission
// ──────────────────────────────────────────────────────────────────────

test('guest is redirected to login', function () {
    $this->get(route('users.index'))
        ->assertRedirect(route('login'));
});

test('user without manage users permission gets 403', function () {
    $viewer = createUserWithRole('site_viewer', $this->org);

    $this->actingAs($viewer)
        ->get(route('users.index'))
        ->assertForbidden();
});

test('org_admin can access user management', function () {
    $this->actingAs($this->admin)
        ->get(route('users.index'))
        ->assertOk();
});

// ──────────────────────────────────────────────────────────────────────
// Index
// ──────────────────────────────────────────────────────────────────────

test('org_admin can list users', function () {
    $this->actingAs($this->admin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/users/index')
            ->has('users')
            ->has('sites')
            ->has('roles')
        );
});

test('only shows users from the current org', function () {
    // Create a user in this org
    $orgUser = createUserWithRole('site_viewer', $this->org);

    // Create a user in another org
    $otherOrg = createOrg(['name' => 'Other Org']);
    $otherUser = createUserWithRole('site_viewer', $otherOrg);

    $response = $this->actingAs($this->admin)
        ->get(route('users.index'))
        ->assertOk();

    $users = $response->original->getData()['page']['props']['users'];
    $ids = collect($users)->pluck('id')->all();

    expect($ids)->toContain($this->admin->id)
        ->toContain($orgUser->id)
        ->not->toContain($otherUser->id);
});

// ──────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────

test('org_admin can create a new user with valid data', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('users.store'), [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'role' => 'site_viewer',
            'site_ids' => [$this->site->id],
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success', 'User created successfully.');

    $user = User::where('email', 'newuser@example.com')->first();
    expect($user)->not->toBeNull();
    expect($user->name)->toBe('New User');
});

test('store validates required fields', function () {
    $this->actingAs($this->admin)
        ->post(route('users.store'), [])
        ->assertSessionHasErrors(['name', 'email', 'password', 'role']);
});

test('store validates unique email', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $this->actingAs($this->admin)
        ->post(route('users.store'), [
            'name' => 'Duplicate',
            'email' => 'taken@example.com',
            'password' => 'password123',
            'role' => 'site_viewer',
        ])
        ->assertSessionHasErrors(['email']);
});

test('store validates role is one of the allowed values', function () {
    $this->actingAs($this->admin)
        ->post(route('users.store'), [
            'name' => 'Bad Role',
            'email' => 'badrole@example.com',
            'password' => 'password123',
            'role' => 'super_admin',
        ])
        ->assertSessionHasErrors(['role']);
});

test('created user gets assigned to correct org', function () {
    $this->actingAs($this->admin)
        ->post(route('users.store'), [
            'name' => 'Org User',
            'email' => 'orguser@example.com',
            'password' => 'password123',
            'role' => 'site_viewer',
        ]);

    $user = User::where('email', 'orguser@example.com')->first();
    expect($user->org_id)->toBe($this->org->id);
});

test('created user gets assigned role', function () {
    $this->actingAs($this->admin)
        ->post(route('users.store'), [
            'name' => 'Role User',
            'email' => 'roleuser@example.com',
            'password' => 'password123',
            'role' => 'technician',
        ]);

    $user = User::where('email', 'roleuser@example.com')->first();
    expect($user->hasRole('technician'))->toBeTrue();
});

test('created user gets attached to specified sites', function () {
    $site2 = createSite($this->org, ['name' => 'Second Site']);

    $this->actingAs($this->admin)
        ->post(route('users.store'), [
            'name' => 'Site User',
            'email' => 'siteuser@example.com',
            'password' => 'password123',
            'role' => 'site_viewer',
            'site_ids' => [$this->site->id, $site2->id],
        ]);

    $user = User::where('email', 'siteuser@example.com')->first();
    expect($user->sites)->toHaveCount(2);
    expect($user->sites->pluck('id')->sort()->values()->all())
        ->toBe(collect([$this->site->id, $site2->id])->sort()->values()->all());
});

// ──────────────────────────────────────────────────────────────────────
// Update
// ──────────────────────────────────────────────────────────────────────

test('org_admin can update a user in their org', function () {
    $user = createUserWithRole('site_viewer', $this->org);

    $this->actingAs($this->admin)
        ->put(route('users.update', $user), [
            'name' => 'Updated Name',
            'email' => $user->email,
            'role' => 'site_viewer',
            'site_ids' => [],
        ])
        ->assertRedirect()
        ->assertSessionHas('success', 'User updated successfully.');

    $user->refresh();
    expect($user->name)->toBe('Updated Name');
});

test('cannot update a user from another org', function () {
    $otherOrg = createOrg(['name' => 'Other Org']);
    $otherUser = createUserWithRole('site_viewer', $otherOrg);

    $this->actingAs($this->admin)
        ->put(route('users.update', $otherUser), [
            'name' => 'Hacked Name',
            'email' => $otherUser->email,
            'role' => 'site_viewer',
            'site_ids' => [],
        ])
        ->assertForbidden();
});

test('update syncs roles', function () {
    $user = createUserWithRole('site_viewer', $this->org);

    $this->actingAs($this->admin)
        ->put(route('users.update', $user), [
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'site_manager',
            'site_ids' => [],
        ]);

    $user->refresh();
    expect($user->hasRole('site_manager'))->toBeTrue();
    expect($user->hasRole('site_viewer'))->toBeFalse();
});

test('update syncs site assignments', function () {
    $user = createUserWithRole('site_viewer', $this->org);
    $user->sites()->attach($this->site->id, ['assigned_at' => now()]);

    $site2 = createSite($this->org, ['name' => 'New Site']);

    $this->actingAs($this->admin)
        ->put(route('users.update', $user), [
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'site_viewer',
            'site_ids' => [$site2->id],
        ]);

    $user->refresh();
    expect($user->sites)->toHaveCount(1);
    expect($user->sites->first()->id)->toBe($site2->id);
});

// ──────────────────────────────────────────────────────────────────────
// Destroy
// ──────────────────────────────────────────────────────────────────────

test('org_admin can delete a user in their org', function () {
    $user = createUserWithRole('site_viewer', $this->org);

    $this->actingAs($this->admin)
        ->delete(route('users.destroy', $user))
        ->assertRedirect()
        ->assertSessionHas('success', 'User deleted successfully.');

    expect(User::find($user->id))->toBeNull();
});

test('cannot delete user from another org', function () {
    $otherOrg = createOrg(['name' => 'Other Org']);
    $otherUser = createUserWithRole('site_viewer', $otherOrg);

    $this->actingAs($this->admin)
        ->delete(route('users.destroy', $otherUser))
        ->assertForbidden();
});

test('cannot delete yourself', function () {
    $this->actingAs($this->admin)
        ->delete(route('users.destroy', $this->admin))
        ->assertRedirect()
        ->assertSessionHas('error', 'You cannot delete your own account.');

    expect(User::find($this->admin->id))->not->toBeNull();
});

test('deleted user site assignments are detached', function () {
    $user = createUserWithRole('site_viewer', $this->org);
    $user->sites()->attach($this->site->id, ['assigned_at' => now()]);

    // Verify site assignment exists before deletion
    expect($user->sites)->toHaveCount(1);

    $userId = $user->id;

    $this->actingAs($this->admin)
        ->delete(route('users.destroy', $user))
        ->assertRedirect();

    // User is deleted
    expect(User::find($userId))->toBeNull();

    // Site pivot records are cleaned up
    expect(
        \Illuminate\Support\Facades\DB::table('user_sites')
            ->where('user_id', $userId)
            ->count()
    )->toBe(0);
});
