<?php

namespace App\Policies;

use App\Models\Site;
use App\Models\User;

class SitePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view sites');
    }

    public function view(User $user, Site $site): bool
    {
        return $user->hasPermissionTo('view sites')
            && $user->canAccessSite($site->id);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage sites');
    }

    public function update(User $user, Site $site): bool
    {
        return $user->hasPermissionTo('manage sites');
    }

    public function delete(User $user, Site $site): bool
    {
        return $user->hasPermissionTo('manage sites');
    }
}
