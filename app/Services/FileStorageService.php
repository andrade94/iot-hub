<?php

namespace App\Services;

use App\Jobs\ProcessUploadedImage;
use App\Models\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileStorageService
{
    public function __construct(
        protected FileValidationService $validator,
        protected ImageOptimizationService $imageOptimizer
    ) {}

    /**
     * Store an uploaded file.
     */
    public function store(
        UploadedFile $uploadedFile,
        ?int $userId = null,
        string $visibility = 'public',
        ?string $collection = null,
        array $metadata = []
    ): File {
        // Validate the file
        $this->validator->validate($uploadedFile);

        // Determine disk and path
        $disk = $this->getDiskForVisibility($visibility);
        $path = $this->getStoragePath($uploadedFile, $collection);

        // Generate unique filename
        $filename = $this->generateFilename($uploadedFile);

        // Store the file
        $storedPath = $uploadedFile->storeAs($path, $filename, $disk);

        // Create file record
        $file = File::create([
            'user_id' => $userId,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'filename' => $filename,
            'path' => $storedPath,
            'disk' => $disk,
            'mime_type' => $uploadedFile->getMimeType(),
            'size' => $uploadedFile->getSize(),
            'extension' => $uploadedFile->getClientOriginalExtension(),
            'visibility' => $visibility,
            'metadata' => $metadata,
        ]);

        // Process image if applicable
        if ($this->shouldOptimizeImage($uploadedFile)) {
            ProcessUploadedImage::dispatch($file);
        }

        // Log activity
        if ($userId) {
            activity()
                ->causedBy($userId)
                ->performedOn($file)
                ->withProperties([
                    'filename' => $file->original_name,
                    'size' => $file->formatted_size,
                    'visibility' => $visibility,
                ])
                ->log('File uploaded');
        }

        return $file;
    }

    /**
     * Store multiple files.
     */
    public function storeMultiple(
        array $uploadedFiles,
        ?int $userId = null,
        string $visibility = 'public',
        ?string $collection = null,
        array $metadata = []
    ): array {
        $files = [];

        foreach ($uploadedFiles as $uploadedFile) {
            $files[] = $this->store($uploadedFile, $userId, $visibility, $collection, $metadata);
        }

        return $files;
    }

    /**
     * Delete a file.
     */
    public function delete(File $file, ?int $userId = null): bool
    {
        // Log activity before deletion
        if ($userId) {
            activity()
                ->causedBy($userId)
                ->withProperties([
                    'filename' => $file->original_name,
                    'path' => $file->path,
                ])
                ->log('File deleted');
        }

        return $file->delete();
    }

    /**
     * Move file to different visibility.
     */
    public function changeVisibility(File $file, string $visibility): File
    {
        if ($file->visibility === $visibility) {
            return $file;
        }

        $newDisk = $this->getDiskForVisibility($visibility);
        $oldDisk = Storage::disk($file->disk);
        $newDiskStorage = Storage::disk($newDisk);

        // Move main file
        $contents = $oldDisk->get($file->path);
        $newDiskStorage->put($file->path, $contents);
        $oldDisk->delete($file->path);

        // Move thumbnail if exists
        if ($file->thumbnail_path) {
            $thumbnailContents = $oldDisk->get($file->thumbnail_path);
            $newDiskStorage->put($file->thumbnail_path, $thumbnailContents);
            $oldDisk->delete($file->thumbnail_path);
        }

        $file->update([
            'disk' => $newDisk,
            'visibility' => $visibility,
        ]);

        return $file->fresh();
    }

    /**
     * Attach file to a model.
     */
    public function attachTo(File $file, $model): File
    {
        $file->update([
            'fileable_type' => get_class($model),
            'fileable_id' => $model->getKey(),
        ]);

        return $file->fresh();
    }

    /**
     * Detach file from model.
     */
    public function detach(File $file): File
    {
        $file->update([
            'fileable_type' => null,
            'fileable_id' => null,
        ]);

        return $file->fresh();
    }

    /**
     * Get disk based on visibility.
     */
    protected function getDiskForVisibility(string $visibility): string
    {
        if ($visibility === 'private') {
            return config('file-storage.private_disk', 'local');
        }

        return config('file-storage.disk', 'public');
    }

    /**
     * Get storage path for file.
     */
    protected function getStoragePath(UploadedFile $file, ?string $collection = null): string
    {
        $basePath = config('file-storage.paths.default', 'uploads');

        if ($collection) {
            return $basePath.'/'.$collection;
        }

        // Organize by type
        if (str_starts_with($file->getMimeType(), 'image/')) {
            return config('file-storage.paths.images', 'uploads/images');
        }

        return config('file-storage.paths.documents', 'uploads/documents');
    }

    /**
     * Generate unique filename.
     */
    protected function generateFilename(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension();

        return Str::uuid().'.'.$extension;
    }

    /**
     * Check if image should be optimized.
     */
    protected function shouldOptimizeImage(UploadedFile $file): bool
    {
        if (! config('file-storage.optimize_images', true)) {
            return false;
        }

        $mimeType = $file->getMimeType();

        return in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp']);
    }
}
