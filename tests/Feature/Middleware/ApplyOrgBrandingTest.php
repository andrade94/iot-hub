<?php

use App\Http\Middleware\ApplyOrgBranding;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->admin = createUserWithRole('client_org_admin', $this->org);
});

test('shares branding props when organization has branding', function () {
    $this->org->update([
        'branding' => [
            'primary_color' => '#1a56db',
            'secondary_color' => '#7e22ce',
            'accent_color' => '#f59e0b',
            'font_family' => 'Inter',
        ],
    ]);

    app()->instance('current_organization', $this->org);

    $middleware = new ApplyOrgBranding;

    $request = Request::create('/dashboard', 'GET');
    $request->setUserResolver(fn () => $this->admin);

    $shared = null;
    $middleware->handle($request, function () use (&$shared) {
        $shared = Inertia::getShared();

        return response('OK');
    });

    expect($shared)->toHaveKey('branding');

    $branding = value($shared['branding']);
    expect($branding)->not->toBeNull();
    expect($branding['primary_color'])->toBe('#1a56db');
    expect($branding['secondary_color'])->toBe('#7e22ce');
    expect($branding['accent_color'])->toBe('#f59e0b');
    expect($branding['font_family'])->toBe('Inter');
    expect($branding['css_variables'])->toHaveKey('--brand-primary');
    expect($branding['css_variables']['--brand-primary'])->toBe('#1a56db');
});

test('shares default null branding when organization has no branding', function () {
    $this->org->update(['branding' => []]);

    app()->instance('current_organization', $this->org);

    $middleware = new ApplyOrgBranding;

    $request = Request::create('/dashboard', 'GET');
    $request->setUserResolver(fn () => $this->admin);

    $shared = null;
    $middleware->handle($request, function () use (&$shared) {
        $shared = Inertia::getShared();

        return response('OK');
    });

    $branding = value($shared['branding']);
    expect($branding)->toBeNull();
});

test('handles null organization gracefully', function () {
    // Do NOT bind 'current_organization' to the container
    if (app()->bound('current_organization')) {
        app()->forgetInstance('current_organization');
    }

    $middleware = new ApplyOrgBranding;

    $request = Request::create('/dashboard', 'GET');
    $request->setUserResolver(fn () => $this->admin);

    $shared = null;
    $middleware->handle($request, function () use (&$shared) {
        $shared = Inertia::getShared();

        return response('OK');
    });

    $branding = value($shared['branding']);
    expect($branding)->toBeNull();

    $logoUrl = value($shared['org_logo_url']);
    expect($logoUrl)->toBeNull();
});

test('shares org logo URL when organization has a logo', function () {
    $this->org->update([
        'logo' => 'logos/acme-corp.png',
        'branding' => [],
    ]);

    app()->instance('current_organization', $this->org);

    $middleware = new ApplyOrgBranding;

    $request = Request::create('/dashboard', 'GET');
    $request->setUserResolver(fn () => $this->admin);

    $shared = null;
    $middleware->handle($request, function () use (&$shared) {
        $shared = Inertia::getShared();

        return response('OK');
    });

    $logoUrl = value($shared['org_logo_url']);
    expect($logoUrl)->toContain('logos/acme-corp.png');
});

test('shares full URL when logo is an absolute URL', function () {
    $this->org->update([
        'logo' => 'https://cdn.example.com/logos/acme.png',
        'branding' => [],
    ]);

    app()->instance('current_organization', $this->org);

    $middleware = new ApplyOrgBranding;

    $request = Request::create('/dashboard', 'GET');
    $request->setUserResolver(fn () => $this->admin);

    $shared = null;
    $middleware->handle($request, function () use (&$shared) {
        $shared = Inertia::getShared();

        return response('OK');
    });

    $logoUrl = value($shared['org_logo_url']);
    expect($logoUrl)->toBe('https://cdn.example.com/logos/acme.png');
});

test('builds CSS variables only for non-empty branding fields', function () {
    $this->org->update([
        'branding' => [
            'primary_color' => '#ff0000',
            // secondary_color intentionally missing
            'accent_color' => '',
            'font_family' => null,
        ],
    ]);

    app()->instance('current_organization', $this->org);

    $middleware = new ApplyOrgBranding;

    $request = Request::create('/dashboard', 'GET');
    $request->setUserResolver(fn () => $this->admin);

    $shared = null;
    $middleware->handle($request, function () use (&$shared) {
        $shared = Inertia::getShared();

        return response('OK');
    });

    $branding = value($shared['branding']);
    expect($branding['css_variables'])->toHaveKey('--brand-primary');
    expect($branding['css_variables'])->not->toHaveKey('--brand-secondary');
    expect($branding['css_variables'])->not->toHaveKey('--brand-accent');
    expect($branding['css_variables'])->not->toHaveKey('--brand-font');
});
