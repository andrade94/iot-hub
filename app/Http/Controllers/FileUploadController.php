<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Services\FileStorageService;
use App\Services\FileValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class FileUploadController extends Controller
{
    public function __construct(
        protected FileStorageService $storageService,
        protected FileValidationService $validationService
    ) {}

    /**
     * Upload a file
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file',
            'visibility' => 'sometimes|in:public,private',
            'collection' => 'sometimes|string|max:100',
        ]);

        $uploadedFile = $request->file('file');

        if (! $uploadedFile) {
            return response()->json(['error' => 'No file provided'], 400);
        }

        try {
            $file = $this->storageService->store(
                uploadedFile: $uploadedFile,
                userId: $request->user()?->id,
                visibility: $request->input('visibility', 'public'),
                collection: $request->input('collection'),
                metadata: $request->input('metadata', [])
            );

            return response()->json([
                'success' => true,
                'file' => $this->formatFileResponse($file),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            report($e);

            return response()->json([
                'success' => false,
                'error' => 'Failed to upload file.',
            ], 500);
        }
    }

    /**
     * Upload multiple files
     */
    public function uploadMultiple(Request $request): JsonResponse
    {
        $request->validate([
            'files' => 'required|array|max:10',
            'files.*' => 'file',
            'visibility' => 'sometimes|in:public,private',
            'collection' => 'sometimes|string|max:100',
        ]);

        $uploadedFiles = $request->file('files');

        if (empty($uploadedFiles)) {
            return response()->json(['error' => 'No files provided'], 400);
        }

        try {
            $files = $this->storageService->storeMultiple(
                uploadedFiles: $uploadedFiles,
                userId: $request->user()?->id,
                visibility: $request->input('visibility', 'public'),
                collection: $request->input('collection'),
                metadata: $request->input('metadata', [])
            );

            return response()->json([
                'success' => true,
                'files' => array_map(fn ($file) => $this->formatFileResponse($file), $files),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            report($e);

            return response()->json([
                'success' => false,
                'error' => 'Failed to upload files.',
            ], 500);
        }
    }

    /**
     * Delete a file by ID
     */
    public function destroy(Request $request, File $file): JsonResponse
    {
        if (Gate::denies('delete', $file)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to delete this file.',
            ], 403);
        }

        try {
            $this->storageService->delete($file, $request->user()?->id);

            return response()->json([
                'success' => true,
                'message' => 'File deleted successfully.',
            ]);
        } catch (\Exception $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete file.',
            ], 500);
        }
    }

    /**
     * Delete a file by path (legacy support)
     */
    public function delete(Request $request, string $path): JsonResponse
    {
        // Find file by path
        $file = File::where('path', $path)
            ->orWhere('path', 'like', '%'.$path)
            ->first();

        if (! $file) {
            return response()->json([
                'success' => false,
                'message' => 'File not found.',
            ], 404);
        }

        return $this->destroy($request, $file);
    }

    /**
     * Change file visibility
     */
    public function updateVisibility(Request $request, File $file): JsonResponse
    {
        if (Gate::denies('update', $file)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to update this file.',
            ], 403);
        }

        $request->validate([
            'visibility' => 'required|in:public,private',
        ]);

        try {
            $file = $this->storageService->changeVisibility(
                $file,
                $request->input('visibility')
            );

            return response()->json([
                'success' => true,
                'file' => $this->formatFileResponse($file),
            ]);
        } catch (\Exception $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update file visibility.',
            ], 500);
        }
    }

    /**
     * Get allowed file types information
     */
    public function allowedTypes(): JsonResponse
    {
        return response()->json([
            'mime_types' => config('file-storage.allowed_mime_types', []),
            'max_size_mb' => config('file-storage.max_size', 10),
            'description' => $this->validationService->getAllowedTypesDescription(),
        ]);
    }

    /**
     * Format file response
     */
    protected function formatFileResponse(File $file): array
    {
        return [
            'id' => $file->id,
            'name' => $file->original_name,
            'filename' => $file->filename,
            'path' => $file->path,
            'url' => $file->url,
            'thumbnail_url' => $file->thumbnail_url,
            'size' => $file->size,
            'formatted_size' => $file->formatted_size,
            'mime_type' => $file->mime_type,
            'extension' => $file->extension,
            'visibility' => $file->visibility,
            'is_image' => $file->isImage(),
            'has_thumbnail' => $file->hasThumbnail(),
            'uploaded_at' => $file->created_at->toIso8601String(),
        ];
    }
}
