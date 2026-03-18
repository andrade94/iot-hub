<?php

namespace App\Services\Integrations;

use App\Models\IntegrationConfig;
use App\Models\Invoice;
use App\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ContpaqExportService
{
    /**
     * Export invoices for an organization/period to CONTPAQ endpoint.
     *
     * @return array{success: bool, message: string, exported_count: int}
     */
    public function exportInvoices(Organization $org, string $period): array
    {
        $endpoint = config('services.contpaq.endpoint');
        $apiKey = config('services.contpaq.api_key');

        if (! $endpoint || ! $apiKey) {
            Log::warning('CONTPAQ export skipped: missing endpoint or API key configuration', [
                'org_id' => $org->id,
            ]);

            return [
                'success' => false,
                'message' => 'CONTPAQ integration is not configured.',
                'exported_count' => 0,
            ];
        }

        $invoices = Invoice::forOrg($org->id)
            ->where('period', $period)
            ->get();

        if ($invoices->isEmpty()) {
            Log::info('CONTPAQ invoice export: no invoices found', [
                'org_id' => $org->id,
                'period' => $period,
            ]);

            return [
                'success' => true,
                'message' => 'No invoices found for the given period.',
                'exported_count' => 0,
            ];
        }

        // Format invoices in CONTPAQ-compatible layout (Mexican ERP standard)
        $payload = [
            'empresa' => [
                'id' => $org->id,
                'nombre' => $org->name,
                'slug' => $org->slug,
            ],
            'periodo' => $period,
            'documentos' => $invoices->map(fn (Invoice $inv) => [
                'num_documento' => $inv->id,
                'fecha' => $inv->created_at->format('Y-m-d'),
                'concepto' => "Servicios IoT - {$period}",
                'subtotal' => (float) $inv->subtotal,
                'iva' => (float) $inv->iva,
                'total' => (float) $inv->total,
                'estado' => $this->mapStatusToContpaq($inv->status),
                'uuid_cfdi' => $inv->cfdi_uuid,
                'metodo_pago' => $inv->payment_method === 'spei' ? 'SPEI' : ($inv->payment_method === 'transfer' ? 'Transferencia' : null),
                'fecha_pago' => $inv->paid_at?->format('Y-m-d'),
            ])->toArray(),
            'fecha_exportacion' => now()->toIso8601String(),
        ];

        // Store a local copy for audit purposes
        $filename = sprintf(
            'exports/contpaq/%s_invoices_%s_%s.json',
            $org->slug,
            $period,
            now()->format('Ymd_His'),
        );
        Storage::disk('local')->put($filename, json_encode($payload, JSON_PRETTY_PRINT));

        try {
            $response = Http::withHeaders([
                'X-API-Key' => $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post("{$endpoint}/documentos/importar", $payload);

            if ($response->successful()) {
                $this->updateExportStatus($org, 'contpaq');

                Log::info('CONTPAQ invoice export successful', [
                    'org_id' => $org->id,
                    'period' => $period,
                    'count' => $invoices->count(),
                    'file' => $filename,
                ]);

                return [
                    'success' => true,
                    'message' => "Exported {$invoices->count()} invoice(s) to CONTPAQ.",
                    'exported_count' => $invoices->count(),
                ];
            }

            Log::error('CONTPAQ invoice export failed: API returned error', [
                'org_id' => $org->id,
                'period' => $period,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'message' => "CONTPAQ API returned status {$response->status()}.",
                'exported_count' => 0,
            ];
        } catch (\Exception $e) {
            Log::error('CONTPAQ invoice export failed: connection error', [
                'org_id' => $org->id,
                'period' => $period,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => "CONTPAQ connection failed: {$e->getMessage()}",
                'exported_count' => 0,
            ];
        }
    }

    /**
     * Sync product/service catalog to CONTPAQ.
     *
     * @return array{success: bool, message: string, synced_count: int}
     */
    public function syncCatalog(Organization $org): array
    {
        $endpoint = config('services.contpaq.endpoint');
        $apiKey = config('services.contpaq.api_key');

        if (! $endpoint || ! $apiKey) {
            Log::warning('CONTPAQ catalog sync skipped: missing configuration', [
                'org_id' => $org->id,
            ]);

            return [
                'success' => false,
                'message' => 'CONTPAQ integration is not configured.',
                'synced_count' => 0,
            ];
        }

        // Build catalog from subscription items (service catalog for IoT platform)
        $subscriptions = $org->subscriptions()
            ->with('items')
            ->where('status', 'active')
            ->get();

        $catalogItems = [];
        $sensorModels = [];

        foreach ($subscriptions as $subscription) {
            foreach ($subscription->items ?? [] as $item) {
                // Deduplicate by sensor_model
                if (! in_array($item->sensor_model, $sensorModels)) {
                    $sensorModels[] = $item->sensor_model;
                    $catalogItems[] = [
                        'codigo' => 'IOT-' . strtoupper(str_replace([' ', '-'], '_', $item->sensor_model)),
                        'descripcion' => "Servicio de monitoreo IoT - {$item->sensor_model}",
                        'unidad' => 'SRV',
                        'precio_unitario' => (float) $item->monthly_fee,
                        'tipo' => 'servicio',
                        'activo' => true,
                    ];
                }
            }
        }

        if (empty($catalogItems)) {
            Log::info('CONTPAQ catalog sync: no items to sync', [
                'org_id' => $org->id,
            ]);

            return [
                'success' => true,
                'message' => 'No catalog items to sync.',
                'synced_count' => 0,
            ];
        }

        $payload = [
            'empresa' => [
                'id' => $org->id,
                'nombre' => $org->name,
            ],
            'productos' => $catalogItems,
            'fecha_sincronizacion' => now()->toIso8601String(),
        ];

        try {
            $response = Http::withHeaders([
                'X-API-Key' => $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post("{$endpoint}/catalogo/sincronizar", $payload);

            if ($response->successful()) {
                $this->updateExportStatus($org, 'contpaq');

                Log::info('CONTPAQ catalog sync successful', [
                    'org_id' => $org->id,
                    'count' => count($catalogItems),
                ]);

                return [
                    'success' => true,
                    'message' => 'Synced ' . count($catalogItems) . ' catalog item(s) to CONTPAQ.',
                    'synced_count' => count($catalogItems),
                ];
            }

            Log::error('CONTPAQ catalog sync failed: API returned error', [
                'org_id' => $org->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'message' => "CONTPAQ API returned status {$response->status()}.",
                'synced_count' => 0,
            ];
        } catch (\Exception $e) {
            Log::error('CONTPAQ catalog sync failed: connection error', [
                'org_id' => $org->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => "CONTPAQ connection failed: {$e->getMessage()}",
                'synced_count' => 0,
            ];
        }
    }

    /**
     * Export invoices in CONTPAQ-compatible CSV format for an organization.
     * Groups energy consumption by site and date to generate invoice-like records.
     *
     * @return string File path relative to the local storage disk
     */
    public function exportReadingsCsv(Organization $org, Carbon $from, Carbon $to): string
    {
        $siteIds = $org->sites()->pluck('id')->toArray();

        if (empty($siteIds)) {
            return $this->writeEmptyCsv($org);
        }

        $driver = DB::getDriverName();
        $rows = $this->queryInvoiceData($siteIds, $from, $to, $driver);

        $filename = sprintf(
            'exports/contpaq/%s_%s_%s.csv',
            $org->slug,
            $from->format('Ymd'),
            $to->format('Ymd'),
        );

        $headers = [
            'NumDocumento',
            'Fecha',
            'Concepto',
            'Sitio',
            'Cantidad',
            'Unidad',
            'PrecioUnitario',
            'Importe',
        ];
        $lines = [implode(',', $headers)];

        $docNumber = 1;
        $rate = 2.50; // MXN per kWh — simplified CFE tariff

        foreach ($rows as $row) {
            $kwh = round((float) $row->total_kwh, 4);
            $importe = round($kwh * $rate, 2);

            $lines[] = implode(',', [
                $docNumber++,
                $row->date,
                'Consumo Energetico',
                $this->escapeCsv($row->site_name),
                $kwh,
                'kWh',
                $rate,
                $importe,
            ]);
        }

        Storage::disk('local')->put($filename, implode("\n", $lines));

        return $filename;
    }

    /**
     * Map internal invoice status to CONTPAQ equivalent.
     */
    protected function mapStatusToContpaq(string $status): string
    {
        return match ($status) {
            'draft' => 'Borrador',
            'sent' => 'Emitido',
            'paid' => 'Pagado',
            'overdue' => 'Vencido',
            default => 'Pendiente',
        };
    }

    /**
     * Update the last_export_at timestamp in integration_configs.
     */
    protected function updateExportStatus(Organization $org, string $type): void
    {
        IntegrationConfig::updateOrCreate(
            ['org_id' => $org->id, 'type' => $type],
            ['last_export_at' => now()],
        );
    }

    /**
     * Query aggregated energy data per site per day.
     *
     * @param  array<int>  $siteIds
     * @return array<int, object>
     */
    protected function queryInvoiceData(array $siteIds, Carbon $from, Carbon $to, string $driver): array
    {
        $placeholders = implode(',', array_fill(0, count($siteIds), '?'));

        if ($driver === 'pgsql') {
            return DB::select("
                SELECT
                    s.name AS site_name,
                    DATE(sr.time) AS date,
                    COALESCE(SUM(sr.value), 0) AS total_kwh
                FROM sensor_readings sr
                JOIN devices d ON d.id = sr.device_id
                JOIN sites s ON s.id = d.site_id
                WHERE d.site_id IN ({$placeholders})
                  AND sr.metric = 'current'
                  AND sr.time BETWEEN ? AND ?
                GROUP BY s.name, DATE(sr.time)
                ORDER BY date, s.name
            ", [...$siteIds, $from, $to]);
        }

        // SQLite fallback
        return DB::select("
            SELECT
                s.name AS site_name,
                strftime('%Y-%m-%d', sr.time) AS date,
                COALESCE(SUM(sr.value), 0) AS total_kwh
            FROM sensor_readings sr
            JOIN devices d ON d.id = sr.device_id
            JOIN sites s ON s.id = d.site_id
            WHERE d.site_id IN ({$placeholders})
              AND sr.metric = 'current'
              AND sr.time BETWEEN ? AND ?
            GROUP BY s.name, strftime('%Y-%m-%d', sr.time)
            ORDER BY date, s.name
        ", [...$siteIds, $from, $to]);
    }

    /**
     * Write an empty CSV with just headers when there is no data.
     */
    protected function writeEmptyCsv(Organization $org): string
    {
        $filename = sprintf(
            'exports/contpaq/%s_empty_%s.csv',
            $org->slug,
            now()->format('Ymd_His'),
        );

        $headers = [
            'NumDocumento',
            'Fecha',
            'Concepto',
            'Sitio',
            'Cantidad',
            'Unidad',
            'PrecioUnitario',
            'Importe',
        ];
        Storage::disk('local')->put($filename, implode(',', $headers));

        return $filename;
    }

    /**
     * Escape a value for CSV output.
     */
    protected function escapeCsv(string $value): string
    {
        if (str_contains($value, ',') || str_contains($value, '"') || str_contains($value, "\n")) {
            return '"' . str_replace('"', '""', $value) . '"';
        }

        return $value;
    }
}
