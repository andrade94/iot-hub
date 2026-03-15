<?php

namespace App\Services\Billing;

use App\Models\Invoice;
use App\Models\Subscription;

class InvoiceService
{
    /**
     * Generate an invoice from a subscription for the given period.
     */
    public function generateInvoice(Subscription $sub, string $period): Invoice
    {
        $subtotal = $sub->calculateMonthlyTotal();
        $iva = round($subtotal * 0.16, 2);
        $total = round($subtotal + $iva, 2);

        return Invoice::create([
            'org_id' => $sub->org_id,
            'billing_profile_id' => $sub->billing_profile_id,
            'period' => $period,
            'subtotal' => $subtotal,
            'iva' => $iva,
            'total' => $total,
            'status' => 'draft',
        ]);
    }

    /**
     * Mark an invoice as paid.
     */
    public function markPaid(Invoice $invoice, string $method): Invoice
    {
        $invoice->update([
            'status' => 'paid',
            'paid_at' => now(),
            'payment_method' => $method,
        ]);

        return $invoice;
    }
}
