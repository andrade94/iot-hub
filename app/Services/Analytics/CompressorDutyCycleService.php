<?php

namespace App\Services\Analytics;

use App\Models\CompressorBaseline;
use App\Models\Device;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CompressorDutyCycleService
{
    /**
     * Analyze compressor duty cycle for a given device and date.
     * Calculates on/off cycles from current readings and upserts a CompressorBaseline row.
     */
    public function analyzeDutyCycle(Device $device, Carbon $date): CompressorBaseline
    {
        $dayStart = $date->copy()->startOfDay();
        $dayEnd = $date->copy()->endOfDay();

        $readings = DB::select("
            SELECT time, value
            FROM sensor_readings
            WHERE device_id = ?
              AND metric = 'current'
              AND time BETWEEN ? AND ?
            ORDER BY time ASC
        ", [$device->id, $dayStart, $dayEnd]);

        $cycles = $this->computeCycles($readings);

        return CompressorBaseline::updateOrCreate(
            [
                'device_id' => $device->id,
                'date' => $date->toDateString(),
            ],
            [
                'duty_cycle_pct' => $cycles['duty_cycle_pct'],
                'on_count' => $cycles['on_count'],
                'avg_on_duration' => $cycles['avg_on_duration'],
                'avg_off_duration' => $cycles['avg_off_duration'],
                'degradation_score' => 0, // Updated separately via getDegradationScore
            ],
        );
    }

    /**
     * Calculate degradation score by comparing last 7 days of duty cycle trend.
     * Score 0-100 where higher = more degradation.
     */
    public function getDegradationScore(Device $device): float
    {
        $baselines = CompressorBaseline::where('device_id', $device->id)
            ->where('date', '>=', now()->subDays(7)->toDateString())
            ->orderBy('date')
            ->get();

        if ($baselines->count() < 2) {
            return 0;
        }

        $dutyCycles = $baselines->pluck('duty_cycle_pct')->toArray();
        $count = count($dutyCycles);

        // Simple linear regression slope to detect increasing duty cycle trend
        $sumX = 0;
        $sumY = 0;
        $sumXY = 0;
        $sumX2 = 0;

        for ($i = 0; $i < $count; $i++) {
            $sumX += $i;
            $sumY += $dutyCycles[$i];
            $sumXY += $i * $dutyCycles[$i];
            $sumX2 += $i * $i;
        }

        $denominator = ($count * $sumX2) - ($sumX * $sumX);

        if ($denominator == 0) {
            return 0;
        }

        $slope = (($count * $sumXY) - ($sumX * $sumY)) / $denominator;

        // Normalize slope to 0-100 score
        // A slope of 5% duty cycle increase per day maps to score 100
        $score = min(100, max(0, ($slope / 5) * 100));

        // Also factor in absolute duty cycle level
        $latestDutyCycle = end($dutyCycles);
        if ($latestDutyCycle > 80) {
            $score = min(100, $score + ($latestDutyCycle - 80));
        }

        // Update the latest baseline with the degradation score
        $latest = $baselines->last();
        if ($latest) {
            $latest->update(['degradation_score' => round($score, 2)]);
        }

        return round($score, 2);
    }

    /**
     * Compute on/off cycles from raw current readings.
     * A reading above threshold indicates compressor is ON.
     *
     * @param  array<int, object>  $readings
     * @return array{duty_cycle_pct: float, on_count: int, avg_on_duration: float, avg_off_duration: float}
     */
    protected function computeCycles(array $readings): array
    {
        if (empty($readings)) {
            return [
                'duty_cycle_pct' => 0,
                'on_count' => 0,
                'avg_on_duration' => 0,
                'avg_off_duration' => 0,
            ];
        }

        $threshold = 0.5; // Amps — above this means compressor is running
        $onDurations = [];
        $offDurations = [];
        $totalOnSeconds = 0;
        $totalSeconds = 0;
        $onCount = 0;

        $previousTime = null;
        $previousState = null;
        $stateStartTime = null;

        foreach ($readings as $reading) {
            $time = Carbon::parse($reading->time);
            $isOn = (float) $reading->value > $threshold;

            if ($previousTime !== null) {
                $elapsed = $previousTime->diffInSeconds($time);
                $totalSeconds += $elapsed;

                if ($previousState) {
                    $totalOnSeconds += $elapsed;
                }
            }

            // Detect state transitions
            if ($previousState !== null && $isOn !== $previousState) {
                $duration = $stateStartTime ? $stateStartTime->diffInSeconds($time) : 0;

                if ($previousState) {
                    $onDurations[] = $duration;
                } else {
                    $offDurations[] = $duration;
                    $onCount++;
                }

                $stateStartTime = $time;
            } elseif ($stateStartTime === null) {
                $stateStartTime = $time;
                if ($isOn) {
                    $onCount++;
                }
            }

            $previousTime = $time;
            $previousState = $isOn;
        }

        $dutyCyclePct = $totalSeconds > 0
            ? round(($totalOnSeconds / $totalSeconds) * 100, 2)
            : 0;

        $avgOnDuration = ! empty($onDurations)
            ? round(array_sum($onDurations) / count($onDurations), 2)
            : 0;

        $avgOffDuration = ! empty($offDurations)
            ? round(array_sum($offDurations) / count($offDurations), 2)
            : 0;

        return [
            'duty_cycle_pct' => $dutyCyclePct,
            'on_count' => $onCount,
            'avg_on_duration' => $avgOnDuration,
            'avg_off_duration' => $avgOffDuration,
        ];
    }
}
