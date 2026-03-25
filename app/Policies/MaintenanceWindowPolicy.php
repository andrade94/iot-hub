<?php

namespace App\Policies;

use App\Models\MaintenanceWindow;
use App\Models\User;

class MaintenanceWindowPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage maintenance windows');
    }

    public function view(User $user, MaintenanceWindow $maintenanceWindow): bool
    {
        return $user->hasPermissionTo('manage maintenance windows')
            && $user->canAccessSite($maintenanceWindow->site_id);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage maintenance windows');
    }

    public function update(User $user, MaintenanceWindow $maintenanceWindow): bool
    {
        return $user->hasPermissionTo('manage maintenance windows')
            && $user->canAccessSite($maintenanceWindow->site_id);
    }

    public function delete(User $user, MaintenanceWindow $maintenanceWindow): bool
    {
        return $user->hasPermissionTo('manage maintenance windows')
            && $user->canAccessSite($maintenanceWindow->site_id);
    }
}
