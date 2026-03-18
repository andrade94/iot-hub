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

class SapExportService
{
    /**
     * Export invoices for an organization/period and POST to SAP endpoint.
     *
     * @return array{success: bool, message: string, exported_count: int}
     */
    public function exportInvoices(Organization $org, string $period): array
    {
        $endpoint = config('services.sap.endpoint');
        $apiKey = config('services.sap.api_key');
        $companyCode = config('services.sap.company_code');

        if (! $endpoint || ! $apiKey) {
            Log::warning('SAP export skipped: missing endpoint or API key configuration', [
                'org_id' => $org->id,
            ]);

            return [
                'success' => false,
                'message' => 'SAP integration is not configured.',
                'exported_count' => 0,
            ];
        }

        $invoices = Invoice::forOrg($org->id)
            ->where('period', $period)
            ->get();

        if ($invoices->isEmpty()) {
            Log::info('SAP invoice export: no invoices found', [
                'org_id' => $org->id,
                'period' => $period,
            ]);

            return [
                'success' => true,
                'message' => 'No invoices found for the given period.',
                'exported_count' => 0,
            ];
        }

        $payload = [
            'company_code' => $companyCode,
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
                'slug' => $org->slug,
            ],
            'period' => $period,
            'invoices' => $invoices->map(fn (Invoice $inv) => [
                'document_number' => $inv->id,
                'period' => $inv->period,
                'subtotal' => (float) $inv->subtotal,
                'tax' => (float) $inv->iva,
                'total' => (float) $inv->total,
                'status' => $inv->status,
                'cfdi_uuid' => $inv->cfdi_uuid,
                'payment_method' => $inv->payment_method,
                'paid_at' => $inv->paid_at?->toIso8601String(),
                'created_at' => $inv->created_at->toIso8601String(),
            ])->toArray(),
            'exported_at' => now()->toIso8601String(),
        ];

        // Store a local copy for audit purposes
        $filename = sprintf(
            'exports/sap/%s_invoices_%s_%s.json',
            $org->slug,
            $period,
            now()->format('Ymd_His'),
        );
        Storage::disk('local')->put($filename, json_encode($payload, JSON_PRETTY_PRINT));

        try {
            $response = Http::withHeaders([
                'X-API-Key' => $apiKey,
                'Content-Type' => 'application/json',
                'X-Company-Code' => $companyCode,
            ])->timeout(30)->post("{$endpoint}/invoices", $payload);

            if ($response->successful()) {
                $this->updateExportStatus($org, 'sap');

                Log::info('SAP invoice export successful', [
                    'org_id' => $org->id,
                    'period' => $period,
                    'count' => $invoices->count(),
                    'file' => $filename,
                ]);

                return [
                    'success' => true,
                    'message' => "Exported {$invoices->count()} invoice(s) to SAP.",
                    'exported_count' => $invoices->count(),
                ];
            }

            Log::error('SAP invoice export failed: API returned error', [
                'org_id' => $org->id,
                'period' => $period,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'message' => "SAP API returned status {$response->status()}.",
                'exported_count' => 0,
            ];
        } catch (\Exception $e) {
            Log::error('SAP invoice export failed: connection error', [
                'org_id' => $org->id,
                'period' => $period,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => "SAP connection failed: {$e->getMessage()}",
                'exported_count' => 0,
            ];
        }
    }

    /**
     * Export activity log entries as SAP journal entries.
     *
     * @return array{success: bool, message: string, exported_count: int}
     */
    public function exportActivityLog(Organization $org, Carbon $from, Carbon $to): array
    {
        $endpoint = config('services.sap.endpoint');
        $apiKey = config('services.sap.api_key');
        $companyCode = config('services.sap.company_code');

        if (! $endpoint || ! $apiKey) {
            Log::warning('SAP activity log export skipped: missing configuration', [
                'org_id' => $org->id,
            ]);

            return [
                'success' => false,
                'message' => 'SAP integration is not configured.',
                'exported_count' => 0,
            ];
        }

        // Query activity_log entries related to this organization's models
        $userIds = $org->users()->pluck('id')->toArray();

        $activities = DB::table('activity_log')
            ->whereBetween('created_at', [$from, $to])
            ->where(function ($query) use ($userIds, $org) {
                $query->whereIn('causer_id', $userIds)
                    ->orWhere(function ($q) use ($org) {
                        $q->where('subject_type', 'App\\Models\\Organization')
                            ->where('subject_id', $org->id);
                    });
            })
            ->orderBy('created_at')
            ->get();

        if ($activities->isEmpty()) {
            Log::info('SAP activity log export: no entries found', [
                'org_id' => $org->id,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ]);

            return [
                'success' => true,
                'message' => 'No activity log entries found for the given period.',
                'exported_count' => 0,
            ];
        }

        $payload = [
            'company_code' => $companyCode,
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
            ],
            'period' => [
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
            ],
            'journal_entries' => $activities->map(fn ($activity) => [
                'entry_id' => $activity->id,
                'date' => $activity->created_at,
                'description' => $activity->description,
                'event' => $activity->event,
                'subject_type' => $activity->subject_type,
                'subject_id' => $activity->subject_id,
                'causer_id' => $activity->causer_id,
                'properties' => json_decode($activity->properties, true),
            ])->toArray(),
            'exported_at' => now()->toIso8601String(),
        ];

        // Store a local copy for audit purposes
        $filename = sprintf(
            'exports/sap/%s_activity_%s_%s_%s.json',
            $org->slug,
            $from->format('Ymd'),
            $to->format('Ymd'),
            now()->format('Ymd_His'),
        );
        Storage::disk('local')->put($filename, json_encode($payload, JSON_PRETTY_PRINT));

        try {
            $response = Http::withHeaders([
                'X-API-Key' => $apiKey,
                'Content-Type' => 'application/json',
                'X-Company-Code' => $companyCode,
            ])->timeout(30)->post("{$endpoint}/journal-entries", $payload);

            if ($response->successful()) {
                $this->updateExportStatus($org, 'sap');

                Log::info('SAP activity log export successful', [
                    'org_id' => $org->id,
                    'from' => $from->toDateString(),
                    'to' => $to->toDateString(),
                    'count' => $activities->count(),
                    'file' => $filename,
                ]);

                return [
                    'success' => true,
                    'message' => "Exported {$activities->count()} journal entry(ies) to SAP.",
                    'exported_count' => $activities->count(),
                ];
            }

            Log::error('SAP activity log export failed: API returned error', [
                'org_id' => $org->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'message' => "SAP API returned status {$response->status()}.",
                'exported_count' => 0,
            ];
        } catch (\Exception $e) {
            Log::error('SAP activity log export failed: connection error', [
                'org_id' => $org->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => "SAP connection failed: {$e->getMessage()}",
                'exported_count' => 0,
            ];
        }
    }

    /**
     * Export sensor readings for an organization in SAP-compatible CSV format.
     *
     * @return string File path relative to the local storage disk
     */
    public function exportReadings(Organization $org, Carbon $from, Carbon $to): string
    {
        $siteIds = $org->sites()->pluck('id')->toArray();

        if (empty($siteIds)) {
            return $this->writeEmptyCsv($org, 'sap');
        }

        $placeholders = implode(',', array_fill(0, count($siteIds), '?'));

        $rows = DB::select("
            SELECT
                d.name AS device_name,
                d.dev_eui,
                d.zone,
                s.name AS site_name,
                sr.metric,
                sr.value,
                sr.time
            FROM sensor_readings sr
            JOIN devices d ON d.id = sr.device_id
            JOIN sites s ON s.id = d.site_id
            WHERE d.site_id IN ({$placeholders})
              AND sr.time BETWEEN ? AND ?
            ORDER BY sr.time ASC
        ", [...$siteIds, $from, $to]);

        $filename = sprintf(
            'exports/sap/%s_%s_%s.csv',
            $org->slug,
            $from->format('Ymd'),
            $to->format('Ymd'),
        );

        $headers = ['Site', 'Device', 'DevEUI', 'Zone', 'Metric', 'Value', 'Timestamp'];
        $lines = [implode(',', $headers)];

        foreach ($rows as $row) {
            $lines[] = implode(',', [
                $this->escapeCsv($row->site_name),
                $this->escapeCsv($row->device_name),
                $row->dev_eui,
                $this->escapeCsv($row->zone ?? ''),
                $row->metric,
                $row->value,
                $row->time,
            ]);
        }

        Storage::disk('local')->put($filename, implode("\n", $lines));

        return $filename;
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
     * Write an empty CSV with just headers when there is no data.
     */
    protected function writeEmptyCsv(Organization $org, string $prefix): string
    {
        $filename = sprintf(
            'exports/%s/%s_empty_%s.csv',
            $prefix,
            $org->slug,
            now()->format('Ymd_His'),
        );

        $headers = ['Site', 'Device', 'DevEUI', 'Zone', 'Metric', 'Value', 'Timestamp'];
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
