<?php

namespace App\Jobs;

use App\Models\DeviceCalibration;
use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendCalibrationReminders implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $reminders = 0;

        // Send reminders at 30, 7, and 1 day before expiry
        foreach ([30, 7, 1] as $days) {
            $targetDate = now()->addDays($days)->toDateString();

            $calibrations = DeviceCalibration::whereDate('expires_at', $targetDate)
                ->with(['device.site'])
                ->get();

            foreach ($calibrations as $cal) {
                $orgAdmins = User::where('org_id', $cal->device->site->org_id ?? 0)
                    ->role('org_admin')
                    ->get();

                foreach ($orgAdmins as $admin) {
                    $admin->notify(new SystemNotification(
                        title: "Calibration expiring in {$days} day(s)",
                        body: "Device '{$cal->device->name}' at {$cal->device->site->name} — calibration expires {$cal->expires_at->toDateString()}.",
                        actionUrl: "/devices/{$cal->device->id}",
                        actionText: 'View device',
                    ));
                    $reminders++;
                }
            }
        }

        if ($reminders > 0) {
            Log::info("SendCalibrationReminders: sent {$reminders} reminder(s)");
        }
    }
}
