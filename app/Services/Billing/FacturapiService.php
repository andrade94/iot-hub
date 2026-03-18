<?php

namespace App\Services\Billing;

use App\Models\Invoice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class FacturapiService
{
    protected string $baseUrl = 'https://www.facturapi.io/v2';

    /**
     * Create a CFDI for the given invoice via Facturapi.
     */
    public function createCfdi(Invoice $invoice): string
    {
        $profile = $invoice->billingProfile;

        $response = Http::withToken(config('services.facturapi.api_key'))
            ->post("{$this->baseUrl}/invoices", [
                'customer' => [
                    'legal_name' => $profile->razon_social,
                    'tax_id' => $profile->rfc,
                    'tax_system' => $profile->regimen_fiscal ?? '601',
                    'address' => ['zip' => $profile->direccion_fiscal['zip'] ?? '00000'],
                ],
                'items' => [[
                    'quantity' => 1,
                    'product' => [
                        'description' => "Servicio IoT Astrea — Periodo {$invoice->period}",
                        'product_key' => '81112101', // IoT monitoring services
                        'price' => $invoice->subtotal,
                    ],
                ]],
                'use' => $profile->uso_cfdi ?? 'G03',
                'payment_form' => '03', // Bank transfer (SPEI)
            ]);

        if (! $response->successful()) {
            Log::error('Facturapi CFDI creation failed', [
                'invoice_id' => $invoice->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new \RuntimeException('CFDI creation failed: '.$response->body());
        }

        $data = $response->json();
        $cfdiUuid = $data['uuid'];

        $invoice->update([
            'cfdi_uuid' => $cfdiUuid,
            'cfdi_api_id' => $data['id'],
            'status' => 'sent',
        ]);

        return $cfdiUuid;
    }

    /**
     * Download the PDF for a given Facturapi invoice ID.
     */
    public function downloadPdf(string $cfdiApiId): ?string
    {
        $response = Http::withToken(config('services.facturapi.api_key'))
            ->get("{$this->baseUrl}/invoices/{$cfdiApiId}/pdf");

        if (! $response->successful()) {
            Log::error('Facturapi PDF download failed', [
                'cfdi_api_id' => $cfdiApiId,
                'status' => $response->status(),
            ]);

            return null;
        }

        $path = "invoices/{$cfdiApiId}.pdf";
        Storage::disk('local')->put($path, $response->body());

        return $path;
    }

    /**
     * Download the XML for a given Facturapi invoice ID.
     */
    public function downloadXml(string $cfdiApiId): ?string
    {
        $response = Http::withToken(config('services.facturapi.api_key'))
            ->get("{$this->baseUrl}/invoices/{$cfdiApiId}/xml");

        if (! $response->successful()) {
            Log::error('Facturapi XML download failed', [
                'cfdi_api_id' => $cfdiApiId,
                'status' => $response->status(),
            ]);

            return null;
        }

        $path = "invoices/{$cfdiApiId}.xml";
        Storage::disk('local')->put($path, $response->body());

        return $path;
    }
}
