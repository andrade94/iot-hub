<?php

namespace App\Http\Controllers;

use App\Models\ComplianceEvent;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ComplianceCalendarController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;

        $query = ComplianceEvent::with('site')
            ->forOrg($orgId)
            ->orderBy('due_date');

        if ($request->filled('site_id')) {
            $query->forSite((int) $request->input('site_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $events = $query->get()->groupBy(fn ($event) => $event->due_date->format('Y-m'));

        $sites = $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]);

        $types = [
            'cofepris_audit' => 'COFEPRIS Audit',
            'certificate_renewal' => 'Certificate Renewal',
            'calibration' => 'Calibration',
            'inspection' => 'Inspection',
            'permit_renewal' => 'Permit Renewal',
        ];

        return Inertia::render('settings/compliance/index', [
            'events' => $events,
            'sites' => $sites,
            'types' => $types,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'type' => 'required|string|in:cofepris_audit,certificate_renewal,calibration,inspection,permit_renewal',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'due_date' => 'required|date|after_or_equal:today',
        ]);

        $validated['org_id'] = $request->user()->org_id;

        ComplianceEvent::create($validated);

        return back()->with('success', "Compliance event '{$validated['title']}' created.");
    }

    public function update(Request $request, ComplianceEvent $complianceEvent)
    {
        $validated = $request->validate([
            'site_id' => 'required|exists:sites,id',
            'type' => 'required|string|in:cofepris_audit,certificate_renewal,calibration,inspection,permit_renewal',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'due_date' => 'required|date',
        ]);

        $complianceEvent->update($validated);

        return back()->with('success', 'Compliance event updated.');
    }

    public function complete(Request $request, ComplianceEvent $complianceEvent)
    {
        $complianceEvent->update([
            'status' => 'completed',
            'completed_at' => now(),
            'completed_by' => $request->user()->name,
        ]);

        return back()->with('success', "'{$complianceEvent->title}' marked as completed.");
    }

    public function destroy(ComplianceEvent $complianceEvent)
    {
        $title = $complianceEvent->title;
        $complianceEvent->delete();

        return back()->with('success', "Compliance event '{$title}' deleted.");
    }
}
