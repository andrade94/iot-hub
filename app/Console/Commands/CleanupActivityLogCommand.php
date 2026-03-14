<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Activitylog\Models\Activity;

class CleanupActivityLogCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'activitylog:cleanup
                            {--days=90 : Delete activity log entries older than this many days}
                            {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     */
    protected $description = 'Clean up old activity log entries from the database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $dryRun = $this->option('dry-run');

        $this->info("Cleaning up activity log entries older than {$days} days...");

        // Count entries to delete
        $count = Activity::where('created_at', '<', now()->subDays($days))->count();

        if ($count === 0) {
            $this->info('No old activity log entries found.');

            return Command::SUCCESS;
        }

        $this->info("Found {$count} activity log entries to delete.");

        if ($dryRun) {
            $this->warn('DRY RUN - No entries will be deleted.');

            return Command::SUCCESS;
        }

        if (! $this->confirm('Do you want to delete these entries?', true)) {
            $this->info('Operation cancelled.');

            return Command::SUCCESS;
        }

        // Delete in batches to avoid memory issues
        $deleted = 0;
        $batchSize = 1000;

        while (true) {
            $batch = Activity::where('created_at', '<', now()->subDays($days))
                ->limit($batchSize)
                ->delete();

            if ($batch === 0) {
                break;
            }

            $deleted += $batch;
            $this->output->write('.');
        }

        $this->newLine();
        $this->info("Deleted {$deleted} activity log entries.");

        return Command::SUCCESS;
    }
}
