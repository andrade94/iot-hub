<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class OrganizationCatalogController extends Controller
{
    public function index()
    {
        $organizations = Organization::withCount(['sites', 'users'])
            ->addSelect([
                'devices_count' => \App\Models\Device::selectRaw('COUNT(*)')
                    ->join('sites', 'sites.id', '=', 'devices.site_id')
                    ->whereColumn('sites.org_id', 'organizations.id'),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn ($org) => [
                'id' => $org->id,
                'name' => $org->name,
                'slug' => $org->slug,
                'logo' => $org->logo,
                'segment' => $org->segment,
                'plan' => $org->plan,
                'status' => $org->status ?? 'active',
                'sites_count' => $org->sites_count,
                'devices_count' => (int) $org->devices_count,
                'users_count' => $org->users_count,
                'created_at' => $org->created_at->toIso8601String(),
            ]);

        return Inertia::render('settings/organizations/index', [
            'organizations' => $organizations,
            'segments' => \App\Models\Segment::active()->pluck('name'),
            'timezones' => timezone_identifiers_list(\DateTimeZone::AMERICA),
        ]);
    }

    public function show(Organization $organization)
    {
        $organization->load([
            'sites' => function ($query) {
                $query->withCount([
                    'devices',
                    'gateways',
                    'devices as online_devices_count' => fn ($q) => $q->where('last_reading_at', '>=', now()->subMinutes(15)),
                    'alerts as active_alerts_count' => fn ($q) => $q->where('status', 'active'),
                    'alerts as critical_alerts_count' => fn ($q) => $q->where('severity', 'critical')->where('status', 'active'),
                    'workOrders as open_work_orders_count' => fn ($q) => $q->whereIn('status', ['open', 'assigned', 'in_progress']),
                ])->orderBy('name');
            },
            'users' => function ($query) {
                $query->orderBy('name');
            },
            'subscriptions' => function ($query) {
                $query->latest()->limit(1);
            },
            'notes' => function ($query) {
                $query->with('user:id,name')->latest()->limit(25);
            },
        ]);

        $sites = $organization->sites->map(fn ($site) => [
            'id' => $site->id,
            'name' => $site->name,
            'status' => $site->status,
            'timezone' => $site->timezone,
            'devices_count' => $site->devices_count,
            'gateways_count' => $site->gateways_count,
            'online_devices_count' => (int) $site->online_devices_count,
            'active_alerts_count' => (int) $site->active_alerts_count,
            'critical_alerts_count' => (int) $site->critical_alerts_count,
            'open_work_orders_count' => (int) $site->open_work_orders_count,
        ]);

        $users = $organization->users->map(fn ($user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name ?? 'none',
            'status' => $user->isDeactivated() ? 'inactive' : 'active',
        ]);

        $timezones = timezone_identifiers_list(\DateTimeZone::AMERICA);

        // Primary contact: first client_org_admin
        $primaryContact = $organization->users
            ->first(fn ($u) => $u->roles->contains('name', 'client_org_admin'));

        // Last user activity from sessions table
        $userIds = $organization->users->pluck('id');
        $lastActivity = $userIds->isNotEmpty()
            ? \DB::table('sessions')->whereIn('user_id', $userIds)->max('last_activity')
            : null;

        // Recent unresolved alerts across all org sites
        $siteIds = $organization->sites->pluck('id');
        $recentAlerts = $siteIds->isNotEmpty()
            ? \App\Models\Alert::whereIn('site_id', $siteIds)
                ->whereIn('status', ['active', 'acknowledged'])
                ->with(['device:id,name', 'site:id,name'])
                ->latest('triggered_at')
                ->limit(10)
                ->get()
                ->map(fn ($alert) => [
                    'id' => $alert->id,
                    'severity' => $alert->severity,
                    'status' => $alert->status,
                    'device_name' => $alert->device?->name ?? 'Unknown',
                    'site_name' => $alert->site?->name ?? 'Unknown',
                    'triggered_at' => $alert->triggered_at->toIso8601String(),
                    'metric' => $alert->data['metric'] ?? null,
                    'value' => $alert->data['value'] ?? null,
                    'threshold' => $alert->data['threshold'] ?? null,
                    'rule_name' => $alert->data['rule_name'] ?? null,
                ])
            : [];

        return Inertia::render('settings/organizations/show', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'segment' => $organization->segment,
                'plan' => $organization->plan,
                'status' => $organization->status ?? 'active',
                'logo' => $organization->logo,
                'branding' => $organization->branding,
                'default_timezone' => $organization->default_timezone,
                'created_at' => $organization->created_at->toIso8601String(),
            ],
            'sites' => $sites,
            'users' => $users,
            'subscription' => $organization->subscriptions->first(),
            'timezones' => $timezones,
            'segments' => \App\Models\Segment::active()->pluck('name'),
            'primary_contact' => $primaryContact ? [
                'id' => $primaryContact->id,
                'name' => $primaryContact->name,
                'email' => $primaryContact->email,
                'phone' => $primaryContact->phone ?? null,
            ] : null,
            'last_user_activity' => $lastActivity
                ? \Carbon\Carbon::createFromTimestamp($lastActivity)->toIso8601String()
                : null,
            'recent_alerts' => $recentAlerts,
            'notes' => $organization->notes->map(fn ($note) => [
                'id' => $note->id,
                'note' => $note->note,
                'created_at' => $note->created_at->toIso8601String(),
                'user' => ['id' => $note->user->id, 'name' => $note->user->name],
            ]),
        ]);
    }

    public function update(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:organizations,slug,' . $organization->id,
            'segment' => ['required', 'string', Rule::in(\App\Models\Segment::active()->pluck('name'))],
            'plan' => 'required|string|in:starter,standard,enterprise',
            'default_timezone' => 'nullable|string|max:50',
            'branding' => 'nullable|array',
            'branding.primary_color' => 'nullable|string|max:20',
            'branding.secondary_color' => 'nullable|string|max:20',
            'branding.accent_color' => 'nullable|string|max:20',
            'logo' => 'nullable|string|max:500',
        ]);

        // Merge branding with existing values
        if (isset($validated['branding'])) {
            $validated['branding'] = array_merge(
                $organization->branding ?? [],
                array_filter($validated['branding'])
            );
        }

        $organization->update($validated);

        return back()->with('success', "Organization '{$organization->name}' updated.");
    }

    public function suspend(Organization $organization)
    {
        if (! $organization->canTransitionTo('suspended')) {
            return back()->with('error', "Cannot suspend organization in '{$organization->status}' status.");
        }

        $organization->suspend();

        return back()->with('success', "Organization '{$organization->name}' suspended.");
    }

    public function reactivate(Organization $organization)
    {
        if ($organization->status !== 'suspended') {
            return back()->with('error', 'Only suspended organizations can be reactivated.');
        }

        $organization->reactivate();

        return back()->with('success', "Organization '{$organization->name}' reactivated.");
    }

    public function destroy(Organization $organization)
    {
        if (! $organization->canTransitionTo('archived')) {
            return back()->with('error', "Cannot archive organization in '{$organization->status}' status.");
        }

        $organization->archive();

        return redirect()->route('organizations.index')->with('success', "Organization '{$organization->name}' archived.");
    }

    public function storeNote(Request $request, Organization $organization)
    {
        $validated = $request->validate(['note' => 'required|string|max:2000']);

        $organization->notes()->create([
            'user_id' => auth()->id(),
            'note' => $validated['note'],
        ]);

        return back()->with('success', 'Note added.');
    }

    public function destroyNote(Organization $organization, \App\Models\OrganizationNote $note)
    {
        abort_unless($note->org_id === $organization->id, 404);
        $note->delete();

        return back()->with('success', 'Note deleted.');
    }

    public function export(Organization $organization)
    {
        $activeExists = \App\Models\DataExport::where('org_id', $organization->id)
            ->whereIn('status', ['queued', 'processing'])
            ->exists();

        if ($activeExists) {
            return back()->with('error', 'An export is already in progress for this organization.');
        }

        $export = \App\Models\DataExport::create([
            'org_id' => $organization->id,
            'status' => 'queued',
            'requested_by' => auth()->id(),
        ]);

        \App\Jobs\ExportOrganizationData::dispatch($export->id);

        return back()->with('success', "Export queued for '{$organization->name}'. You'll be notified when it's ready.");
    }
}
