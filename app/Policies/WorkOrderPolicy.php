<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrder;

class WorkOrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view work orders');
    }

    public function view(User $user, WorkOrder $workOrder): bool
    {
        if (! $user->hasPermissionTo('view work orders')) {
            return false;
        }

        return $user->isSuperAdmin() || $user->canAccessSite($workOrder->site_id);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage work orders');
    }

    public function update(User $user, WorkOrder $workOrder): bool
    {
        if (! $user->hasPermissionTo('manage work orders')) {
            return false;
        }

        return $user->isSuperAdmin() || $user->canAccessSite($workOrder->site_id);
    }

    public function complete(User $user, WorkOrder $workOrder): bool
    {
        if (! $user->hasPermissionTo('complete work orders')) {
            return false;
        }

        return $user->isSuperAdmin() || $user->canAccessSite($workOrder->site_id);
    }

    public function delete(User $user, WorkOrder $workOrder): bool
    {
        if (! $user->hasPermissionTo('manage work orders')) {
            return false;
        }

        return $user->isSuperAdmin() || $user->canAccessSite($workOrder->site_id);
    }
}
