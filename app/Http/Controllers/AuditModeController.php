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

class AuditModeController extends Controller
{
    public function __invoke(Request $request, Site $site)
    {
        $days = (int) $request->input('days', 90);
        $from = now()->subDays($days)->toIso8601String();
        $to = now()->toIso8601String();

        // Temperature data by zone (daily min/max/avg)
        $devices = Device::where('site_id', $site->id)
            ->whereIn('status', ['active', 'offline'])
            ->with('latestCalibration')
            ->get();

        $zones = $devices->groupBy('zone')->map(fn ($zoneDevices, $zone) => [
            'zone' => $zone ?: 'Unassigned',
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

        // Excursions (alerts with type temperature)
        $excursions = Alert::where('site_id', $site->id)
            ->where('triggered_at', '>=', $from)
            ->whereIn('severity', ['critical', 'high'])
            ->with('device:id,name,zone')
            ->orderBy('triggered_at', 'desc')
            ->get()
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
        // Only significant gaps
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
            'excursions' => $excursions,
            'correctiveActions' => $correctiveActions,
            'calibrations' => $calibrations,
            'monitoringGaps' => array_slice($significantGaps, 0, 50),
        ]);
    }
}
