<?php

namespace App\Http\Controllers;

use App\Jobs\ExportOrganizationData;
use App\Models\DataExport;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DataExportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('export organization data'), 403);

        $exports = DataExport::when($user->org_id, fn ($q) => $q->forOrg($user->org_id))
            ->with('requestedByUser:id,name')
            ->latest()
            ->take(10)
            ->get();

        return Inertia::render('settings/export-data/index', [
            'exports' => $exports,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasPermissionTo('export organization data'), 403);

        // Rate limit: only 1 active export per org
        $activeExists = DataExport::forOrg($user->org_id)->active()->exists();
        abort_if($activeExists, 422, 'An export is already in progress.');

        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $export = DataExport::create([
            'org_id' => $user->org_id,
            'status' => 'queued',
            'date_from' => $validated['date_from'] ?? null,
            'date_to' => $validated['date_to'] ?? null,
            'requested_by' => $user->id,
        ]);

        ExportOrganizationData::dispatch($export->id);

        return back()->with('success', 'Export queued. You\'ll receive an email when it\'s ready.');
    }
}
