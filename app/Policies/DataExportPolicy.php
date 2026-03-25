<?php

namespace App\Policies;

use App\Models\DataExport;
use App\Models\User;

class DataExportPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('export organization data');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('export organization data');
    }
}
