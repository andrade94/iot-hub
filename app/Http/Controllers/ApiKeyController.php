<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ApiKeyController extends Controller
{
    public function index(Request $request)
    {
        $orgId = $request->user()->org_id;

        $apiKeys = ApiKey::where('org_id', $orgId)
            ->latest()
            ->get();

        return Inertia::render('settings/api-keys', [
            'apiKeys' => $apiKeys,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'permissions' => 'nullable|array',
            'rate_limit' => 'sometimes|integer|min:1|max:1000',
        ]);

        $rawKey = Str::random(64);

        $apiKey = ApiKey::create([
            'org_id' => $request->user()->org_id,
            'name' => $validated['name'],
            'key_hash' => hash('sha256', $rawKey),
            'permissions' => $validated['permissions'] ?? null,
            'rate_limit' => $validated['rate_limit'] ?? 60,
        ]);

        return back()->with('success', 'API key created.')->with('api_key', $rawKey);
    }

    public function destroy(Request $request, ApiKey $apiKey)
    {
        // Ensure the key belongs to the user's organization
        if ($apiKey->org_id !== $request->user()->org_id) {
            abort(403);
        }

        $apiKey->delete();

        return back()->with('success', 'API key deleted.');
    }
}
