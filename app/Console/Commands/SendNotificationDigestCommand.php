<?php

namespace App\Console\Commands;

use App\Mail\NotificationDigestMail;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendNotificationDigestCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'notifications:send-digest
                            {--period=daily : The digest period (daily or weekly)}
                            {--dry-run : Show what would be sent without actually sending}';

    /**
     * The console command description.
     */
    protected $description = 'Send notification digest emails to users with unread notifications';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $period = $this->option('period');
        $dryRun = $this->option('dry-run');

        if (! in_array($period, ['daily', 'weekly'])) {
            $this->error('Invalid period. Must be "daily" or "weekly".');

            return Command::FAILURE;
        }

        // Skip if mail is set to log (development)
        if (config('mail.mailer') === 'log') {
            $this->info('Mail driver is set to "log". Skipping digest emails.');

            return Command::SUCCESS;
        }

        $this->info("Sending {$period} notification digests...");

        $since = $period === 'weekly' ? now()->subWeek() : now()->subDay();

        // Get users with unread notifications
        $users = User::whereHas('notifications', function ($query) use ($since) {
            $query->whereNull('read_at')
                ->where('created_at', '>=', $since);
        })->get();

        $sentCount = 0;

        $this->withProgressBar($users, function (User $user) use ($since, $period, $dryRun, &$sentCount) {
            $notifications = $user->unreadNotifications()
                ->where('created_at', '>=', $since)
                ->latest()
                ->get();

            if ($notifications->isEmpty()) {
                return;
            }

            if ($dryRun) {
                $this->newLine();
                $this->line("  Would send to {$user->email}: {$notifications->count()} notification(s)");

                return;
            }

            try {
                Mail::send(new NotificationDigestMail($user, $notifications, $period));
                $sentCount++;
            } catch (\Exception $e) {
                $this->newLine();
                $this->error("  Failed to send to {$user->email}: {$e->getMessage()}");
            }
        });

        $this->newLine(2);

        if ($dryRun) {
            $this->warn('DRY RUN - No emails were sent.');
        } else {
            $this->info("Sent {$sentCount} digest email(s).");

            // Log the activity
            activity()
                ->withProperties([
                    'emails_sent' => $sentCount,
                    'period' => $period,
                ])
                ->log('Notification digest emails sent');
        }

        return Command::SUCCESS;
    }
}
