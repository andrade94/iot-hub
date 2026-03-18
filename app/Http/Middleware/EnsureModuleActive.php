<?php

namespace App\Http\Middleware;

use App\Models\Site;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleActive
{
    /**
     * Verify the requested module is activated for the site.
     * Expects route parameter 'site' and a 'module' parameter passed via middleware.
     */
    public function handle(Request $request, Closure $next, string $moduleSlug): Response
    {
        $site = $request->route('site');

        if ($site instanceof Site) {
            $isActive = $site->modules()
                ->where('slug', $moduleSlug)
                ->wherePivot('activated_at', '!=', null)
                ->exists();

            if (! $isActive) {
                if ($request->wantsJson()) {
                    return response()->json(['message' => 'Module not activated for this site.'], 403);
                }

                return redirect()->route('sites.show', $site)
                    ->with('warning', "The {$moduleSlug} module is not activated for this site.");
            }
        }

        return $next($request);
    }
}
