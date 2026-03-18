<?php

namespace App\Policies;

use App\Models\AlertRule;
use App\Models\User;

class AlertRulePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage alert rules');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage alert rules');
    }

    public function update(User $user, AlertRule $alertRule): bool
    {
        return $user->hasPermissionTo('manage alert rules');
    }

    public function delete(User $user, AlertRule $alertRule): bool
    {
        return $user->hasPermissionTo('manage alert rules');
    }
}
