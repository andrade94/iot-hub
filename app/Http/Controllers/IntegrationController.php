<?php

namespace App\Http\Controllers;

use App\Models\IntegrationConfig;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IntegrationController extends Controller
{
    public function index(Request $request)
    {
        $orgId = $request->user()->org_id;

        $integrations = IntegrationConfig::where('org_id', $orgId)
            ->latest()
            ->get();

        return Inertia::render('settings/integrations', [
            'integrations' => $integrations,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|string|in:sap,contpaq',
            'config' => 'nullable|array',
            'schedule_cron' => 'nullable|string|max:100',
            'active' => 'sometimes|boolean',
        ]);

        $orgId = $request->user()->org_id;

        // Upsert: if an integration of this type already exists for the org, update it
        IntegrationConfig::updateOrCreate(
            [
                'org_id' => $orgId,
                'type' => $validated['type'],
            ],
            [
                'config' => $validated['config'] ?? null,
                'schedule_cron' => $validated['schedule_cron'] ?? null,
                'active' => $validated['active'] ?? true,
            ],
        );

        return back()->with('success', 'Integration configuration saved.');
    }
}
