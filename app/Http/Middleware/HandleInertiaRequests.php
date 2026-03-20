<?php

namespace App\Http\Middleware;

use App\Models\OutageDeclaration;
use App\Models\Site;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $currentOrg = app()->bound('current_organization')
            ? app('current_organization')
            : null;

        $currentSiteId = session('current_site_id');
        $currentSite = null;
        if ($currentSiteId && $user) {
            $site = Site::find($currentSiteId);
            if ($site && $user->canAccessSite($site->id)) {
                $currentSite = [
                    'id' => $site->id,
                    'name' => $site->name,
                    'status' => $site->status,
                    'timezone' => $site->timezone,
                ];
            }
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'roles' => $user ? $user->getRoleNames() : [],
                'permissions' => $user
                    ? cache()->remember(
                        "user.{$user->id}.permissions",
                        now()->addMinutes(5),
                        fn () => $user->getAllPermissions()->pluck('name')
                    )
                    : [],
            ],
            'current_organization' => $currentOrg ? [
                'id' => $currentOrg->id,
                'name' => $currentOrg->name,
                'slug' => $currentOrg->slug,
                'segment' => $currentOrg->segment,
                'settings' => $currentOrg->settings,
                'logo' => $currentOrg->logo,
                'branding' => $currentOrg->branding,
                'default_timezone' => $currentOrg->default_timezone,
                'default_opening_hour' => $currentOrg->default_opening_hour?->format('H:i'),
            ] : null,
            'accessible_sites' => $user ? $user->accessibleSites()->map(fn ($site) => [
                'id' => $site->id,
                'name' => $site->name,
                'status' => $site->status,
            ])->values()->toArray() : [],
            'current_site' => $currentSite,
            'notifications' => $user
                ? $user->notifications()
                    ->latest()
                    ->take(10)
                    ->get()
                    ->map(fn ($notification) => [
                        'id' => $notification->id,
                        'type' => class_basename($notification->type),
                        'data' => $notification->data,
                        'read_at' => $notification->read_at?->toISOString(),
                        'created_at' => $notification->created_at->toISOString(),
                    ])
                : [],
            'unreadNotificationsCount' => $user ? $user->unreadNotifications()->count() : 0,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'locale' => app()->getLocale(),
            'active_outage' => OutageDeclaration::isActive()
                ? OutageDeclaration::current()?->only(['id', 'reason', 'affected_services', 'declared_at'])
                : null,
        ];
    }
}
