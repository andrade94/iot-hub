<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class FileValidationService
{
    /**
     * Validate an uploaded file.
     *
     * @throws ValidationException
     */
    public function validate(UploadedFile $file): void
    {
        $this->validateSize($file);
        $this->validateMimeType($file);
        $this->validateMagicBytes($file);
    }

    /**
     * Validate file size.
     *
     * @throws ValidationException
     */
    protected function validateSize(UploadedFile $file): void
    {
        $maxSize = config('file-storage.max_size', 10) * 1024 * 1024; // Convert MB to bytes

        if ($file->getSize() > $maxSize) {
            throw ValidationException::withMessages([
                'file' => ['File size exceeds the maximum allowed size of '.config('file-storage.max_size').'MB.'],
            ]);
        }
    }

    /**
     * Validate file MIME type.
     *
     * @throws ValidationException
     */
    protected function validateMimeType(UploadedFile $file): void
    {
        $allowedTypes = config('file-storage.allowed_mime_types', []);
        $mimeType = $file->getMimeType();

        if (! empty($allowedTypes) && ! in_array($mimeType, $allowedTypes)) {
            throw ValidationException::withMessages([
                'file' => ['File type "'.$mimeType.'" is not allowed.'],
            ]);
        }
    }

    /**
     * Validate file magic bytes to prevent spoofed file types.
     *
     * @throws ValidationException
     */
    protected function validateMagicBytes(UploadedFile $file): void
    {
        $mimeType = $file->getMimeType();
        $magicBytesConfig = config('file-storage.magic_bytes', []);

        // Skip validation for types without configured magic bytes
        if (! isset($magicBytesConfig[$mimeType])) {
            return;
        }

        $expectedSignatures = $magicBytesConfig[$mimeType];
        $handle = fopen($file->getPathname(), 'rb');

        if (! $handle) {
            throw ValidationException::withMessages([
                'file' => ['Unable to read file for validation.'],
            ]);
        }

        // Read first 16 bytes for signature check
        $header = fread($handle, 16);
        fclose($handle);

        if ($header === false) {
            throw ValidationException::withMessages([
                'file' => ['Unable to read file header for validation.'],
            ]);
        }

        $isValid = false;

        foreach ($expectedSignatures as $signature) {
            if ($this->matchesSignature($header, $signature)) {
                $isValid = true;
                break;
            }
        }

        if (! $isValid) {
            throw ValidationException::withMessages([
                'file' => ['File content does not match its declared type. Possible file type spoofing detected.'],
            ]);
        }
    }

    /**
     * Check if file header matches a signature.
     */
    protected function matchesSignature(string $header, string $signature): bool
    {
        // Handle WebP which has RIFF at offset 0 and WEBP at offset 8
        if ($signature === 'RIFF') {
            return str_starts_with($header, 'RIFF') && substr($header, 8, 4) === 'WEBP';
        }

        return str_starts_with($header, $signature);
    }

    /**
     * Get human-readable list of allowed file types.
     */
    public function getAllowedTypesDescription(): string
    {
        $allowedTypes = config('file-storage.allowed_mime_types', []);
        $extensions = [];

        $mimeToExtension = [
            'image/jpeg' => 'JPG/JPEG',
            'image/png' => 'PNG',
            'image/gif' => 'GIF',
            'image/webp' => 'WebP',
            'image/svg+xml' => 'SVG',
            'application/pdf' => 'PDF',
            'application/msword' => 'DOC',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'DOCX',
            'application/vnd.ms-excel' => 'XLS',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'XLSX',
            'text/plain' => 'TXT',
            'text/csv' => 'CSV',
        ];

        foreach ($allowedTypes as $mimeType) {
            if (isset($mimeToExtension[$mimeType])) {
                $extensions[] = $mimeToExtension[$mimeType];
            }
        }

        return implode(', ', array_unique($extensions));
    }
}
