<?php

namespace App\Jobs;

use App\Models\DataExport;
use App\Models\SensorReading;
use App\Notifications\ExportReadyNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class ExportOrganizationData implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 600; // 10 minutes

    public function __construct(
        public int $exportId,
    ) {}

    public function handle(): void
    {
        $export = DataExport::findOrFail($this->exportId);

        if (! $export->canTransitionTo('processing')) {
            return;
        }

        $export->markProcessing();

        try {
            $filePath = $this->generateExport($export);
            $fileSize = Storage::disk('local')->size($filePath);

            $export->markCompleted($filePath, $fileSize);

            // Notify the requesting user (wire to existing ExportReadyNotification)
            $downloadUrl = url("/exports/download?path={$filePath}");
            $export->requestedByUser->notify(
                new ExportReadyNotification(
                    filename: basename($filePath),
                    downloadUrl: $downloadUrl,
                    expiresAt: $export->expires_at,
                )
            );

            Log::info("ExportOrganizationData: completed export #{$export->id}", [
                'file_path' => $filePath,
                'file_size' => $fileSize,
            ]);
        } catch (\Throwable $e) {
            $export->markFailed($e->getMessage());

            Log::error("ExportOrganizationData: failed export #{$export->id}", [
                'error' => $e->getMessage(),
            ]);

            if ($export->attempts >= 3) {
                return; // Max retries reached
            }

            throw $e; // Re-throw for queue retry
        }
    }

    private function generateExport(DataExport $export): string
    {
        $org = $export->organization;
        $from = $export->date_from ?? $org->created_at;
        $to = $export->date_to ?? now();

        $dir = "exports/org-{$org->id}";
        Storage::disk('local')->makeDirectory($dir);

        $zipPath = "{$dir}/export-" . now()->format('Y-m-d-His') . '.zip';
        $fullZipPath = Storage::disk('local')->path($zipPath);

        $zip = new ZipArchive;
        $zip->open($fullZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        // Sensor readings (CSV, chunked by month)
        $this->exportReadings($zip, $org, $from, $to);

        // Alerts + corrective actions (CSV)
        $this->exportAlerts($zip, $org, $from, $to);

        // Users (CSV, excluding passwords)
        $this->exportUsers($zip, $org);

        $zip->close();

        return $zipPath;
    }

    private function exportReadings(ZipArchive $zip, $org, $from, $to): void
    {
        $siteIds = $org->sites()->pluck('id');

        $csv = "device_id,device_name,metric,value,unit,time\n";

        SensorReading::whereHas('device', fn ($q) => $q->whereIn('site_id', $siteIds))
            ->whereBetween('time', [$from, $to])
            ->with('device:id,name')
            ->orderBy('time')
            ->chunk(1000, function ($readings) use (&$csv) {
                foreach ($readings as $r) {
                    $csv .= "{$r->device_id},{$r->device?->name},{$r->metric},{$r->value},{$r->unit},{$r->time}\n";
                }
            });

        $zip->addFromString('sensor_readings.csv', $csv);
    }

    private function exportAlerts(ZipArchive $zip, $org, $from, $to): void
    {
        $siteIds = $org->sites()->pluck('id');

        $csv = "id,site_id,device_id,severity,status,triggered_at,acknowledged_at,resolved_at,resolution_type\n";

        \App\Models\Alert::whereIn('site_id', $siteIds)
            ->whereBetween('triggered_at', [$from, $to])
            ->orderBy('triggered_at')
            ->chunk(500, function ($alerts) use (&$csv) {
                foreach ($alerts as $a) {
                    $csv .= "{$a->id},{$a->site_id},{$a->device_id},{$a->severity},{$a->status},{$a->triggered_at},{$a->acknowledged_at},{$a->resolved_at},{$a->resolution_type}\n";
                }
            });

        $zip->addFromString('alerts.csv', $csv);
    }

    private function exportUsers(ZipArchive $zip, $org): void
    {
        $csv = "id,name,email,phone,created_at\n";

        \App\Models\User::where('org_id', $org->id)
            ->orderBy('name')
            ->chunk(100, function ($users) use (&$csv) {
                foreach ($users as $u) {
                    $csv .= "{$u->id},{$u->name},{$u->email},{$u->phone},{$u->created_at}\n";
                }
            });

        $zip->addFromString('users.csv', $csv);
    }
}
