# File Upload

This template includes a complete file upload system with drag & drop, progress tracking, and beautiful UI powered by react-dropzone and shadcn/ui components.

## Features

- ✅ Drag & drop file upload
- ✅ Multiple file support
- ✅ File type validation
- ✅ File size validation
- ✅ Image preview thumbnails
- ✅ Upload progress tracking
- ✅ Error handling
- ✅ Beautiful shadcn/Tailwind styling
- ✅ Dark mode support
- ✅ Activity logging integration

---

## Quick Start

### Basic Usage

```tsx
import { FileUpload } from '@/components/ui/file-upload';

export default function MyPage() {
    return (
        <FileUpload
            onUpload={(files) => console.log('Uploaded:', files)}
            onError={(error) => console.error(error)}
            maxSize={10} // 10MB
            acceptedTypes={['image/*', '.pdf']}
            multiple={true}
        />
    );
}
```

That's it! You have a fully functional file upload with drag & drop.

---

## Components

### FileUpload

Main drag & drop component with react-dropzone integration.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onUpload` | `(files: UploadedFile[]) => void` | - | Called when files are successfully uploaded |
| `onError` | `(error: string) => void` | - | Called when an error occurs |
| `maxSize` | `number` | `10` | Maximum file size in MB |
| `acceptedTypes` | `string[]` | `undefined` | Accepted MIME types or extensions |
| `multiple` | `boolean` | `true` | Allow multiple files |
| `showProgress` | `boolean` | `true` | Show upload progress |
| `className` | `string` | - | Custom className |

**Example:**

```tsx
<FileUpload
    onUpload={(files) => {
        console.log('Files uploaded:', files);
        // files is an array of UploadedFile objects
    }}
    onError={(error) => {
        toast({ title: 'Error', description: error, variant: 'destructive' });
    }}
    maxSize={5}
    acceptedTypes={['image/jpeg', 'image/png', 'image/gif']}
    multiple={true}
/>
```

### FilePreview

Display uploaded files with preview and status.

```tsx
import { FilePreview } from '@/components/ui/file-preview';

<FilePreview
    file={uploadedFile}
    onRemove={() => handleRemove()}
    showProgress={true}
/>
```

---

## Hook: useFileUpload

Custom hook for programmatic file uploads.

```tsx
import { useFileUpload } from '@/hooks/use-file-upload';

function MyComponent() {
    const {
        uploads,          // Array of upload progress
        isUploading,      // Boolean: currently uploading
        uploadFile,       // Upload single file
        uploadFiles,      // Upload multiple files
        deleteFile,       // Delete uploaded file
        clearUploads,     // Clear all uploads
        removeUpload,     // Remove specific upload
    } = useFileUpload({
        maxSize: 10,
        acceptedTypes: ['image/*'],
        onSuccess: (file) => console.log('Uploaded:', file),
        onError: (error) => console.error(error),
    });

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            uploadFiles(Array.from(e.target.files));
        }
    };

    return (
        <div>
            <input type="file" multiple onChange={handleFileInput} />
            {isUploading && <p>Uploading...</p>}
        </div>
    );
}
```

---

## Utility Functions

The `file.ts` utility provides helpful functions:

```tsx
import {
    formatFileSize,
    getFileExtension,
    isImage,
    isPDF,
    isDocument,
    getFileIcon,
    validateFileSize,
    validateFileType,
    createFilePreview,
    downloadFile,
    copyFileUrl,
} from '@/utils/file';

// Format file size
formatFileSize(1024000); // "1 MB"

// Check file type
isImage(file); // true/false
isPDF(file); // true/false

// Get file icon name (Lucide icon)
getFileIcon(file); // "Image", "FileText", "File", etc.

// Validate
const validation = validateFileSize(file, 10); // max 10MB
if (!validation.valid) {
    console.error(validation.error);
}

// Create image preview
const preview = await createFilePreview(file);
// Returns base64 data URL

// Download file
downloadFile(url, 'filename.pdf');

// Copy URL to clipboard
await copyFileUrl(url);
```

---

## Backend API

### Upload Single File

**POST** `/upload`

```ts
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/upload', {
    method: 'POST',
    headers: {
        'X-CSRF-TOKEN': csrfToken,
    },
    body: formData,
});

const data = await response.json();
// {
//   success: true,
//   file: {
//     id: "uuid",
//     name: "photo.jpg",
//     path: "uploads/uuid.jpg",
//     url: "/storage/uploads/uuid.jpg",
//     size: 123456,
//     mime_type: "image/jpeg",
//     extension: "jpg",
//     uploaded_at: "2024-01-01T00:00:00Z"
//   }
// }
```

### Upload Multiple Files

**POST** `/upload/multiple`

```ts
const formData = new FormData();
files.forEach(file => formData.append('files[]', file));

const response = await fetch('/upload/multiple', {
    method: 'POST',
    headers: {
        'X-CSRF-TOKEN': csrfToken,
    },
    body: formData,
});
```

### Delete File

**DELETE** `/upload/{path}`

```ts
router.delete(`/upload/${encodeURIComponent(file.path)}`);
```

---

## Configuration

### Allowed File Types

Edit `FileUploadController.php`:

```php
protected array $allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    // Add more types...
];
```

### Max File Size

Edit `FileUploadController.php`:

```php
protected int $maxFileSize = 10240; // 10MB in KB
```

Or configure in Laravel:

```php
// config/app.php or .env
'upload_max_filesize' => '10M',
'post_max_size' => '10M',
```

### Storage Configuration

Files are stored in `storage/app/public/uploads/`.

To make storage public:

```bash
php artisan storage:link
```

To change storage location, edit `FileUploadController.php`:

```php
$path = $file->storeAs('custom-folder', $filename, 'public');
```

---

## Examples

### Image Upload Only

```tsx
<FileUpload
    acceptedTypes={['image/*']}
    maxSize={5}
    onUpload={(files) => setImages(files)}
/>
```

### PDF Documents

```tsx
<FileUpload
    acceptedTypes={['.pdf', 'application/pdf']}
    maxSize={20}
    multiple={false}
    onUpload={(files) => setPDF(files[0])}
/>
```

### Profile Picture

```tsx
function ProfilePictureUpload() {
    const [avatar, setAvatar] = useState<UploadedFile | null>(null);

    return (
        <div>
            <FileUpload
                acceptedTypes={['image/jpeg', 'image/png']}
                maxSize={2}
                multiple={false}
                onUpload={(files) => setAvatar(files[0])}
            />

            {avatar && (
                <img
                    src={avatar.url}
                    alt="Profile"
                    className="mt-4 h-32 w-32 rounded-full object-cover"
                />
            )}
        </div>
    );
}
```

### With React Hook Form

```tsx
import { useForm } from 'react-hook-form';

function FormWithFileUpload() {
    const { handleSubmit, setValue } = useForm();

    return (
        <form onSubmit={handleSubmit((data) => console.log(data))}>
            <FileUpload
                onUpload={(files) => setValue('attachments', files)}
            />
            <button type="submit">Submit</button>
        </form>
    );
}
```

---

## Styling

All components use shadcn/ui and Tailwind CSS. Customize by:

### Theme Colors

The upload dropzone respects your theme colors:

- Border color: `border-primary` when dragging
- Background: `bg-primary/5` when drag active
- Error state: `border-destructive` for invalid files

### Custom Styling

```tsx
<FileUpload
    className="border-4 border-blue-500"
    // Applies to the dropzone card
/>
```

### Dark Mode

Components automatically adapt to dark mode via Tailwind's `dark:` variants.

---

## Troubleshooting

### Files not uploading

1. Check CSRF token is present:
```html
<meta name="csrf-token" content="{{ csrf_token() }}">
```

2. Check file size limits in `php.ini`:
```ini
upload_max_filesize = 10M
post_max_size = 10M
```

3. Check storage is writable:
```bash
chmod -R 775 storage/
```

### Storage link not working

```bash
php artisan storage:link
```

### Preview not showing

Make sure storage is publicly accessible:

```php
// config/filesystems.php
'public' => [
    'driver' => 'local',
    'root' => storage_path('app/public'),
    'url' => env('APP_URL').'/storage',
    'visibility' => 'public',
],
```

---

## Security

### File Validation

Always validate files on both client AND server:

```php
// Server-side validation (FileUploadController)
$request->validate([
    'file' => 'required|file|max:10240|mimes:jpg,png,pdf',
]);
```

### Prevent Malicious Files

- Validate MIME types
- Check file extensions
- Scan for malware (optional)
- Store outside web root
- Use unique filenames (UUID)

### Access Control

Protect upload routes:

```php
Route::post('upload', [FileUploadController::class, 'upload'])
    ->middleware('auth'); // Require authentication
```

---

## Resources

- [react-dropzone Documentation](https://react-dropzone.js.org/)
- [Laravel File Storage](https://laravel.com/docs/filesystem)

---

**Last Updated:** 2025-10-21
