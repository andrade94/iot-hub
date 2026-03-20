<?php

namespace App\Jobs;

use App\Models\SensorReading;
use App\Models\User;
use App\Notifications\PlatformOutageAlert;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class DetectPlatformOutage implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        // Check if ANY readings received platform-wide in last 10 minutes (BR-097)
        $hasRecentReadings = SensorReading::where('time', '>=', now()->subMinutes(10))->exists();

        if ($hasRecentReadings) {
            Redis::del('platform_outage_alerted');

            return;
        }

        // Avoid duplicate alerts: only fire once per outage window (BR-098)
        if (Redis::get('platform_outage_alerted')) {
            return;
        }

        Redis::set('platform_outage_alerted', now()->toIso8601String(), 'EX', 3600);

        $lastReading = SensorReading::orderByDesc('time')->value('time');

        Log::critical('DetectPlatformOutage: no sensor data received in 10 minutes', [
            'last_reading_at' => $lastReading,
        ]);

        // Notify all super_admins
        User::role('super_admin')->each(function (User $admin) use ($lastReading) {
            $admin->notify(new PlatformOutageAlert($lastReading));
        });
    }
}
