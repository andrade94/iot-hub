<?php

namespace App\Policies;

use App\Models\Alert;
use App\Models\User;

class AlertPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view alerts');
    }

    public function view(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('view alerts');
    }

    public function acknowledge(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('acknowledge alerts');
    }

    public function resolve(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('acknowledge alerts');
    }

    public function dismiss(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('manage alert rules');
    }

    public function delete(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('manage alert rules');
    }
}
