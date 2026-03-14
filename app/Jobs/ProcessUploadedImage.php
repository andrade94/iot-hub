<?php

namespace App\Jobs;

use App\Models\File;
use App\Services\ImageOptimizationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessUploadedImage implements ShouldQueue
{
    use Queueable;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 30;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public File $file
    ) {}

    /**
     * Execute the job.
     */
    public function handle(ImageOptimizationService $imageOptimizer): void
    {
        // Skip if file was deleted
        if (! $this->file->exists) {
            return;
        }

        // Skip non-image files
        if (! $this->file->isImage()) {
            return;
        }

        $imageOptimizer->process($this->file);
    }

    /**
     * Determine the time at which the job should timeout.
     */
    public function retryUntil(): \DateTime
    {
        return now()->addMinutes(5);
    }
}
