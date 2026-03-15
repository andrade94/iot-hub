<?php

namespace App\Services\Integrations;

use App\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SapExportService
{
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
