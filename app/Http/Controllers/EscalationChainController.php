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
        $orgId = $user->org_id;

        $chains = EscalationChain::with('site')
            ->whereHas('site', fn ($q) => $q->where('org_id', $orgId))
            ->latest()
            ->get();

        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        $users = User::where('org_id', $orgId)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('settings/escalation-chains/index', [
            'chains' => $chains,
            'sites' => $sites,
            'users' => $users,
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
