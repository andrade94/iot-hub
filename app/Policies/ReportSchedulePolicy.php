<?php

namespace App\Policies;

use App\Models\ReportSchedule;
use App\Models\User;

class ReportSchedulePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage report schedules');
    }

    public function view(User $user, ReportSchedule $reportSchedule): bool
    {
        return $user->hasPermissionTo('manage report schedules')
            && $this->belongsToUserOrg($user, $reportSchedule);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage report schedules');
    }

    public function update(User $user, ReportSchedule $reportSchedule): bool
    {
        return $user->hasPermissionTo('manage report schedules')
            && $this->belongsToUserOrg($user, $reportSchedule);
    }

    public function delete(User $user, ReportSchedule $reportSchedule): bool
    {
        return $user->hasPermissionTo('manage report schedules')
            && $this->belongsToUserOrg($user, $reportSchedule);
    }

    /**
     * Check if the report schedule belongs to the user's organization.
     * Handles both org-wide schedules (site_id null) and site-specific schedules.
     */
    private function belongsToUserOrg(User $user, ReportSchedule $reportSchedule): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->belongsToOrg($reportSchedule->org_id);
    }
}
