<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Astrea staff roles (super_admin, support, account_manager) have no org_id.
        // They see all orgs or can filter via session.
        if ($user->hasAnyRole(['super_admin', 'support', 'account_manager'])) {
            $orgId = session('current_org_id') ?? $request->header('X-Organization-Id');

            if ($orgId) {
                $org = Organization::find($orgId);
                if ($org) {
                    app()->instance('current_organization', $org);
                }
            }

            return $next($request);
        }

        if (! $user->org_id) {
            abort(403, 'No organization assigned.');
        }

        $org = Organization::find($user->org_id);

        if (! $org) {
            abort(403, 'Organization not found.');
        }

        app()->instance('current_organization', $org);

        return $next($request);
    }
}
