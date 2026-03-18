<?php

namespace App\Http\Controllers;

use App\Models\BillingProfile;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Services\Billing\FacturapiService;
use App\Services\Billing\InvoiceService;
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

        return Inertia::render('settings/billing/index', [
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

    public function generateInvoice(Request $request, InvoiceService $invoiceService)
    {
        $user = $request->user();
        $orgId = $user->org_id;
        $period = $request->input('period', now()->format('Y-m'));

        $subscription = Subscription::where('org_id', $orgId)
            ->where('status', 'active')
            ->first();

        if (! $subscription) {
            return back()->with('error', 'No active subscription found.');
        }

        // Prevent duplicate invoices
        $existing = $subscription->invoices()->where('period', $period)->exists();
        if ($existing) {
            return back()->with('warning', "Invoice for {$period} already exists.");
        }

        $invoice = $invoiceService->generateInvoice($subscription, $period);

        return back()->with('success', "Invoice #{$invoice->id} generated for {$period} — \${$invoice->total} MXN.");
    }

    public function markInvoicePaid(Request $request, Invoice $invoice, InvoiceService $invoiceService)
    {
        $user = $request->user();
        if ($invoice->org_id !== $user->org_id) {
            abort(403);
        }

        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'in:spei,cash,card,other'],
        ]);

        $invoiceService->markPaid($invoice, $validated['payment_method']);

        return back()->with('success', 'Invoice marked as paid.');
    }

    public function downloadInvoice(Request $request, Invoice $invoice, string $format, FacturapiService $facturapiService)
    {
        $user = $request->user();
        if ($invoice->org_id !== $user->org_id) {
            abort(403);
        }

        if (! $invoice->cfdi_api_id) {
            return back()->with('error', 'No CFDI available for this invoice.');
        }

        $path = $format === 'pdf'
            ? $facturapiService->downloadPdf($invoice->cfdi_api_id)
            : $facturapiService->downloadXml($invoice->cfdi_api_id);

        if (! $path) {
            return back()->with('error', 'Download not available.');
        }

        return response()->download(storage_path("app/{$path}"));
    }
}
