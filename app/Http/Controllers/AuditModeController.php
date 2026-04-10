<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\CorrectiveAction;
use App\Models\Device;
use App\Models\DeviceCalibration;
use App\Models\Site;
use App\Services\Compliance\MonitoringGapDetector;
use Illuminate\Http\Request;
use Inertia\Inertia;
use ZipArchive;

class AuditModeController extends Controller
{
    public function exportInsurancePackage(Request $request, Site $site)
    {
        $days = (int) $request->input('days', 90);
        $zone = $request->input('zone');
        $from = now()->subDays($days);
        $to = now();
        $periodLabel = $from->format('Y-m-d') . '_to_' . $to->format('Y-m-d');

        // Gather data (same queries as __invoke)
        $deviceQuery = Device::where('site_id', $site->id)
            ->whereIn('status', ['active', 'offline']);
        if ($zone) {
            $deviceQuery->where('zone', $zone);
        }
        $devices = $deviceQuery->with('latestCalibration')->get();
        $deviceIds = $devices->pluck('id');

        $excursions = Alert::where('site_id', $site->id)
            ->where('triggered_at', '>=', $from)
            ->whereIn('severity', ['critical', 'high'])
            ->when($zone, fn ($q) => $q->whereHas('device', fn ($dq) => $dq->where('zone', $zone)))
            ->with('device:id,name,zone')
            ->orderBy('triggered_at', 'desc')
            ->get();

        $correctiveActions = CorrectiveAction::where('site_id', $site->id)
            ->where('created_at', '>=', $from)
            ->with(['takenByUser:id,name', 'verifiedByUser:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();

        $calibrations = DeviceCalibration::whereIn('device_id', $deviceIds)
            ->with('device:id,name,zone')
            ->orderBy('calibrated_at', 'desc')
            ->get();

        $gapDetector = new MonitoringGapDetector(maxGapMinutes: 15);
        $gaps = $gapDetector->detectForSite($site, $from->toIso8601String(), $to->toIso8601String());
        if ($zone) {
            $gaps = array_values(array_filter($gaps, fn ($g) => ($g['zone'] ?? '') === $zone));
        }
        $significantGaps = array_values(array_filter($gaps, fn ($g) => $g['duration_minutes'] > 15));

        // Build ZIP
        $filename = "audit_{$site->name}_{$periodLabel}.zip";
        $zipPath = storage_path("app/temp/{$filename}");

        if (! is_dir(dirname($zipPath))) {
            mkdir(dirname($zipPath), 0755, true);
        }

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        // 1. Summary
        $summaryLines = [
            ['Astrea IoT Platform — Audit Package'],
            ['Site', $site->name],
            ['Period', "{$days} days ({$from->format('Y-m-d')} to {$to->format('Y-m-d')})"],
            $zone ? ['Zone Filter', $zone] : ['Zone Filter', 'All zones'],
            ['Generated', now()->format('Y-m-d H:i:s')],
            [],
            ['Metric', 'Value'],
            ['Total Devices', $devices->count()],
            ['Temperature Excursions', $excursions->count()],
            ['Resolved Excursions', $excursions->where('status', 'resolved')->count()],
            ['Corrective Actions', $correctiveActions->count()],
            ['Verified Actions', $correctiveActions->where('status', 'verified')->count()],
            ['Calibrations Valid', $devices->filter(fn ($d) => $d->calibrationStatus() === 'valid')->count()],
            ['Calibrations Expired', $devices->filter(fn ($d) => $d->calibrationStatus() === 'expired')->count()],
            ['Monitoring Gaps (>15 min)', count($significantGaps)],
        ];
        $zip->addFromString('01_summary.csv', $this->toCsv($summaryLines));

        // 2. Excursions
        $excursionRows = [['Date', 'Alert', 'Device', 'Zone', 'Severity', 'Metric', 'Value', 'Threshold', 'Duration (min)', 'Status', 'Resolved At']];
        foreach ($excursions as $e) {
            $duration = $e->resolved_at && $e->triggered_at
                ? (int) $e->triggered_at->diffInMinutes($e->resolved_at)
                : null;
            $excursionRows[] = [
                $e->triggered_at->format('Y-m-d H:i'),
                $e->data['rule_name'] ?? "Alert #{$e->id}",
                $e->device?->name,
                $e->device?->zone,
                $e->severity,
                $e->data['metric'] ?? '',
                $e->data['value'] ?? '',
                $e->data['threshold'] ?? '',
                $duration ?? 'Ongoing',
                $e->status,
                $e->resolved_at?->format('Y-m-d H:i') ?? '',
            ];
        }
        $zip->addFromString('02_temperature_excursions.csv', $this->toCsv($excursionRows));

        // 3. Corrective Actions
        $caRows = [['Date', 'Action Taken', 'Taken By', 'Status', 'Verified By', 'Verified At']];
        foreach ($correctiveActions as $ca) {
            $caRows[] = [
                $ca->taken_at?->format('Y-m-d H:i') ?? $ca->created_at->format('Y-m-d H:i'),
                $ca->action_taken,
                $ca->takenByUser?->name ?? '',
                $ca->status,
                $ca->verifiedByUser?->name ?? '',
                $ca->verified_at?->format('Y-m-d H:i') ?? '',
            ];
        }
        $zip->addFromString('03_corrective_actions.csv', $this->toCsv($caRows));

        // 4. Calibrations
        $calRows = [['Device', 'Zone', 'Calibrated At', 'Expires At', 'Status', 'Calibrated By', 'Method', 'Has Certificate']];
        foreach ($calibrations as $c) {
            $calRows[] = [
                $c->device?->name,
                $c->device?->zone,
                $c->calibrated_at->format('Y-m-d'),
                $c->expires_at->format('Y-m-d'),
                $c->calibrationStatus(),
                $c->calibrated_by ?? '',
                $c->method ?? '',
                $c->certificate_path ? 'Yes' : 'No',
            ];
        }
        $zip->addFromString('04_sensor_calibrations.csv', $this->toCsv($calRows));

        // 5. Monitoring Gaps
        $gapRows = [['Device', 'Zone', 'Gap Start', 'Gap End', 'Duration (min)']];
        foreach ($significantGaps as $g) {
            $gapRows[] = [
                $g['device_name'],
                $g['zone'] ?? '',
                $g['gap_start'],
                $g['gap_end'],
                $g['duration_minutes'],
            ];
        }
        $zip->addFromString('05_monitoring_gaps.csv', $this->toCsv($gapRows));

        $zip->close();

        return response()->download($zipPath, $filename, [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }

    public function __invoke(Request $request, Site $site)
    {
        $days = (int) $request->input('days', 90);
        $zone = $request->input('zone');
        $from = now()->subDays($days)->toIso8601String();
        $to = now()->toIso8601String();

        // All devices for this site (for zone list)
        $allDevices = Device::where('site_id', $site->id)
            ->whereIn('status', ['active', 'offline'])
            ->get();

        $availableZones = $allDevices->pluck('zone')->filter()->unique()->sort()->values();

        // Filter devices by zone if specified
        $devices = $zone
            ? $allDevices->where('zone', $zone)->values()
            : $allDevices;

        $devices->load('latestCalibration');

        $zones = $devices->groupBy('zone')->map(fn ($zoneDevices, $zoneName) => [
            'zone' => $zoneName ?: 'Unassigned',
            'device_count' => $zoneDevices->count(),
            'devices' => $zoneDevices->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'model' => $d->model,
                'status' => $d->status,
                'calibration_status' => $d->calibrationStatus(),
                'calibration_expires' => $d->latestCalibration?->expires_at?->toDateString(),
            ]),
        ])->values();

        // Excursions (alerts with critical/high severity)
        $excursionQuery = Alert::where('site_id', $site->id)
            ->where('triggered_at', '>=', $from)
            ->whereIn('severity', ['critical', 'high'])
            ->with('device:id,name,zone')
            ->orderBy('triggered_at', 'desc');

        if ($zone) {
            $excursionQuery->whereHas('device', fn ($q) => $q->where('zone', $zone));
        }

        $excursions = $excursionQuery->get()
            ->map(fn (Alert $a) => [
                'id' => $a->id,
                'triggered_at' => $a->triggered_at,
                'severity' => $a->severity,
                'status' => $a->status,
                'resolved_at' => $a->resolved_at,
                'resolution_type' => $a->resolution_type,
                'device_name' => $a->device?->name,
                'zone' => $a->device?->zone,
                'rule_name' => $a->data['rule_name'] ?? "Alert #{$a->id}",
                'metric' => $a->data['metric'] ?? null,
                'value' => $a->data['value'] ?? null,
                'threshold' => $a->data['threshold'] ?? null,
                'duration_minutes' => $a->resolved_at && $a->triggered_at
                    ? (int) $a->triggered_at->diffInMinutes($a->resolved_at)
                    : null,
            ]);

        // Corrective actions
        $correctiveActions = CorrectiveAction::where('site_id', $site->id)
            ->where('created_at', '>=', $from)
            ->with(['takenByUser:id,name', 'verifiedByUser:id,name'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (CorrectiveAction $ca) => [
                'id' => $ca->id,
                'alert_id' => $ca->alert_id,
                'action_taken' => $ca->action_taken,
                'status' => $ca->status,
                'taken_by' => $ca->takenByUser?->name,
                'taken_at' => $ca->taken_at,
                'verified_by' => $ca->verifiedByUser?->name,
                'verified_at' => $ca->verified_at,
            ]);

        // Calibration records
        $calibrations = DeviceCalibration::whereIn('device_id', $devices->pluck('id'))
            ->with('device:id,name,zone')
            ->orderBy('calibrated_at', 'desc')
            ->get()
            ->map(fn (DeviceCalibration $c) => [
                'id' => $c->id,
                'device_name' => $c->device?->name,
                'zone' => $c->device?->zone,
                'calibrated_at' => $c->calibrated_at,
                'expires_at' => $c->expires_at,
                'status' => $c->calibrationStatus(),
                'calibrated_by' => $c->calibrated_by,
                'method' => $c->method,
                'has_certificate' => (bool) $c->certificate_path,
            ]);

        // Monitoring gaps
        $gapDetector = new MonitoringGapDetector(maxGapMinutes: 15);
        $gaps = $gapDetector->detectForSite($site, $from, $to);
        if ($zone) {
            $gaps = array_values(array_filter($gaps, fn ($g) => ($g['zone'] ?? '') === $zone));
        }
        $significantGaps = array_values(array_filter($gaps, fn ($g) => $g['duration_minutes'] > 15));

        // Summary stats
        $summary = [
            'period_days' => $days,
            'total_devices' => $devices->count(),
            'total_excursions' => $excursions->count(),
            'resolved_excursions' => $excursions->where('status', 'resolved')->count(),
            'total_corrective_actions' => $correctiveActions->count(),
            'verified_actions' => $correctiveActions->where('status', 'verified')->count(),
            'calibration_valid' => $devices->filter(fn ($d) => $d->calibrationStatus() === 'valid')->count(),
            'calibration_expired' => $devices->filter(fn ($d) => $d->calibrationStatus() === 'expired')->count(),
            'calibration_none' => $devices->filter(fn ($d) => $d->calibrationStatus() === 'none')->count(),
            'monitoring_gaps' => count($significantGaps),
        ];

        return Inertia::render('sites/audit', [
            'site' => $site->only('id', 'name'),
            'days' => $days,
            'summary' => $summary,
            'zones' => $zones,
            'availableZones' => $availableZones,
            'excursions' => $excursions,
            'correctiveActions' => $correctiveActions,
            'calibrations' => $calibrations,
            'monitoringGaps' => array_slice($significantGaps, 0, 50),
            'filters' => [
                'zone' => $zone,
            ],
        ]);
    }

    private function toCsv(array $rows): string
    {
        $handle = fopen('php://temp', 'r+');
        foreach ($rows as $row) {
            fputcsv($handle, $row, ',', '"', '\\');
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        // Add BOM for Excel UTF-8 compatibility
        return "\xEF\xBB\xBF" . $csv;
    }
}
