<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePrivacyConsent
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Skip for the privacy acceptance page itself
        if ($request->routeIs('privacy.*')) {
            return $next($request);
        }

        $currentVersion = config('app.privacy_policy_version', '1.0');

        if ($user->privacy_policy_version !== $currentVersion) {
            return redirect()->route('privacy.show');
        }

        return $next($request);
    }
}
