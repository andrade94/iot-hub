<?php

namespace App\Services\Compliance;

use App\Models\Alert;
use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Site;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class MonitoringGapDetector
{
    private int $maxGapMinutes;

    public function __construct(int $maxGapMinutes = 15)
    {
        $this->maxGapMinutes = $maxGapMinutes;
    }

    /**
     * Detect monitoring gaps for all active devices at a site.
     * Returns an array of gaps: [device_id, device_name, gap_start, gap_end, duration_minutes]
     */
    public function detectForSite(Site $site, string $from, string $to): array
    {
        $devices = Device::where('site_id', $site->id)
            ->whereIn('status', ['active', 'offline'])
            ->get();

        $gaps = [];

        foreach ($devices as $device) {
            $deviceGaps = $this->detectForDevice($device, $from, $to);
            $gaps = array_merge($gaps, $deviceGaps);
        }

        return $gaps;
    }

    /**
     * Detect monitoring gaps for a single device.
     */
    public function detectForDevice(Device $device, string $from, string $to): array
    {
        $readings = SensorReading::where('device_id', $device->id)
            ->whereBetween('time', [$from, $to])
            ->orderBy('time')
            ->pluck('time')
            ->unique()
            ->values();

        if ($readings->isEmpty()) {
            // Entire period is a gap
            return [[
                'device_id' => $device->id,
                'device_name' => $device->name,
                'zone' => $device->zone,
                'gap_start' => $from,
                'gap_end' => $to,
                'duration_minutes' => (int) ((\Carbon\Carbon::parse($to)->getTimestamp() - \Carbon\Carbon::parse($from)->getTimestamp()) / 60),
            ]];
        }

        $gaps = [];
        $previousTime = \Carbon\Carbon::parse($from);

        foreach ($readings as $readingTime) {
            $current = \Carbon\Carbon::parse($readingTime);
            $diffMinutes = $previousTime->diffInMinutes($current, absolute: true);

            if ($diffMinutes > $this->maxGapMinutes) {
                $gaps[] = [
                    'device_id' => $device->id,
                    'device_name' => $device->name,
                    'zone' => $device->zone,
                    'gap_start' => $previousTime->toIso8601String(),
                    'gap_end' => $current->toIso8601String(),
                    'duration_minutes' => (int) $diffMinutes,
                ];
            }

            $previousTime = $current;
        }

        // Check gap between last reading and end of period
        $lastReading = \Carbon\Carbon::parse($readings->last());
        $endTime = \Carbon\Carbon::parse($to);
        $finalGap = $lastReading->diffInMinutes($endTime, absolute: true);

        if ($finalGap > $this->maxGapMinutes) {
            $gaps[] = [
                'device_id' => $device->id,
                'device_name' => $device->name,
                'zone' => $device->zone,
                'gap_start' => $lastReading->toIso8601String(),
                'gap_end' => $endTime->toIso8601String(),
                'duration_minutes' => (int) $finalGap,
            ];
        }

        return $gaps;
    }

    /**
     * Run gap detection and create alerts for any gaps found.
     * Intended to be called from a scheduled job.
     */
    public function checkAndAlert(Site $site): int
    {
        $from = now()->subHours(1)->toIso8601String();
        $to = now()->toIso8601String();

        $gaps = $this->detectForSite($site, $from, $to);
        $alertCount = 0;

        foreach ($gaps as $gap) {
            if ($gap['duration_minutes'] <= $this->maxGapMinutes) {
                continue;
            }

            // Create compliance gap alert (don't duplicate within same hour)
            $existing = Alert::where('site_id', $site->id)
                ->where('device_id', $gap['device_id'])
                ->where('status', 'active')
                ->whereJsonContains('data->type', 'monitoring_gap')
                ->where('triggered_at', '>=', now()->subHour())
                ->exists();

            if (! $existing) {
                Alert::create([
                    'site_id' => $site->id,
                    'device_id' => $gap['device_id'],
                    'rule_id' => null,
                    'severity' => 'high',
                    'status' => 'active',
                    'triggered_at' => now(),
                    'data' => [
                        'type' => 'monitoring_gap',
                        'rule_name' => "Monitoring gap: {$gap['duration_minutes']} min ({$gap['device_name']})",
                        'device_name' => $gap['device_name'],
                        'zone' => $gap['zone'],
                        'gap_start' => $gap['gap_start'],
                        'gap_end' => $gap['gap_end'],
                        'duration_minutes' => $gap['duration_minutes'],
                        'max_allowed_minutes' => $this->maxGapMinutes,
                    ],
                ]);
                $alertCount++;
            }
        }

        if ($alertCount > 0) {
            Log::warning("MonitoringGapDetector: {$alertCount} gap alert(s) created for site {$site->name}");
        }

        return $alertCount;
    }
}
