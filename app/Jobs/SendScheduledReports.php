<?php

namespace App\Jobs;

use App\Models\ReportSchedule;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendScheduledReports implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $schedules = ReportSchedule::active()
            ->with(['site', 'organization'])
            ->get()
            ->filter(fn ($schedule) => $schedule->shouldFireToday());

        foreach ($schedules as $schedule) {
            try {
                $this->sendReport($schedule);
                $schedule->update(['last_sent_at' => now(), 'last_error' => null]);
            } catch (\Throwable $e) {
                $schedule->update(['last_error' => $e->getMessage()]);
                Log::error('SendScheduledReports: failed to send', [
                    'schedule_id' => $schedule->id,
                    'type' => $schedule->type,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info("SendScheduledReports: processed {$schedules->count()} schedules");
    }

    private function sendReport(ReportSchedule $schedule): void
    {
        $recipients = $schedule->recipients_json;

        if (empty($recipients)) {
            return;
        }

        // Generate report data based on type
        $reportData = $this->generateReportData($schedule);

        // Send email to each recipient
        foreach ($recipients as $email) {
            Mail::raw(
                "Scheduled report: {$schedule->type} for " .
                    ($schedule->site?->name ?? $schedule->organization->name) .
                    "\n\nGenerated: " . now()->toDateTimeString() .
                    "\n\nThis is an automated report from the Astrea IoT Platform.",
                function ($message) use ($email, $schedule) {
                    $message->to($email)
                        ->subject("Astrea Report: " . ucwords(str_replace('_', ' ', $schedule->type)));
                }
            );
        }

        Log::info("SendScheduledReports: sent {$schedule->type} to " . count($recipients) . " recipients");
    }

    private function generateReportData(ReportSchedule $schedule): array
    {
        // Report generation delegates to existing services
        // Full PDF attachment will be added when TemperatureReport::generatePdf() is implemented
        return [
            'type' => $schedule->type,
            'site' => $schedule->site?->name,
            'org' => $schedule->organization->name,
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
