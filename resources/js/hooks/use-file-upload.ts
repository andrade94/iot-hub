/**
 * useFileUpload Hook
 *
 * Hook for handling file uploads with progress tracking, visibility options,
 * and support for private files with signed URLs.
 */

import { router } from '@inertiajs/react';
import { useState, useCallback } from 'react';

import type { FileUploadProgress, UploadedFile } from '@/types';

interface UseFileUploadOptions {
    onSuccess?: (file: UploadedFile) => void;
    onError?: (error: string) => void;
    maxSize?: number; // in MB
    acceptedTypes?: string[];
    visibility?: 'public' | 'private';
    collection?: string;
}

interface UploadOptions {
    visibility?: 'public' | 'private';
    collection?: string;
    metadata?: Record<string, unknown>;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
    const {
        onSuccess,
        onError,
        maxSize = 10,
        acceptedTypes,
        visibility: defaultVisibility = 'public',
        collection: defaultCollection,
    } = options;

    const [uploads, setUploads] = useState<FileUploadProgress[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    /**
     * Validate a file before upload
     */
    const validateFile = useCallback(
        (file: File): string | null => {
            // Validate file size
            if (maxSize && file.size > maxSize * 1024 * 1024) {
                return `File size must be less than ${maxSize}MB`;
            }

            // Validate file type
            if (acceptedTypes && acceptedTypes.length > 0) {
                const fileExtension = file.name.split('.').pop()?.toLowerCase();
                const isAccepted = acceptedTypes.some((type) => {
                    if (type.startsWith('.')) {
                        return type.slice(1) === fileExtension;
                    }
                    if (type.endsWith('/*')) {
                        return file.type.startsWith(type.replace('/*', ''));
                    }
                    return file.type === type;
                });

                if (!isAccepted) {
                    return `File type not allowed. Accepted types: ${acceptedTypes.join(', ')}`;
                }
            }

            return null;
        },
        [maxSize, acceptedTypes]
    );

    /**
     * Upload a single file
     */
    const uploadFile = useCallback(
        async (file: File, uploadOptions: UploadOptions = {}): Promise<UploadedFile | null> => {
            const validationError = validateFile(file);
            if (validationError) {
                onError?.(validationError);
                return null;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('visibility', uploadOptions.visibility ?? defaultVisibility);

            if (uploadOptions.collection ?? defaultCollection) {
                formData.append('collection', uploadOptions.collection ?? defaultCollection ?? '');
            }

            if (uploadOptions.metadata) {
                formData.append('metadata', JSON.stringify(uploadOptions.metadata));
            }

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                        Accept: 'application/json',
                    },
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok) {
                    const errorMessage = data.error || data.message || 'Upload failed';
                    onError?.(errorMessage);
                    return null;
                }

                if (data.success && data.file) {
                    onSuccess?.(data.file);
                    return data.file;
                }

                throw new Error('Upload failed');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Upload failed';
                onError?.(errorMessage);
                return null;
            }
        },
        [validateFile, onSuccess, onError, defaultVisibility, defaultCollection]
    );

    /**
     * Upload multiple files
     */
    const uploadFiles = useCallback(
        async (files: File[], uploadOptions: UploadOptions = {}): Promise<void> => {
            setIsUploading(true);

            // Initialize upload progress
            const initialProgress: FileUploadProgress[] = files.map((file) => ({
                file,
                progress: 0,
                status: 'pending' as const,
            }));
            setUploads(initialProgress);

            // Upload files one by one
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Update status to uploading
                setUploads((prev) =>
                    prev.map((upload, index) => (index === i ? { ...upload, status: 'uploading' as const, progress: 50 } : upload))
                );

                const uploadedFile = await uploadFile(file, uploadOptions);

                // Update progress
                setUploads((prev) =>
                    prev.map((upload, index) =>
                        index === i
                            ? {
                                  ...upload,
                                  status: uploadedFile ? ('success' as const) : ('error' as const),
                                  progress: 100,
                                  uploadedFile: uploadedFile ?? undefined,
                                  error: uploadedFile ? undefined : 'Upload failed',
                              }
                            : upload
                    )
                );
            }

            setIsUploading(false);
        },
        [uploadFile]
    );

    /**
     * Upload multiple files in batch (single request)
     */
    const uploadFilesBatch = useCallback(
        async (files: File[], uploadOptions: UploadOptions = {}): Promise<UploadedFile[]> => {
            setIsUploading(true);

            // Validate all files first
            for (const file of files) {
                const validationError = validateFile(file);
                if (validationError) {
                    onError?.(validationError);
                    setIsUploading(false);
                    return [];
                }
            }

            const formData = new FormData();
            files.forEach((file) => {
                formData.append('files[]', file);
            });
            formData.append('visibility', uploadOptions.visibility ?? defaultVisibility);

            if (uploadOptions.collection ?? defaultCollection) {
                formData.append('collection', uploadOptions.collection ?? defaultCollection ?? '');
            }

            try {
                const response = await fetch('/upload/multiple', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                        Accept: 'application/json',
                    },
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok) {
                    const errorMessage = data.error || data.message || 'Upload failed';
                    onError?.(errorMessage);
                    return [];
                }

                if (data.success && data.files) {
                    data.files.forEach((file: UploadedFile) => onSuccess?.(file));
                    return data.files;
                }

                throw new Error('Upload failed');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Upload failed';
                onError?.(errorMessage);
                return [];
            } finally {
                setIsUploading(false);
            }
        },
        [validateFile, onSuccess, onError, defaultVisibility, defaultCollection]
    );

    /**
     * Delete an uploaded file by ID
     */
    const deleteFile = useCallback(
        async (fileId: string): Promise<boolean> => {
            try {
                const response = await fetch(`/files/${fileId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                        Accept: 'application/json',
                    },
                });

                if (!response.ok) {
                    onError?.('Failed to delete file');
                    return false;
                }

                return true;
            } catch (error) {
                onError?.('Failed to delete file');
                return false;
            }
        },
        [onError]
    );

    /**
     * Delete a file by path (legacy support)
     */
    const deleteFileByPath = useCallback(
        async (path: string): Promise<boolean> => {
            try {
                router.delete(`/upload/${encodeURIComponent(path)}`, {
                    preserveScroll: true,
                    onError: () => {
                        onError?.('Failed to delete file');
                    },
                });
                return true;
            } catch (error) {
                onError?.('Failed to delete file');
                return false;
            }
        },
        [onError]
    );

    /**
     * Change file visibility
     */
    const changeVisibility = useCallback(
        async (fileId: string, visibility: 'public' | 'private'): Promise<UploadedFile | null> => {
            try {
                const response = await fetch(`/files/${fileId}/visibility`, {
                    method: 'PATCH',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({ visibility }),
                });

                const data = await response.json();

                if (!response.ok) {
                    onError?.(data.message || 'Failed to change visibility');
                    return null;
                }

                if (data.success && data.file) {
                    return data.file;
                }

                return null;
            } catch (error) {
                onError?.('Failed to change visibility');
                return null;
            }
        },
        [onError]
    );

    /**
     * Get file download URL
     */
    const getDownloadUrl = useCallback((fileId: string): string => {
        return `/files/${fileId}/download`;
    }, []);

    /**
     * Clear all uploads
     */
    const clearUploads = useCallback(() => {
        setUploads([]);
    }, []);

    /**
     * Remove a specific upload from the list
     */
    const removeUpload = useCallback((index: number) => {
        setUploads((prev) => prev.filter((_, i) => i !== index));
    }, []);

    return {
        uploads,
        isUploading,
        uploadFile,
        uploadFiles,
        uploadFilesBatch,
        deleteFile,
        deleteFileByPath,
        changeVisibility,
        getDownloadUrl,
        clearUploads,
        removeUpload,
        validateFile,
    };
}
