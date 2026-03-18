<?php

namespace App\Policies;

use App\Models\Device;
use App\Models\User;

class DevicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view devices');
    }

    public function view(User $user, Device $device): bool
    {
        return $user->hasPermissionTo('view devices')
            && $user->canAccessSite($device->site_id);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage devices');
    }

    public function update(User $user, Device $device): bool
    {
        return $user->hasPermissionTo('manage devices');
    }

    public function delete(User $user, Device $device): bool
    {
        return $user->hasPermissionTo('manage devices');
    }
}
