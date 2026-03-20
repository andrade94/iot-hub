<?php

namespace App\Policies;

use App\Models\Alert;
use App\Models\CorrectiveAction;
use App\Models\User;

class CorrectiveActionPolicy
{
    public function create(User $user, Alert $alert): bool
    {
        return $user->hasPermissionTo('log corrective actions')
            && in_array($alert->severity, ['critical', 'high'])
            && $user->canAccessSite($alert->site_id);
    }

    public function verify(User $user, CorrectiveAction $action): bool
    {
        return $user->hasPermissionTo('verify corrective actions')
            && $action->taken_by !== $user->id
            && $action->status === 'logged'
            && $user->canAccessSite($action->site_id);
    }
}
