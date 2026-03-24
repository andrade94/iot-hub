<?php

use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->user = createUserWithRole('client_org_admin', $this->org);
});

function createNotification($user, array $attrs = []): DatabaseNotification
{
    return DatabaseNotification::create(array_merge([
        'id' => Str::uuid()->toString(),
        'type' => 'App\Notifications\SystemNotification',
        'notifiable_type' => get_class($user),
        'notifiable_id' => $user->id,
        'data' => ['message' => 'Test notification'],
    ], $attrs));
}

test('user can view notifications', function () {
    createNotification($this->user);

    $this->actingAs($this->user)
        ->get(route('notifications'))
        ->assertOk();
});

test('notifications can be filtered by unread', function () {
    createNotification($this->user);
    createNotification($this->user, ['read_at' => now()]);

    $this->actingAs($this->user)
        ->get(route('notifications', ['filter' => 'unread']))
        ->assertOk();
});

test('notifications can be filtered by read', function () {
    createNotification($this->user, ['read_at' => now()]);

    $this->actingAs($this->user)
        ->get(route('notifications', ['filter' => 'read']))
        ->assertOk();
});

test('user can get unread count', function () {
    createNotification($this->user);
    createNotification($this->user);

    $this->actingAs($this->user)
        ->get(route('notifications.unread-count'))
        ->assertOk()
        ->assertJson(['count' => 2]);
});

test('user can mark notification as read', function () {
    $notification = createNotification($this->user);

    $this->actingAs($this->user)
        ->post(route('notifications.mark-as-read', $notification->id))
        ->assertOk()
        ->assertJson(['success' => true]);

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('user can mark all notifications as read', function () {
    createNotification($this->user);
    createNotification($this->user);

    $this->actingAs($this->user)
        ->post(route('notifications.mark-all-as-read'))
        ->assertOk()
        ->assertJson(['success' => true]);

    expect($this->user->unreadNotifications()->count())->toBe(0);
});

test('user can delete a notification', function () {
    $notification = createNotification($this->user);

    $this->actingAs($this->user)
        ->delete(route('notifications.destroy', $notification->id))
        ->assertRedirect();

    expect(DatabaseNotification::find($notification->id))->toBeNull();
});

test('user can delete all read notifications', function () {
    createNotification($this->user, ['read_at' => now()]);
    createNotification($this->user, ['read_at' => now()]);
    $unread = createNotification($this->user);

    $this->actingAs($this->user)
        ->delete(route('notifications.delete-read'))
        ->assertRedirect();

    expect($this->user->notifications()->count())->toBe(1);
    expect(DatabaseNotification::find($unread->id))->not->toBeNull();
});

test('guest is redirected from notifications', function () {
    $this->get(route('notifications'))
        ->assertRedirect(route('login'));
});
