<?php

namespace App\Services\Billing;

use App\Models\Invoice;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FacturapiService
{
    /**
     * Create a CFDI for the given invoice.
     * Placeholder — logs the call and returns a mock cfdi_uuid.
     * Will integrate with Facturapi API in the future.
     */
    public function createCfdi(Invoice $invoice): string
    {
        Log::info('FacturapiService::createCfdi called', [
            'invoice_id' => $invoice->id,
            'org_id' => $invoice->org_id,
            'total' => $invoice->total,
            'period' => $invoice->period,
        ]);

        $cfdiUuid = Str::uuid()->toString();

        $invoice->update([
            'cfdi_uuid' => $cfdiUuid,
            'status' => 'sent',
        ]);

        return $cfdiUuid;
    }

    /**
     * Download the PDF for a given CFDI UUID.
     * Placeholder — logs the call.
     */
    public function downloadPdf(string $cfdiUuid): ?string
    {
        Log::info('FacturapiService::downloadPdf called', [
            'cfdi_uuid' => $cfdiUuid,
        ]);

        // TODO: Integrate with Facturapi API to download PDF
        return null;
    }

    /**
     * Download the XML for a given CFDI UUID.
     * Placeholder — logs the call.
     */
    public function downloadXml(string $cfdiUuid): ?string
    {
        Log::info('FacturapiService::downloadXml called', [
            'cfdi_uuid' => $cfdiUuid,
        ]);

        // TODO: Integrate with Facturapi API to download XML
        return null;
    }
}
