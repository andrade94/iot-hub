<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Illuminate\Notifications\DatabaseNotification;

class NotificationPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any notifications.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the notification.
     */
    public function view(User $user, DatabaseNotification $notification): bool
    {
        return $user->id === $notification->notifiable_id
            && $notification->notifiable_type === User::class;
    }

    /**
     * Determine whether the user can mark the notification as read.
     */
    public function update(User $user, DatabaseNotification $notification): bool
    {
        return $user->id === $notification->notifiable_id
            && $notification->notifiable_type === User::class;
    }

    /**
     * Determine whether the user can delete the notification.
     */
    public function delete(User $user, DatabaseNotification $notification): bool
    {
        return $user->id === $notification->notifiable_id
            && $notification->notifiable_type === User::class;
    }
}
