<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ApplyOrgBranding
{
    /**
     * Read the current organization's branding and share CSS custom properties
     * plus the org logo URL as Inertia props.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $branding = null;
        $orgLogoUrl = null;

        if (app()->bound('current_organization')) {
            $org = app('current_organization');
            $rawBranding = $org->branding;

            if (is_array($rawBranding) && ! empty($rawBranding)) {
                $branding = [
                    'primary_color' => $rawBranding['primary_color'] ?? null,
                    'secondary_color' => $rawBranding['secondary_color'] ?? null,
                    'accent_color' => $rawBranding['accent_color'] ?? null,
                    'font_family' => $rawBranding['font_family'] ?? null,
                    'css_variables' => $this->buildCssVariables($rawBranding),
                ];
            }

            if ($org->logo) {
                $orgLogoUrl = str_starts_with($org->logo, 'http')
                    ? $org->logo
                    : asset('storage/' . $org->logo);
            }
        }

        Inertia::share('branding', $branding);
        Inertia::share('org_logo_url', $orgLogoUrl);

        return $next($request);
    }

    /**
     * Build a map of CSS custom property names to values from the branding array.
     *
     * @param  array<string, mixed>  $branding
     * @return array<string, string>
     */
    protected function buildCssVariables(array $branding): array
    {
        $variables = [];

        if (! empty($branding['primary_color'])) {
            $variables['--brand-primary'] = $branding['primary_color'];
        }

        if (! empty($branding['secondary_color'])) {
            $variables['--brand-secondary'] = $branding['secondary_color'];
        }

        if (! empty($branding['accent_color'])) {
            $variables['--brand-accent'] = $branding['accent_color'];
        }

        if (! empty($branding['font_family'])) {
            $variables['--brand-font'] = $branding['font_family'];
        }

        return $variables;
    }
}
