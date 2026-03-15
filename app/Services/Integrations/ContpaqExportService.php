<?php

namespace App\Services\Integrations;

use App\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ContpaqExportService
{
    /**
     * Export invoices in CONTPAQ-compatible CSV format for an organization.
     * Groups energy consumption by site and date to generate invoice-like records.
     *
     * @return string File path relative to the local storage disk
     */
    public function exportInvoices(Organization $org, Carbon $from, Carbon $to): string
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
