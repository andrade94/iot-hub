<?php

namespace App\Http\Controllers;

use App\Models\BillingProfile;
use App\Models\Organization;
use App\Services\Billing\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PartnerController extends Controller
{
    public function index(Request $request)
    {
        $organizations = Organization::withCount('sites')
            ->orderBy('name')
            ->get();

        return Inertia::render('partner/index', [
            'organizations' => $organizations,
            'segments' => \App\Models\Segment::active()->pluck('name'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:organizations,slug',
            'segment' => ['required', 'string', Rule::in(\App\Models\Segment::active()->pluck('name'))],
            'plan' => 'required|string|in:starter,standard,enterprise',
            'default_timezone' => 'nullable|string|max:50',
            'default_opening_hour' => 'nullable|date_format:H:i',
        ]);

        $org = Organization::create($validated);

        // Billing deactivated for MVP — org created without subscription
        // To reactivate, uncomment and create BillingProfile + Subscription:
        // $profile = BillingProfile::create([
        //     'org_id' => $org->id,
        //     'name' => $org->name,
        //     'rfc' => 'XAXX010101000',
        //     'razon_social' => $org->name,
        //     'is_default' => true,
        // ]);
        // app(SubscriptionService::class)->createSubscription($org, $profile);

        return back()->with('success', "Organization '{$org->name}' created.");
    }

    public function suspend(Organization $organization)
    {
        if (! $organization->canTransitionTo('suspended')) {
            return back()->with('error', "Cannot suspend organization in '{$organization->status}' status.");
        }

        $organization->suspend();

        return back()->with('success', "Organization '{$organization->name}' suspended.");
    }

    public function archive(Organization $organization)
    {
        if (! $organization->canTransitionTo('archived')) {
            return back()->with('error', "Cannot archive organization in '{$organization->status}' status.");
        }

        $organization->archive();

        return back()->with('success', "Organization '{$organization->name}' archived.");
    }
}
