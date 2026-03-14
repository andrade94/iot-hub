/**
 * File Preview Component
 *
 * Displays a preview of uploaded files with actions
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { FileUploadProgress, UploadedFile } from '@/types';
import { formatFileSize, getFileIcon, isImage } from '@/utils/file';
import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useEffect, useState } from 'react';

interface FilePreviewProps {
    upload?: FileUploadProgress;
    file?: UploadedFile;
    onRemove?: () => void;
    showProgress?: boolean;
}

export function FilePreview({ upload, file, onRemove, showProgress = true }: FilePreviewProps) {
    const [preview, setPreview] = useState<string | null>(null);

    const displayFile = upload?.uploadedFile || file;
    const displayName = upload?.file.name || file?.name || '';
    const displaySize = upload?.file.size || file?.size || 0;

    // Generate preview for images
    useEffect(() => {
        if (upload?.file && isImage(upload.file)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target?.result as string);
            };
            reader.readAsDataURL(upload.file);
        } else if (file?.url && isImage(file.url)) {
            setPreview(file.url);
        }
    }, [upload?.file, file]);

    const FileIcon = (Icons as any)[getFileIcon(upload?.file || file?.name || '')] || Icons.File;

    return (
        <Card className="p-3">
            <div className="flex items-start gap-3">
                {/* Preview/Icon */}
                <div className="flex-shrink-0">
                    {preview ? (
                        <img src={preview} alt={displayName} className="h-12 w-12 rounded object-cover" />
                    ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                            <FileIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                    )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium">{displayName}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(displaySize)}</p>
                        </div>

                        {/* Status Badge */}
                        {upload && (
                            <div className="flex items-center gap-2">
                                {upload.status === 'uploading' && (
                                    <Badge variant="outline" className="gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Uploading
                                    </Badge>
                                )}
                                {upload.status === 'success' && (
                                    <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Complete
                                    </Badge>
                                )}
                                {upload.status === 'error' && (
                                    <Badge variant="outline" className="gap-1 border-red-500 text-red-700">
                                        <XCircle className="h-3 w-3" />
                                        Error
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Remove Button */}
                        {onRemove && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={onRemove}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {upload && showProgress && upload.status !== 'pending' && (
                        <div className="mt-2">
                            <Progress
                                value={upload.progress}
                                className="h-1"
                            />
                        </div>
                    )}

                    {/* Error Message */}
                    {upload?.error && (
                        <p className="mt-1 text-xs text-red-600">{upload.error}</p>
                    )}
                </div>
            </div>
        </Card>
    );
}
