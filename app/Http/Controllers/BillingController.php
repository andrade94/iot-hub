<?php

namespace App\Http\Controllers;

use App\Models\BillingProfile;
use App\Models\Invoice;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;

        $subscription = Subscription::with('items.device')
            ->where('org_id', $orgId)
            ->where('status', 'active')
            ->first();

        $invoices = Invoice::where('org_id', $orgId)
            ->latest()
            ->take(10)
            ->get();

        $monthlyTotal = $subscription?->calculateMonthlyTotal() ?? 0;

        return Inertia::render('settings/billing/dashboard', [
            'subscription' => $subscription,
            'invoices' => $invoices,
            'monthlyTotal' => $monthlyTotal,
            'deviceCount' => $subscription?->items()->count() ?? 0,
        ]);
    }

    public function profiles(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;

        $profiles = BillingProfile::where('org_id', $orgId)
            ->latest()
            ->get();

        return Inertia::render('settings/billing/profiles', [
            'profiles' => $profiles,
        ]);
    }

    public function storeProfile(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'rfc' => ['required', 'string', 'max:13'],
            'razon_social' => ['required', 'string', 'max:255'],
            'regimen_fiscal' => ['nullable', 'string', 'max:100'],
            'direccion_fiscal' => ['nullable', 'array'],
            'uso_cfdi' => ['nullable', 'string', 'max:10'],
            'email_facturacion' => ['nullable', 'email', 'max:255'],
            'is_default' => ['boolean'],
        ]);

        $user = $request->user();
        $orgId = $user->org_id;

        // If marking as default, unset other defaults
        if (! empty($validated['is_default'])) {
            BillingProfile::where('org_id', $orgId)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        BillingProfile::create([
            ...$validated,
            'org_id' => $orgId,
        ]);

        return back()->with('success', 'Billing profile created.');
    }
}
