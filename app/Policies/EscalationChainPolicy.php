<?php

namespace App\Policies;

use App\Models\EscalationChain;
use App\Models\User;

class EscalationChainPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage alert rules');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage alert rules');
    }

    public function update(User $user, EscalationChain $escalationChain): bool
    {
        return $user->hasPermissionTo('manage alert rules');
    }

    public function delete(User $user, EscalationChain $escalationChain): bool
    {
        return $user->hasPermissionTo('manage alert rules');
    }
}
