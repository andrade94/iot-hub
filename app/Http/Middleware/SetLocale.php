<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Available locales for the application
     *
     * @var array<string>
     */
    protected array $availableLocales = ['en', 'es'];

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Priority order for determining locale:
        // 1. Session (user preference)
        // 2. User model (authenticated user's preference)
        // 3. Request header (Accept-Language)
        // 4. App default

        $locale = $this->determineLocale($request);

        if ($this->isValidLocale($locale)) {
            App::setLocale($locale);
        }

        return $next($request);
    }

    /**
     * Determine the locale based on priority
     */
    protected function determineLocale(Request $request): string
    {
        // 1. Check session for user preference
        if (Session::has('locale')) {
            return Session::get('locale');
        }

        // 2. Check authenticated user's preference
        if ($request->user() && method_exists($request->user(), 'getLocale')) {
            $userLocale = $request->user()->getLocale();
            if ($userLocale) {
                return $userLocale;
            }
        }

        // 3. Check request header (browser language preference)
        $headerLocale = $request->getPreferredLanguage($this->availableLocales);
        if ($headerLocale) {
            return $headerLocale;
        }

        // 4. Use app default
        return config('app.locale', 'en');
    }

    /**
     * Check if the locale is valid
     */
    protected function isValidLocale(string $locale): bool
    {
        return in_array($locale, $this->availableLocales, true);
    }
}
