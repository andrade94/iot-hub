<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;

class File extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'original_name',
        'filename',
        'path',
        'disk',
        'mime_type',
        'size',
        'extension',
        'visibility',
        'thumbnail_path',
        'metadata',
        'fileable_type',
        'fileable_id',
    ];

    protected $casts = [
        'size' => 'integer',
        'metadata' => 'array',
    ];

    protected $appends = ['url', 'thumbnail_url', 'formatted_size'];

    /**
     * Get the user who uploaded the file.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the parent fileable model.
     */
    public function fileable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the file URL.
     * For public files, return direct URL.
     * For private files, return signed URL.
     */
    public function getUrlAttribute(): string
    {
        if ($this->visibility === 'private') {
            return $this->getSignedUrl();
        }

        return Storage::disk($this->disk)->url($this->path);
    }

    /**
     * Get the thumbnail URL if exists.
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        if (! $this->thumbnail_path) {
            return null;
        }

        if ($this->visibility === 'private') {
            return $this->getSignedUrl($this->thumbnail_path);
        }

        return Storage::disk($this->disk)->url($this->thumbnail_path);
    }

    /**
     * Get a signed URL for private files.
     */
    public function getSignedUrl(?string $path = null, ?int $expiration = null): string
    {
        $path = $path ?? $this->path;
        $expiration = $expiration ?? config('file-storage.signed_url_expiration', 60);

        $disk = Storage::disk($this->disk);

        // For S3, use temporaryUrl
        if ($this->disk === 's3' || $this->disk === 's3-private') {
            return $disk->temporaryUrl($path, now()->addMinutes($expiration));
        }

        // For local storage, use signed route
        return route('files.serve', [
            'file' => $this->id,
            'path' => $path !== $this->path ? 'thumbnail' : null,
        ]);
    }

    /**
     * Get formatted file size.
     */
    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->size;
        $units = ['B', 'KB', 'MB', 'GB'];
        $unitIndex = 0;

        while ($bytes >= 1024 && $unitIndex < count($units) - 1) {
            $bytes /= 1024;
            $unitIndex++;
        }

        return round($bytes, 2).' '.$units[$unitIndex];
    }

    /**
     * Check if file is an image.
     */
    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    /**
     * Check if file is a PDF.
     */
    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }

    /**
     * Check if file is a document.
     */
    public function isDocument(): bool
    {
        $documentTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
        ];

        return in_array($this->mime_type, $documentTypes);
    }

    /**
     * Check if file has thumbnail.
     */
    public function hasThumbnail(): bool
    {
        return ! empty($this->thumbnail_path);
    }

    /**
     * Get file contents.
     */
    public function getContents(): string
    {
        return Storage::disk($this->disk)->get($this->path);
    }

    /**
     * Delete the file and its thumbnail from storage.
     */
    public function deleteFromStorage(): bool
    {
        $disk = Storage::disk($this->disk);

        if ($this->thumbnail_path && $disk->exists($this->thumbnail_path)) {
            $disk->delete($this->thumbnail_path);
        }

        if ($disk->exists($this->path)) {
            return $disk->delete($this->path);
        }

        return true;
    }

    /**
     * Scope for public files.
     */
    public function scopePublic($query)
    {
        return $query->where('visibility', 'public');
    }

    /**
     * Scope for private files.
     */
    public function scopePrivate($query)
    {
        return $query->where('visibility', 'private');
    }

    /**
     * Scope for images.
     */
    public function scopeImages($query)
    {
        return $query->where('mime_type', 'like', 'image/%');
    }

    /**
     * Scope for documents.
     */
    public function scopeDocuments($query)
    {
        return $query->whereIn('mime_type', [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
        ]);
    }

    /**
     * Scope for orphaned files (no fileable attached).
     */
    public function scopeOrphaned($query)
    {
        return $query->whereNull('fileable_type')->whereNull('fileable_id');
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Delete file from storage when model is deleted
        static::deleting(function (File $file) {
            $file->deleteFromStorage();
        });
    }
}
