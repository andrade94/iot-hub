<?php

namespace App\Policies;

use App\Models\BillingProfile;
use App\Models\User;

class BillingPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage org settings');
    }

    public function view(User $user, BillingProfile $billingProfile): bool
    {
        return $user->hasPermissionTo('manage org settings');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage org settings');
    }
}
