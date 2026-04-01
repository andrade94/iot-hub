<?php

namespace App\Http\Controllers;

use App\Enums\RoleDefinitions;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function index(Request $request)
    {
        $org = $this->resolveOrganization($request);
        $allOrgsMode = $org === null;

        if ($allOrgsMode) {
            // Super admin with no org context — show users from ALL organizations
            $users = User::with(['roles', 'sites:id,name', 'organization:id,name'])
                ->whereNotNull('org_id')
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'whatsapp_phone' => $user->whatsapp_phone,
                    'has_app_access' => $user->has_app_access,
                    'role' => $user->roles->first()?->name,
                    'sites' => $user->sites->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]),
                    'organization_name' => $user->organization?->name,
                    'deactivated_at' => $user->deactivated_at,
                    'created_at' => $user->created_at,
                ]);

            $sites = collect(); // Sites loaded per-org via API when creating users
        } else {
            $users = User::where('org_id', $org->id)
                ->with(['roles', 'sites:id,name'])
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'whatsapp_phone' => $user->whatsapp_phone,
                    'has_app_access' => $user->has_app_access,
                    'role' => $user->roles->first()?->name,
                    'sites' => $user->sites->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]),
                    'deactivated_at' => $user->deactivated_at,
                    'created_at' => $user->created_at,
                ]);

            $sites = Site::where('org_id', $org->id)
                ->select('id', 'name')
                ->orderBy('name')
                ->get();
        }

        // org_admin can only assign client roles; super_admin can assign all except super_admin
        $assignableRoles = $request->user()->hasRole('super_admin')
            ? collect(array_keys(RoleDefinitions::ROLES))->reject(fn ($r) => $r === 'super_admin')->values()
            : collect(RoleDefinitions::CLIENT_ASSIGNABLE);

        $roleOptions = $assignableRoles->map(fn ($r) => [
            'value' => $r,
            'label' => RoleDefinitions::label($r),
            'owner' => RoleDefinitions::owner($r),
        ]);

        return Inertia::render('settings/users/index', [
            'users' => $users,
            'sites' => $sites,
            'roles' => $assignableRoles,
            'roleOptions' => $roleOptions,
            'allOrgsMode' => $allOrgsMode,
            'organizations' => $allOrgsMode
                ? Organization::orderBy('name')->get(['id', 'name'])->map(fn ($o) => ['id' => $o->id, 'name' => $o->name])
                : [],
        ]);
    }

    public function store(Request $request)
    {
        // Super admins can specify org_id in the form
        if ($request->user()->hasRole('super_admin') && $request->filled('org_id')) {
            $org = Organization::findOrFail($request->input('org_id'));
        } else {
            $org = $this->resolveOrganization($request);
        }

        if (! $org) {
            return back()->with('error', 'Select an organization before creating users.');
        }

        $allowedRoles = $request->user()->hasRole('super_admin')
            ? ['client_org_admin', 'client_site_manager', 'client_site_viewer', 'technician']
            : RoleDefinitions::CLIENT_ASSIGNABLE;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users')],
            'phone' => 'nullable|string|max:30',
            'whatsapp_phone' => 'nullable|string|max:30',
            'password' => 'required|string|min:8',
            'role' => ['required', 'string', Rule::in($allowedRoles)],
            'site_ids' => 'nullable|array',
            'site_ids.*' => 'integer|exists:sites,id',
            'has_app_access' => 'boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'whatsapp_phone' => $validated['whatsapp_phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'org_id' => $org->id,
            'has_app_access' => $validated['has_app_access'] ?? false,
        ]);

        $user->assignRole($validated['role']);

        if (! empty($validated['site_ids'])) {
            $orgSiteIds = Site::where('org_id', $org->id)
                ->whereIn('id', $validated['site_ids'])
                ->pluck('id');

            $user->sites()->attach($orgSiteIds, [
                'assigned_at' => now(),
                'assigned_by' => $request->user()->id,
            ]);
        }

        return back()->with('success', 'User created successfully.');
    }

    public function update(Request $request, User $user)
    {
        $org = $this->resolveOrganization($request);

        // In all-orgs mode, super_admin can edit any user; otherwise check org ownership
        if ($org && $user->org_id !== $org->id) {
            abort(403);
        }

        $allowedRoles = $request->user()->hasRole('super_admin')
            ? ['client_org_admin', 'client_site_manager', 'client_site_viewer', 'technician']
            : RoleDefinitions::CLIENT_ASSIGNABLE;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|max:30',
            'whatsapp_phone' => 'nullable|string|max:30',
            'role' => ['required', 'string', Rule::in($allowedRoles)],
            'site_ids' => 'nullable|array',
            'site_ids.*' => 'integer|exists:sites,id',
            'has_app_access' => 'boolean',
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'whatsapp_phone' => $validated['whatsapp_phone'] ?? null,
            'has_app_access' => $validated['has_app_access'] ?? false,
        ]);

        $user->syncRoles([$validated['role']]);

        // Use user's own org for site scoping in all-orgs mode
        $scopeOrgId = $org?->id ?? $user->org_id;

        $orgSiteIds = Site::where('org_id', $scopeOrgId)
            ->whereIn('id', $validated['site_ids'] ?? [])
            ->pluck('id');

        $pivotData = $orgSiteIds->mapWithKeys(fn ($id) => [
            $id => [
                'assigned_at' => now(),
                'assigned_by' => $request->user()->id,
            ],
        ])->toArray();

        $user->sites()->sync($pivotData);

        return back()->with('success', 'User updated successfully.');
    }

    public function destroy(Request $request, User $user)
    {
        $org = $this->resolveOrganization($request);

        // In all-orgs mode, super_admin can delete any user; otherwise check org ownership
        if ($org && $user->org_id !== $org->id) {
            abort(403);
        }

        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        $user->sites()->detach();
        $user->delete();

        return back()->with('success', 'User deleted successfully.');
    }

    public function deactivate(Request $request, User $user)
    {
        $org = $this->resolveOrganization($request);

        // In all-orgs mode, super_admin can deactivate any user; otherwise check org ownership
        if ($org && $user->org_id !== $org->id) {
            abort(403);
        }

        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot deactivate your own account.');
        }

        $service = app(\App\Services\Users\UserDeactivationService::class);
        $result = $service->deactivate($user, $request->user());

        $message = "User deactivated. {$result['work_orders_reassigned']} work order(s) unassigned.";
        if ($result['escalation_gaps'] > 0) {
            $message .= " {$result['escalation_gaps']} escalation chain gap(s) created — review chains.";
        }

        return back()->with('success', $message);
    }

    public function reactivate(Request $request, User $user)
    {
        $org = $this->resolveOrganization($request);

        // In all-orgs mode, super_admin can reactivate any user; otherwise check org ownership
        if ($org && $user->org_id !== $org->id) {
            abort(403);
        }

        $service = app(\App\Services\Users\UserDeactivationService::class);
        $service->reactivate($user, $request->user());

        return back()->with('success', 'User reactivated.');
    }

    private function resolveOrganization(Request $request): ?Organization
    {
        if (app()->bound('current_organization')) {
            return app('current_organization');
        }

        $user = $request->user();

        if ($user->org_id) {
            return Organization::findOrFail($user->org_id);
        }

        // super_admin without org_id — try session org switcher, return null for all-orgs mode
        if ($user->hasRole('super_admin')) {
            $sessionOrgId = session('current_org_id');
            if ($sessionOrgId) {
                return Organization::findOrFail($sessionOrgId);
            }

            return null; // All orgs mode
        }

        abort(403, 'No organization selected.');
    }
}
