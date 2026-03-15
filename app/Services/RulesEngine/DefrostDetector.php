<?php

namespace App\Services\RulesEngine;

use App\Models\DefrostSchedule;
use App\Models\Device;
use App\Models\SensorReading;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DefrostDetector
{
    /**
     * Analyze sensor readings to find temperature spikes indicative of defrost cycles.
     *
     * A spike is defined as a rise >5 degrees C above the baseline within a 30-minute window.
     *
     * @return array<int, array{time: string, peak_temp: float, duration_minutes: int, recovery_minutes: int}>
     */
    public function analyzeSpikes(Device $device, int $hours = 48): array
    {
        $since = now()->subHours($hours);

        $readings = SensorReading::where('device_id', $device->id)
            ->where('metric', 'temperature')
            ->where('time', '>=', $since)
            ->orderBy('time')
            ->get();

        if ($readings->count() < 10) {
            return [];
        }

        // Calculate baseline as the median of the lowest 60% of readings
        $sortedValues = $readings->pluck('value')->sort()->values();
        $baselineSlice = $sortedValues->take((int) ceil($sortedValues->count() * 0.6));
        $baseline = $baselineSlice->median();

        $spikes = [];
        $inSpike = false;
        $spikeStart = null;
        $peakTemp = null;

        foreach ($readings as $reading) {
            $aboveBaseline = $reading->value - $baseline;

            if (! $inSpike && $aboveBaseline > 5) {
                // Spike begins
                $inSpike = true;
                $spikeStart = $reading->time;
                $peakTemp = $reading->value;
            } elseif ($inSpike) {
                if ($reading->value > $peakTemp) {
                    $peakTemp = $reading->value;
                }

                if ($aboveBaseline <= 2) {
                    // Spike ends — temperature recovered
                    $duration = $spikeStart->diffInMinutes($reading->time);
                    $peakTime = $spikeStart;

                    // Find the actual peak moment for recovery calculation
                    $recoveryMinutes = $reading->time->diffInMinutes($spikeStart);

                    $spikes[] = [
                        'time' => $spikeStart->toIso8601String(),
                        'peak_temp' => round($peakTemp, 2),
                        'duration_minutes' => $duration,
                        'recovery_minutes' => $recoveryMinutes,
                    ];

                    $inSpike = false;
                    $spikeStart = null;
                    $peakTemp = null;
                } elseif ($spikeStart->diffInMinutes($reading->time) > 120) {
                    // Spike too long — likely not a defrost, discard
                    $inSpike = false;
                    $spikeStart = null;
                    $peakTemp = null;
                }
            }
        }

        return $spikes;
    }

    /**
     * Compare day 1 and day 2 spikes to detect recurring defrost patterns.
     *
     * A spike is considered a DEFROST pattern if:
     * - It occurs at the same time (+/- 30 min) on both days
     * - Duration is between 15 and 45 minutes
     * - Recovery is within 60 minutes
     * - It repeats on both days
     *
     * @param  array<int, array{time: string, peak_temp: float, duration_minutes: int, recovery_minutes: int}>  $day1Spikes
     * @param  array<int, array{time: string, peak_temp: float, duration_minutes: int, recovery_minutes: int}>  $day2Spikes
     * @return array<int, array{start_time: string, end_time: string, avg_peak: float, avg_duration: int}>
     */
    public function detectPattern(array $day1Spikes, array $day2Spikes): array
    {
        $detectedWindows = [];

        foreach ($day1Spikes as $spike1) {
            $time1 = Carbon::parse($spike1['time']);

            // Filter to valid defrost duration
            if ($spike1['duration_minutes'] < 15 || $spike1['duration_minutes'] > 45) {
                continue;
            }
            if ($spike1['recovery_minutes'] > 60) {
                continue;
            }

            foreach ($day2Spikes as $spike2) {
                $time2 = Carbon::parse($spike2['time']);

                // Filter day 2 spike by duration/recovery as well
                if ($spike2['duration_minutes'] < 15 || $spike2['duration_minutes'] > 45) {
                    continue;
                }
                if ($spike2['recovery_minutes'] > 60) {
                    continue;
                }

                // Compare time-of-day (same hour:minute within +/- 30 min)
                $time1OfDay = $time1->copy()->setDateFrom(now());
                $time2OfDay = $time2->copy()->setDateFrom(now());
                $timeDiffMinutes = abs($time1OfDay->diffInMinutes($time2OfDay));

                if ($timeDiffMinutes <= 30) {
                    $avgDuration = (int) round(($spike1['duration_minutes'] + $spike2['duration_minutes']) / 2);
                    $avgPeak = round(($spike1['peak_temp'] + $spike2['peak_temp']) / 2, 2);

                    // Use day 1 time-of-day as the canonical window
                    $startTime = $time1->format('H:i');
                    $endTime = $time1->copy()->addMinutes($avgDuration)->format('H:i');

                    $detectedWindows[] = [
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'avg_peak' => $avgPeak,
                        'avg_duration' => $avgDuration,
                    ];

                    break; // Matched, move to next day1 spike
                }
            }
        }

        return $detectedWindows;
    }

    /**
     * Check if the current time falls within a detected defrost window (+/- 15 min buffer).
     *
     * Used to suppress alerts during known defrost cycles.
     */
    public function shouldSuppressAlert(Device $device, string $metric = 'temperature'): bool
    {
        if ($metric !== 'temperature') {
            return false;
        }

        $schedule = DefrostSchedule::where('device_id', $device->id)
            ->whereIn('status', ['detected', 'confirmed', 'manual'])
            ->latest()
            ->first();

        if (! $schedule || empty($schedule->windows)) {
            return false;
        }

        $now = now()->setTimezone($device->site?->timezone ?? config('app.timezone'));
        $currentMinutes = $now->hour * 60 + $now->minute;
        $bufferMinutes = 15;

        foreach ($schedule->windows as $window) {
            $startParts = explode(':', $window['start_time']);
            $endParts = explode(':', $window['end_time']);

            $windowStart = ((int) $startParts[0]) * 60 + ((int) $startParts[1]) - $bufferMinutes;
            $windowEnd = ((int) $endParts[0]) * 60 + ((int) $endParts[1]) + $bufferMinutes;

            // Handle midnight wrap-around
            if ($windowStart < 0) {
                $windowStart += 1440;
            }
            if ($windowEnd >= 1440) {
                $windowEnd -= 1440;
            }

            if ($windowStart <= $windowEnd) {
                if ($currentMinutes >= $windowStart && $currentMinutes <= $windowEnd) {
                    return true;
                }
            } else {
                // Wraps around midnight
                if ($currentMinutes >= $windowStart || $currentMinutes <= $windowEnd) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Create a DefrostSchedule with status 'detected' from analyzed windows.
     *
     * @param  array<int, array{start_time: string, end_time: string, avg_peak: float, avg_duration: int}>  $windows
     */
    public function createSchedule(Device $device, array $windows): DefrostSchedule
    {
        $schedule = DefrostSchedule::create([
            'device_id' => $device->id,
            'site_id' => $device->site_id,
            'status' => 'detected',
            'windows' => $windows,
            'detected_at' => now(),
        ]);

        Log::info('Defrost schedule detected', [
            'device_id' => $device->id,
            'device_name' => $device->name,
            'windows_count' => count($windows),
            'windows' => $windows,
        ]);

        return $schedule;
    }
}
