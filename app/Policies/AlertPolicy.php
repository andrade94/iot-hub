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
        return $user->hasPermissionTo('view alerts')
            && ($user->isSuperAdmin() || $user->canAccessSite($alert->site_id));
    }

    public function acknowledge(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('acknowledge alerts')
            && ($user->isSuperAdmin() || $user->canAccessSite($alert->site_id));
    }

    public function resolve(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('acknowledge alerts')
            && ($user->isSuperAdmin() || $user->canAccessSite($alert->site_id));
    }

    public function dismiss(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('acknowledge alerts')
            && ($user->isSuperAdmin() || $user->canAccessSite($alert->site_id));
    }

    public function escalate(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('acknowledge alerts')
            && ($user->isSuperAdmin() || $user->canAccessSite($alert->site_id));
    }

    public function delete(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('manage alert rules')
            && ($user->isSuperAdmin() || $user->canAccessSite($alert->site_id));
    }
}
