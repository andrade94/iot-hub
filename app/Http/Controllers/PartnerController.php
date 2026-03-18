<?php

namespace App\Http\Controllers;

use App\Models\BillingProfile;
use App\Models\Organization;
use App\Services\Billing\SubscriptionService;
use Illuminate\Http\Request;
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
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:organizations,slug',
            'segment' => 'required|string|in:retail,cold_chain,industrial,commercial,foodservice',
            'plan' => 'required|string|in:starter,standard,enterprise',
            'default_timezone' => 'nullable|string|max:50',
            'default_opening_hour' => 'nullable|date_format:H:i',
        ]);

        $org = Organization::create($validated);

        // Auto-create a default billing profile and subscription
        $profile = BillingProfile::create([
            'org_id' => $org->id,
            'name' => $org->name,
            'rfc' => 'XAXX010101000', // Generic RFC placeholder — client will update
            'razon_social' => $org->name,
            'is_default' => true,
        ]);

        app(SubscriptionService::class)->createSubscription($org, $profile);

        return back()->with('success', "Organization '{$org->name}' created with default subscription.");
    }
}
