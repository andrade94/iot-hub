<?php

namespace App\Services;

use App\Models\File;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ImageOptimizationService
{
    protected ImageManager $manager;

    public function __construct()
    {
        $this->manager = new ImageManager(new Driver);
    }

    /**
     * Process an uploaded image - optimize and create thumbnail.
     */
    public function process(File $file): File
    {
        if (! $file->isImage()) {
            return $file;
        }

        // Skip SVG files
        if ($file->mime_type === 'image/svg+xml') {
            return $file;
        }

        $disk = Storage::disk($file->disk);
        $contents = $disk->get($file->path);

        // Create thumbnail
        $thumbnailPath = $this->createThumbnail($file, $contents);

        if ($thumbnailPath) {
            $file->update(['thumbnail_path' => $thumbnailPath]);
        }

        return $file->fresh();
    }

    /**
     * Create a thumbnail for the image.
     */
    protected function createThumbnail(File $file, string $contents): ?string
    {
        try {
            $width = config('file-storage.thumbnail.width', 300);
            $height = config('file-storage.thumbnail.height', 300);
            $quality = config('file-storage.thumbnail.quality', 80);

            $image = $this->manager->read($contents);

            // Scale down maintaining aspect ratio
            $image->scaleDown(width: $width, height: $height);

            // Encode with quality
            $encoded = match ($file->mime_type) {
                'image/png' => $image->toPng(),
                'image/webp' => $image->toWebp(quality: $quality),
                default => $image->toJpeg(quality: $quality),
            };

            // Generate thumbnail path
            $thumbnailPath = $this->getThumbnailPath($file);

            // Store thumbnail
            $disk = Storage::disk($file->disk);
            $disk->put($thumbnailPath, (string) $encoded);

            return $thumbnailPath;
        } catch (\Exception $e) {
            report($e);

            return null;
        }
    }

    /**
     * Get thumbnail storage path.
     */
    protected function getThumbnailPath(File $file): string
    {
        $thumbnailDir = config('file-storage.paths.thumbnails', 'uploads/thumbnails');
        $pathInfo = pathinfo($file->path);

        return $thumbnailDir.'/'.$pathInfo['filename'].'_thumb.'.$pathInfo['extension'];
    }

    /**
     * Resize an image to specific dimensions.
     */
    public function resize(File $file, int $width, int $height, bool $maintainAspect = true): string
    {
        if (! $file->isImage() || $file->mime_type === 'image/svg+xml') {
            return $file->getContents();
        }

        $disk = Storage::disk($file->disk);
        $contents = $disk->get($file->path);

        $image = $this->manager->read($contents);

        if ($maintainAspect) {
            $image->scaleDown(width: $width, height: $height);
        } else {
            $image->cover($width, $height);
        }

        $quality = config('file-storage.thumbnail.quality', 80);

        $encoded = match ($file->mime_type) {
            'image/png' => $image->toPng(),
            'image/webp' => $image->toWebp(quality: $quality),
            default => $image->toJpeg(quality: $quality),
        };

        return (string) $encoded;
    }

    /**
     * Get image dimensions.
     */
    public function getDimensions(File $file): ?array
    {
        if (! $file->isImage() || $file->mime_type === 'image/svg+xml') {
            return null;
        }

        try {
            $disk = Storage::disk($file->disk);
            $contents = $disk->get($file->path);

            $image = $this->manager->read($contents);

            return [
                'width' => $image->width(),
                'height' => $image->height(),
            ];
        } catch (\Exception $e) {
            return null;
        }
    }
}
