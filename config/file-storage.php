<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default File Storage Disk
    |--------------------------------------------------------------------------
    |
    | The default disk for storing files. Can be 'local', 'public', 's3', etc.
    |
    */

    'disk' => env('FILESYSTEM_DISK', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Private File Storage Disk
    |--------------------------------------------------------------------------
    |
    | The disk for storing private files that require authentication.
    |
    */

    'private_disk' => env('FILESYSTEM_PRIVATE_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Signed URL Expiration
    |--------------------------------------------------------------------------
    |
    | The number of minutes that signed URLs for private files remain valid.
    |
    */

    'signed_url_expiration' => (int) env('FILE_SIGNED_URL_EXPIRATION', 60),

    /*
    |--------------------------------------------------------------------------
    | Maximum File Size
    |--------------------------------------------------------------------------
    |
    | The maximum allowed file size in megabytes.
    |
    */

    'max_size' => (int) env('FILE_MAX_SIZE_MB', 10),

    /*
    |--------------------------------------------------------------------------
    | Image Optimization
    |--------------------------------------------------------------------------
    |
    | Whether to optimize and create thumbnails for uploaded images.
    |
    */

    'optimize_images' => env('FILE_OPTIMIZE_IMAGES', true),

    /*
    |--------------------------------------------------------------------------
    | Thumbnail Dimensions
    |--------------------------------------------------------------------------
    |
    | The maximum width and height for generated thumbnails.
    |
    */

    'thumbnail' => [
        'width' => (int) env('FILE_THUMBNAIL_WIDTH', 300),
        'height' => (int) env('FILE_THUMBNAIL_HEIGHT', 300),
        'quality' => (int) env('FILE_THUMBNAIL_QUALITY', 80),
    ],

    /*
    |--------------------------------------------------------------------------
    | Allowed MIME Types
    |--------------------------------------------------------------------------
    |
    | The MIME types that are allowed for upload.
    |
    */

    'allowed_mime_types' => [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',

        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
    ],

    /*
    |--------------------------------------------------------------------------
    | Magic Bytes Configuration
    |--------------------------------------------------------------------------
    |
    | File signatures (magic bytes) for validating file types.
    |
    */

    'magic_bytes' => [
        'image/jpeg' => ["\xFF\xD8\xFF"],
        'image/png' => ["\x89\x50\x4E\x47\x0D\x0A\x1A\x0A"],
        'image/gif' => ['GIF87a', 'GIF89a'],
        'image/webp' => ['RIFF'],
        'application/pdf' => ['%PDF'],
        'application/zip' => ["PK\x03\x04", "PK\x05\x06"],
        // DOCX, XLSX are ZIP-based
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ["PK\x03\x04"],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => ["PK\x03\x04"],
    ],

    /*
    |--------------------------------------------------------------------------
    | Upload Paths
    |--------------------------------------------------------------------------
    |
    | The paths where different types of files should be stored.
    |
    */

    'paths' => [
        'default' => 'uploads',
        'images' => 'uploads/images',
        'documents' => 'uploads/documents',
        'thumbnails' => 'uploads/thumbnails',
    ],

    /*
    |--------------------------------------------------------------------------
    | Orphan Cleanup Settings
    |--------------------------------------------------------------------------
    |
    | Settings for cleaning up orphaned files.
    |
    */

    'orphan_cleanup' => [
        // Files older than this many hours without attachment will be deleted
        'hours' => (int) env('FILE_ORPHAN_CLEANUP_HOURS', 24),
    ],

];
