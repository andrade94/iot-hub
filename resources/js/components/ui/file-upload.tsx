/**
 * File Upload Component
 *
 * Drag and drop file upload with react-dropzone and shadcn styling
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilePreview } from '@/components/ui/file-preview';
import { useFileUpload } from '@/hooks/use-file-upload';
import type { UploadedFile } from '@/types';
import { cn } from '@/lib/utils';
import { Upload, X } from 'lucide-react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
    /**
     * Callback when files are successfully uploaded
     */
    onUpload?: (files: UploadedFile[]) => void;

    /**
     * Callback when an error occurs
     */
    onError?: (error: string) => void;

    /**
     * Maximum file size in MB
     * @default 10
     */
    maxSize?: number;

    /**
     * Accepted file types (MIME types or extensions)
     * @default undefined (all files)
     * @example ['image/*', '.pdf', 'application/pdf']
     */
    acceptedTypes?: string[];

    /**
     * Allow multiple files
     * @default true
     */
    multiple?: boolean;

    /**
     * Custom className for the dropzone
     */
    className?: string;

    /**
     * Show upload progress
     * @default true
     */
    showProgress?: boolean;
}

export function FileUpload({
    onUpload,
    onError,
    maxSize = 10,
    acceptedTypes,
    multiple = true,
    className,
    showProgress = true,
}: FileUploadProps) {
    const { uploads, isUploading, uploadFiles, clearUploads, removeUpload } = useFileUpload({
        maxSize,
        acceptedTypes,
        onSuccess: (file) => {
            onUpload?.([file]);
        },
        onError,
    });

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                uploadFiles(acceptedFiles);
            }
        },
        [uploadFiles]
    );

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: acceptedTypes
            ? acceptedTypes.reduce((acc, type) => {
                  acc[type] = [];
                  return acc;
              }, {} as Record<string, string[]>)
            : undefined,
        maxSize: maxSize * 1024 * 1024,
        multiple,
        disabled: isUploading,
    });

    const successfulUploads = uploads.filter((u) => u.status === 'success' && u.uploadedFile);

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            <Card
                {...getRootProps()}
                className={cn(
                    'cursor-pointer border-2 border-dashed transition-colors',
                    isDragActive && !isDragReject && 'border-primary bg-primary/5',
                    isDragReject && 'border-destructive bg-destructive/5',
                    isUploading && 'pointer-events-none opacity-50',
                    className
                )}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                    <div className="rounded-full bg-muted p-4">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>

                    {isDragActive ? (
                        <div>
                            <p className="text-lg font-medium">Drop files here</p>
                            <p className="text-sm text-muted-foreground">Release to upload</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-lg font-medium">
                                Drag & drop files here, or click to browse
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {acceptedTypes
                                    ? `Accepted: ${acceptedTypes.join(', ')}`
                                    : 'All file types accepted'}
                                {maxSize && ` • Max size: ${maxSize}MB`}
                            </p>
                        </div>
                    )}

                    <Button type="button" variant="outline" className="mt-2" disabled={isUploading}>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Files
                    </Button>
                </div>
            </Card>

            {/* Upload Progress */}
            {uploads.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">
                            {isUploading ? 'Uploading...' : 'Upload Complete'}
                        </h4>
                        {!isUploading && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearUploads}
                                className="h-auto p-1 text-xs"
                            >
                                <X className="mr-1 h-3 w-3" />
                                Clear All
                            </Button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {uploads.map((upload, index) => (
                            <FilePreview
                                key={index}
                                upload={upload}
                                onRemove={() => removeUpload(index)}
                                showProgress={showProgress}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Successfully Uploaded Files Summary */}
            {successfulUploads.length > 0 && !isUploading && (
                <div className="rounded-md bg-green-50 p-3 dark:bg-green-900/20">
                    <p className="text-sm text-green-800 dark:text-green-200">
                        Successfully uploaded {successfulUploads.length} file
                        {successfulUploads.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
}
