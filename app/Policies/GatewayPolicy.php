<?php

namespace App\Policies;

use App\Models\Gateway;
use App\Models\Site;
use App\Models\User;

class GatewayPolicy
{
    public function viewAny(User $user, Site $site): bool
    {
        return $user->can('manage devices') && $user->canAccessSite($site->id);
    }

    public function view(User $user, Gateway $gateway, Site $site): bool
    {
        return $user->can('manage devices') && $user->canAccessSite($site->id);
    }

    public function create(User $user, Site $site): bool
    {
        return $user->can('manage devices') && $user->canAccessSite($site->id);
    }

    public function delete(User $user, Gateway $gateway, Site $site): bool
    {
        return $user->can('manage devices') && $user->canAccessSite($site->id);
    }
}
