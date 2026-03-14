<?php

namespace App\Console\Commands;

use App\Models\File;
use Illuminate\Console\Command;

class CleanupOrphanedFilesCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'files:cleanup-orphaned
                            {--hours= : Hours threshold for orphaned files (default from config)}
                            {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     */
    protected $description = 'Clean up orphaned files that are not attached to any model';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $hours = $this->option('hours') ?? config('file-storage.orphan_cleanup.hours', 24);
        $dryRun = $this->option('dry-run');

        $this->info("Finding orphaned files older than {$hours} hours...");

        $query = File::orphaned()
            ->where('created_at', '<', now()->subHours($hours));

        $count = $query->count();

        if ($count === 0) {
            $this->info('No orphaned files found.');

            return Command::SUCCESS;
        }

        $this->info("Found {$count} orphaned file(s).");

        if ($dryRun) {
            $this->warn('DRY RUN - No files will be deleted.');
            $this->newLine();

            $query->get()->each(function (File $file) {
                $this->line("  - {$file->original_name} ({$file->formatted_size}) - Created: {$file->created_at}");
            });

            return Command::SUCCESS;
        }

        if (! $this->confirm('Do you want to delete these files?')) {
            $this->info('Operation cancelled.');

            return Command::SUCCESS;
        }

        $deleted = 0;
        $failed = 0;

        $this->withProgressBar($query->get(), function (File $file) use (&$deleted, &$failed) {
            try {
                $file->delete();
                $deleted++;
            } catch (\Exception $e) {
                $failed++;
                $this->error("Failed to delete {$file->original_name}: {$e->getMessage()}");
            }
        });

        $this->newLine(2);
        $this->info("Cleanup complete. Deleted: {$deleted}, Failed: {$failed}");

        // Log the cleanup
        activity()
            ->withProperties([
                'deleted' => $deleted,
                'failed' => $failed,
                'hours_threshold' => $hours,
            ])
            ->log('Orphaned files cleanup completed');

        return Command::SUCCESS;
    }
}
