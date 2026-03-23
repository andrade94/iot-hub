<?php

namespace App\Services\Users;

use App\Models\EscalationChain;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Facades\Log;

class UserDeactivationService
{
    public function deactivate(User $user, User $deactivatedBy): array
    {
        $result = ['work_orders_reassigned' => 0, 'escalation_gaps' => 0];

        // Block login
        $user->update(['deactivated_at' => now()]);

        // Reassign open work orders to unassigned (site_manager can reassign)
        $reassigned = WorkOrder::where('assigned_to', $user->id)
            ->whereIn('status', ['open', 'assigned', 'in_progress'])
            ->update(['assigned_to' => null, 'status' => 'open']);
        $result['work_orders_reassigned'] = $reassigned;

        // Remove from escalation chains
        $chains = EscalationChain::all();
        foreach ($chains as $chain) {
            $levels = $chain->levels ?? [];
            $modified = false;

            foreach ($levels as $i => $level) {
                $userIds = $level['user_ids'] ?? [];
                if (in_array($user->id, $userIds)) {
                    $levels[$i]['user_ids'] = array_values(array_filter($userIds, fn ($id) => $id !== $user->id));
                    $modified = true;
                    $result['escalation_gaps']++;
                }
            }

            if ($modified) {
                $chain->update(['levels' => $levels]);
            }
        }

        // Activity log
        activity()
            ->performedOn($user)
            ->causedBy($deactivatedBy)
            ->withProperties([
                'work_orders_reassigned' => $result['work_orders_reassigned'],
                'escalation_gaps' => $result['escalation_gaps'],
            ])
            ->log('User deactivated');

        Log::info("User deactivated: {$user->name} (ID: {$user->id}) by {$deactivatedBy->name}", $result);

        return $result;
    }

    public function reactivate(User $user, User $reactivatedBy): void
    {
        $user->update(['deactivated_at' => null]);

        activity()
            ->performedOn($user)
            ->causedBy($reactivatedBy)
            ->log('User reactivated');
    }
}
