<?php

namespace App\Http\Controllers;

use App\Models\EscalationChain;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EscalationChainController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super_admin');

        $chains = EscalationChain::with('site')
            ->when(! $isSuperAdmin, fn ($q) => $q->whereHas('site', fn ($sq) => $sq->where('org_id', $user->org_id)))
            ->latest()
            ->get();

        $accessibleSites = $user->accessibleSites();
        $sites = $accessibleSites->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        // Users grouped by site for filtered selection in the form
        $siteUsers = [];
        foreach ($accessibleSites as $site) {
            $siteUsers[$site->id] = $site->users()
                ->select('users.id', 'users.name')
                ->orderBy('users.name')
                ->get()
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])
                ->values();
        }

        return Inertia::render('settings/escalation-chains/index', [
            'chains' => $chains,
            'sites' => $sites,
            'siteUsers' => $siteUsers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'site_id' => 'required|exists:sites,id',
            'levels' => 'required|array|min:1',
            'levels.*.level' => 'required|integer|min:1',
            'levels.*.delay_minutes' => 'required|integer|min:0',
            'levels.*.user_ids' => 'required|array|min:1',
            'levels.*.channels' => 'required|array|min:1',
        ]);

        // One chain per site — replace existing if present
        $existing = EscalationChain::where('site_id', $validated['site_id'])->first();
        if ($existing) {
            $existing->update($validated);

            return back()->with('success', "Escalation chain for this site updated.");
        }

        EscalationChain::create($validated);

        return back()->with('success', "Escalation chain '{$validated['name']}' created.");
    }

    public function update(Request $request, EscalationChain $escalationChain)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'site_id' => 'required|exists:sites,id',
            'levels' => 'required|array|min:1',
            'levels.*.level' => 'required|integer|min:1',
            'levels.*.delay_minutes' => 'required|integer|min:0',
            'levels.*.user_ids' => 'required|array|min:1',
            'levels.*.channels' => 'required|array|min:1',
        ]);

        $escalationChain->update($validated);

        return back()->with('success', 'Escalation chain updated.');
    }

    public function destroy(EscalationChain $escalationChain)
    {
        $name = $escalationChain->name;
        $escalationChain->delete();

        return back()->with('success', "Escalation chain '{$name}' deleted.");
    }
}
