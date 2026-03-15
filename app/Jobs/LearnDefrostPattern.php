<?php

namespace App\Jobs;

use App\Models\Device;
use App\Services\RulesEngine\DefrostDetector;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class LearnDefrostPattern implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(
        public int $deviceId,
    ) {}

    public function handle(DefrostDetector $detector): void
    {
        $device = Device::find($this->deviceId);

        if (! $device) {
            Log::warning('LearnDefrostPattern: device not found', [
                'device_id' => $this->deviceId,
            ]);

            return;
        }

        // Only proceed if device has been reporting for at least 49 hours
        if ($device->installed_at && $device->installed_at->diffInHours(now()) < 49) {
            Log::info('LearnDefrostPattern: device too new, skipping', [
                'device_id' => $device->id,
                'installed_at' => $device->installed_at->toIso8601String(),
                'hours_since_install' => $device->installed_at->diffInHours(now()),
            ]);

            return;
        }

        Log::info('LearnDefrostPattern: analyzing device', [
            'device_id' => $device->id,
            'device_name' => $device->name,
        ]);

        // Analyze 48 hours of readings for spikes
        $allSpikes = $detector->analyzeSpikes($device, 48);

        if (empty($allSpikes)) {
            Log::info('LearnDefrostPattern: no spikes found', [
                'device_id' => $device->id,
            ]);

            return;
        }

        // Split spikes into day 1 and day 2 based on timestamps
        $cutoff = now()->subHours(24);
        $day1Spikes = [];
        $day2Spikes = [];

        foreach ($allSpikes as $spike) {
            $spikeTime = Carbon::parse($spike['time']);
            if ($spikeTime->lt($cutoff)) {
                $day1Spikes[] = $spike;
            } else {
                $day2Spikes[] = $spike;
            }
        }

        if (empty($day1Spikes) || empty($day2Spikes)) {
            Log::info('LearnDefrostPattern: spikes found but not on both days', [
                'device_id' => $device->id,
                'day1_count' => count($day1Spikes),
                'day2_count' => count($day2Spikes),
            ]);

            return;
        }

        // Detect repeating patterns
        $windows = $detector->detectPattern($day1Spikes, $day2Spikes);

        if (empty($windows)) {
            Log::info('LearnDefrostPattern: no repeating defrost pattern detected', [
                'device_id' => $device->id,
                'day1_spikes' => count($day1Spikes),
                'day2_spikes' => count($day2Spikes),
            ]);

            return;
        }

        // Create the defrost schedule
        $schedule = $detector->createSchedule($device, $windows);

        Log::info('LearnDefrostPattern: defrost schedule created', [
            'device_id' => $device->id,
            'schedule_id' => $schedule->id,
            'windows_count' => count($windows),
            'windows' => $windows,
        ]);
    }
}
