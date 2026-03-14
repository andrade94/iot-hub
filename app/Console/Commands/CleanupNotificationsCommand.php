<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Notifications\DatabaseNotification;

class CleanupNotificationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'notifications:cleanup
                            {--days=30 : Delete read notifications older than this many days}
                            {--unread-days=90 : Delete unread notifications older than this many days}
                            {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     */
    protected $description = 'Clean up old notifications from the database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $readDays = (int) $this->option('days');
        $unreadDays = (int) $this->option('unread-days');
        $dryRun = $this->option('dry-run');

        $this->info('Cleaning up old notifications...');

        // Count read notifications to delete
        $readCount = DatabaseNotification::whereNotNull('read_at')
            ->where('read_at', '<', now()->subDays($readDays))
            ->count();

        // Count unread notifications to delete
        $unreadCount = DatabaseNotification::whereNull('read_at')
            ->where('created_at', '<', now()->subDays($unreadDays))
            ->count();

        if ($dryRun) {
            $this->warn('DRY RUN - No notifications will be deleted.');
            $this->info("Would delete {$readCount} read notification(s) older than {$readDays} days.");
            $this->info("Would delete {$unreadCount} unread notification(s) older than {$unreadDays} days.");

            return Command::SUCCESS;
        }

        // Delete read notifications
        $deleted = DatabaseNotification::whereNotNull('read_at')
            ->where('read_at', '<', now()->subDays($readDays))
            ->delete();

        $this->info("Deleted {$deleted} read notification(s) older than {$readDays} days.");

        // Delete old unread notifications
        $deletedUnread = DatabaseNotification::whereNull('read_at')
            ->where('created_at', '<', now()->subDays($unreadDays))
            ->delete();

        $this->info("Deleted {$deletedUnread} unread notification(s) older than {$unreadDays} days.");

        // Log the cleanup
        activity()
            ->withProperties([
                'read_deleted' => $deleted,
                'unread_deleted' => $deletedUnread,
                'read_days_threshold' => $readDays,
                'unread_days_threshold' => $unreadDays,
            ])
            ->log('Notifications cleanup completed');

        return Command::SUCCESS;
    }
}
