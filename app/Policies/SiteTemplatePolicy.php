<?php

namespace App\Policies;

use App\Models\SiteTemplate;
use App\Models\User;

class SiteTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage site templates');
    }

    public function view(User $user, SiteTemplate $siteTemplate): bool
    {
        return $user->hasPermissionTo('manage site templates')
            && $this->belongsToUserOrg($user, $siteTemplate);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage site templates');
    }

    public function delete(User $user, SiteTemplate $siteTemplate): bool
    {
        return $user->hasPermissionTo('manage site templates')
            && $this->belongsToUserOrg($user, $siteTemplate);
    }

    /**
     * Check if the template belongs to the user's organization.
     */
    private function belongsToUserOrg(User $user, SiteTemplate $siteTemplate): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->belongsToOrg($siteTemplate->org_id);
    }
}
