<?php

namespace App\Http\Controllers;

use App\Models\File;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileController extends Controller
{
    /**
     * Serve a private file.
     */
    public function serve(Request $request, File $file): StreamedResponse|Response
    {
        // Check authorization
        if (Gate::denies('view', $file)) {
            abort(403, 'Unauthorized access to file.');
        }

        $disk = Storage::disk($file->disk);
        $path = $request->query('path') === 'thumbnail' && $file->thumbnail_path
            ? $file->thumbnail_path
            : $file->path;

        if (! $disk->exists($path)) {
            abort(404, 'File not found.');
        }

        $mimeType = $file->mime_type;
        $filename = $file->original_name;

        // Stream the file
        return $disk->response($path, $filename, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Download a file.
     */
    public function download(Request $request, File $file): StreamedResponse
    {
        // Check authorization
        if (Gate::denies('view', $file)) {
            abort(403, 'Unauthorized access to file.');
        }

        $disk = Storage::disk($file->disk);

        if (! $disk->exists($file->path)) {
            abort(404, 'File not found.');
        }

        return $disk->download($file->path, $file->original_name);
    }

    /**
     * Get file metadata.
     */
    public function show(Request $request, File $file)
    {
        // Check authorization
        if (Gate::denies('view', $file)) {
            abort(403, 'Unauthorized access to file.');
        }

        return response()->json([
            'id' => $file->id,
            'name' => $file->original_name,
            'filename' => $file->filename,
            'size' => $file->size,
            'formatted_size' => $file->formatted_size,
            'mime_type' => $file->mime_type,
            'extension' => $file->extension,
            'visibility' => $file->visibility,
            'url' => $file->url,
            'thumbnail_url' => $file->thumbnail_url,
            'is_image' => $file->isImage(),
            'metadata' => $file->metadata,
            'created_at' => $file->created_at->toIso8601String(),
        ]);
    }

    /**
     * Delete a file.
     */
    public function destroy(Request $request, File $file)
    {
        // Check authorization
        if (Gate::denies('delete', $file)) {
            abort(403, 'Unauthorized to delete this file.');
        }

        activity()
            ->causedBy($request->user())
            ->withProperties([
                'filename' => $file->original_name,
                'path' => $file->path,
            ])
            ->log('File deleted');

        $file->delete();

        return response()->json([
            'success' => true,
            'message' => 'File deleted successfully.',
        ]);
    }
}
