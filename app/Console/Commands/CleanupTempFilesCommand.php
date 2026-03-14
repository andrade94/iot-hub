<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class CleanupTempFilesCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'files:cleanup-temp
                            {--hours=24 : Delete temp files older than this many hours}
                            {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     */
    protected $description = 'Clean up temporary files from storage';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $hours = (int) $this->option('hours');
        $dryRun = $this->option('dry-run');

        $this->info("Cleaning up temp files older than {$hours} hours...");

        $directories = [
            storage_path('app/temp'),
            storage_path('framework/cache/data'),
        ];

        $totalDeleted = 0;
        $totalSize = 0;

        foreach ($directories as $directory) {
            if (! File::isDirectory($directory)) {
                continue;
            }

            $files = File::allFiles($directory);

            foreach ($files as $file) {
                $lastModified = $file->getMTime();
                $threshold = now()->subHours($hours)->timestamp;

                if ($lastModified < $threshold) {
                    $totalSize += $file->getSize();

                    if (! $dryRun) {
                        File::delete($file->getPathname());
                    }

                    $totalDeleted++;

                    if ($this->output->isVerbose()) {
                        $this->line('  - '.$file->getPathname());
                    }
                }
            }
        }

        // Format size
        $formattedSize = $this->formatBytes($totalSize);

        if ($dryRun) {
            $this->warn('DRY RUN - No files were deleted.');
            $this->info("Would delete {$totalDeleted} file(s) ({$formattedSize}).");
        } else {
            $this->info("Deleted {$totalDeleted} file(s) ({$formattedSize}).");
        }

        // Clean up empty directories
        if (! $dryRun) {
            foreach ($directories as $directory) {
                $this->cleanEmptyDirectories($directory);
            }
        }

        // Log the cleanup
        activity()
            ->withProperties([
                'files_deleted' => $totalDeleted,
                'bytes_freed' => $totalSize,
                'hours_threshold' => $hours,
            ])
            ->log('Temp files cleanup completed');

        return Command::SUCCESS;
    }

    /**
     * Recursively clean empty directories.
     */
    protected function cleanEmptyDirectories(string $directory): void
    {
        if (! File::isDirectory($directory)) {
            return;
        }

        $subdirectories = File::directories($directory);

        foreach ($subdirectories as $subdir) {
            $this->cleanEmptyDirectories($subdir);
        }

        // Check if directory is now empty
        $items = File::allFiles($directory);
        $subdirs = File::directories($directory);

        if (empty($items) && empty($subdirs) && $directory !== storage_path('app/temp')) {
            File::deleteDirectory($directory);
        }
    }

    /**
     * Format bytes to human-readable size.
     */
    protected function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $unitIndex = 0;

        while ($bytes >= 1024 && $unitIndex < count($units) - 1) {
            $bytes /= 1024;
            $unitIndex++;
        }

        return round($bytes, 2).' '.$units[$unitIndex];
    }
}
