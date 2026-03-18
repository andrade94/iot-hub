<?php

namespace App\Console\Commands;

use App\Mail\ComplianceReminderMail;
use App\Models\ComplianceEvent;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendComplianceRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'compliance:send-reminders
                            {--dry-run : Show what would be sent without actually sending}';

    /**
     * The console command description.
     */
    protected $description = 'Send email reminders for compliance events due in 30, 7, or 1 day(s)';

    /**
     * The reminder thresholds in days before due date.
     */
    private const REMINDER_DAYS = [30, 7, 1];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $sentCount = 0;

        $this->info('Checking compliance events for reminders...');

        foreach (self::REMINDER_DAYS as $daysBefore) {
            $targetDate = now()->addDays($daysBefore)->toDateString();

            $events = ComplianceEvent::with(['site', 'organization'])
                ->upcoming()
                ->whereDate('due_date', $targetDate)
                ->get();

            foreach ($events as $event) {
                // Check if this reminder was already sent
                $remindersSent = $event->reminders_sent ?? [];

                if (in_array($daysBefore, $remindersSent)) {
                    $this->line("  Skipping '{$event->title}' — {$daysBefore}-day reminder already sent.");

                    continue;
                }

                // Find admin users for this organization
                $admins = User::where('org_id', $event->org_id)
                    ->role('org_admin')
                    ->get();

                if ($admins->isEmpty()) {
                    $this->warn("  No admin users found for org #{$event->org_id}. Skipping '{$event->title}'.");

                    continue;
                }

                if ($dryRun) {
                    $this->line("  Would send {$daysBefore}-day reminder for '{$event->title}' to {$admins->count()} admin(s).");

                    continue;
                }

                foreach ($admins as $admin) {
                    try {
                        Mail::to($admin->email)->send(new ComplianceReminderMail($event, $daysBefore));
                        $sentCount++;
                    } catch (\Exception $e) {
                        $this->error("  Failed to send to {$admin->email}: {$e->getMessage()}");
                    }
                }

                // Update reminders_sent to avoid duplicates
                $remindersSent[] = $daysBefore;
                $event->update(['reminders_sent' => $remindersSent]);

                $this->info("  Sent {$daysBefore}-day reminder for '{$event->title}' to {$admins->count()} admin(s).");
            }
        }

        $this->newLine();

        if ($dryRun) {
            $this->warn('DRY RUN — No emails were sent.');
        } else {
            $this->info("Done. Sent {$sentCount} reminder email(s).");

            if ($sentCount > 0) {
                activity()
                    ->withProperties([
                        'emails_sent' => $sentCount,
                        'reminder_days' => self::REMINDER_DAYS,
                    ])
                    ->log('Compliance reminder emails sent');
            }
        }

        return Command::SUCCESS;
    }
}
