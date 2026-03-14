<?php

namespace App\Jobs;

use App\Exports\ProductsExport;
use App\Models\Product;
use App\Models\User;
use App\Notifications\ExportReadyNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Maatwebsite\Excel\Facades\Excel;

class ExportProductsJob implements ShouldQueue
{
    use Queueable;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying.
     */
    public int $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public User $user,
        public array $filters,
        public string $format = 'xlsx'
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Build query with filters
        $query = Product::with('category');

        if (! empty($this->filters['ids'])) {
            $query->whereIn('id', $this->filters['ids']);
        }

        if (! empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (! empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }

        if (! empty($this->filters['category_id'])) {
            $categoryIds = is_array($this->filters['category_id'])
                ? $this->filters['category_id']
                : [$this->filters['category_id']];
            $query->whereIn('category_id', $categoryIds);
        }

        // Generate filename
        $filename = 'exports/products-'.now()->format('Y-m-d-His').'.'.$this->format;

        // Store to disk
        $exportType = $this->format === 'csv'
            ? \Maatwebsite\Excel\Excel::CSV
            : \Maatwebsite\Excel\Excel::XLSX;

        Excel::store(new ProductsExport($query), $filename, 'local', $exportType);

        // Notify user
        $this->user->notify(new ExportReadyNotification(
            filename: basename($filename),
            downloadUrl: route('exports.download', ['path' => $filename]),
            expiresAt: now()->addDays(7)
        ));

        // Log the export
        activity()
            ->causedBy($this->user)
            ->withProperties([
                'format' => $this->format,
                'filename' => $filename,
                'count' => $query->count(),
            ])
            ->log('Products export completed (queued)');
    }
}
