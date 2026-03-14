/**
 * File Utility Functions
 *
 * Helper functions for working with files
 */

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

/**
 * Check if file is an image
 */
export function isImage(file: File | string): boolean {
    if (typeof file === 'string') {
        const ext = getFileExtension(file);
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
    }
    return file.type.startsWith('image/');
}

/**
 * Check if file is a PDF
 */
export function isPDF(file: File | string): boolean {
    if (typeof file === 'string') {
        return getFileExtension(file) === 'pdf';
    }
    return file.type === 'application/pdf';
}

/**
 * Check if file is a document
 */
export function isDocument(file: File | string): boolean {
    if (typeof file === 'string') {
        const ext = getFileExtension(file);
        return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'pdf'].includes(ext);
    }
    const documentTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
    ];
    return documentTypes.includes(file.type);
}

/**
 * Get file icon name based on file type
 */
export function getFileIcon(file: File | string): string {
    const type = typeof file === 'string' ? file : file.type;
    const ext = typeof file === 'string' ? getFileExtension(file) : getFileExtension(file.name);

    // Images
    if (typeof file !== 'string' && file.type.startsWith('image/')) {
        return 'Image';
    }

    // Documents
    if (type.includes('pdf') || ext === 'pdf') return 'FileText';
    if (type.includes('word') || ['doc', 'docx'].includes(ext)) return 'FileText';
    if (type.includes('excel') || ['xls', 'xlsx'].includes(ext)) return 'Sheet';
    if (type.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'Presentation';

    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archive';

    // Videos
    if (typeof file !== 'string' && file.type.startsWith('video/')) return 'Video';

    // Audio
    if (typeof file !== 'string' && file.type.startsWith('audio/')) return 'Music';

    // Code
    if (['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'java', 'cpp', 'html', 'css'].includes(ext)) {
        return 'Code';
    }

    return 'File';
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeInMB: number): { valid: boolean; error?: string } {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
        return {
            valid: false,
            error: `File size must be less than ${maxSizeInMB}MB. Current size: ${formatFileSize(file.size)}`,
        };
    }

    return { valid: true };
}

/**
 * Validate file type
 */
export function validateFileType(
    file: File,
    acceptedTypes: string[]
): { valid: boolean; error?: string } {
    const fileType = file.type;
    const fileExtension = getFileExtension(file.name);

    // Check MIME type
    if (acceptedTypes.some((type) => type === fileType)) {
        return { valid: true };
    }

    // Check extension
    if (acceptedTypes.some((type) => type.startsWith('.') && type.slice(1) === fileExtension)) {
        return { valid: true };
    }

    // Check wildcard (e.g., "image/*")
    if (acceptedTypes.some((type) => type.endsWith('/*') && fileType.startsWith(type.replace('/*', '')))) {
        return { valid: true };
    }

    return {
        valid: false,
        error: `File type not allowed. Accepted types: ${acceptedTypes.join(', ')}`,
    };
}

/**
 * Create a preview URL for a file
 */
export function createFilePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!isImage(file)) {
            reject(new Error('File is not an image'));
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            if (e.target?.result) {
                resolve(e.target.result as string);
            } else {
                reject(new Error('Failed to read file'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Download a file from URL
 */
export function downloadFile(url: string, filename?: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || url.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Copy file URL to clipboard
 */
export async function copyFileUrl(url: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(url);
        return true;
    } catch {
        return false;
    }
}
