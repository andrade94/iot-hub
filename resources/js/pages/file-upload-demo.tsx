/**
 * File Upload Demo Page
 *
 * Demonstrates the file upload component with various configurations
 */

import { FileUpload } from '@/components/ui/file-upload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, UploadedFile } from '@/types';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'File Upload Demo',
        href: '/file-upload-demo',
    },
];

export default function FileUploadDemo() {
    const { t } = useLang();
    const { toast } = useToast();
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    const handleUpload = (files: UploadedFile[]) => {
        setUploadedFiles((prev) => [...prev, ...files]);
        toast({
            title: 'Success!',
            description: `${files.length} file(s) uploaded successfully`,
        });
    };

    const handleError = (error: string) => {
        toast({
            title: 'Upload Error',
            description: error,
            variant: 'destructive',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('File Upload Demo')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold">{t('File Upload Demo')}</h1>
                    <p className="mt-2 text-muted-foreground">
                        Test the file upload component with drag & drop, validation, and progress tracking
                    </p>
                </div>

                {/* Example 1: All Files */}
                <Card>
                    <CardHeader>
                        <CardTitle>Example 1: All File Types</CardTitle>
                        <CardDescription>
                            Upload any file type • Max size: 10MB • Multiple files allowed
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FileUpload
                            onUpload={handleUpload}
                            onError={handleError}
                            maxSize={10}
                            multiple={true}
                        />
                    </CardContent>
                </Card>

                {/* Example 2: Images Only */}
                <Card>
                    <CardHeader>
                        <CardTitle>Example 2: Images Only</CardTitle>
                        <CardDescription>
                            Upload images with preview • Max size: 5MB • JPG, PNG, GIF, WebP
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FileUpload
                            onUpload={handleUpload}
                            onError={handleError}
                            maxSize={5}
                            acceptedTypes={['image/*']}
                            multiple={true}
                        />
                    </CardContent>
                </Card>

                {/* Example 3: PDFs Only */}
                <Card>
                    <CardHeader>
                        <CardTitle>Example 3: PDF Documents</CardTitle>
                        <CardDescription>
                            Upload PDF files only • Max size: 20MB • Single file
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FileUpload
                            onUpload={handleUpload}
                            onError={handleError}
                            maxSize={20}
                            acceptedTypes={['.pdf', 'application/pdf']}
                            multiple={false}
                        />
                    </CardContent>
                </Card>

                {/* Example 4: Images + PDFs */}
                <Card>
                    <CardHeader>
                        <CardTitle>Example 4: Images & PDFs</CardTitle>
                        <CardDescription>
                            Upload images or PDF documents • Max size: 10MB
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FileUpload
                            onUpload={handleUpload}
                            onError={handleError}
                            maxSize={10}
                            acceptedTypes={['image/*', '.pdf', 'application/pdf']}
                            multiple={true}
                        />
                    </CardContent>
                </Card>

                {/* Uploaded Files Summary */}
                {uploadedFiles.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Uploaded Files ({uploadedFiles.length})</CardTitle>
                            <CardDescription>All successfully uploaded files in this session</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {uploadedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {file.mime_type} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline"
                                        >
                                            View
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Testing Instructions */}
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
                    <CardHeader>
                        <CardTitle className="text-blue-900 dark:text-blue-100">
                            Testing Instructions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                        <p>✅ <strong>Drag & Drop:</strong> Drag files from your computer onto any upload area</p>
                        <p>✅ <strong>Click to Browse:</strong> Click "Choose Files" button to select files</p>
                        <p>✅ <strong>Multiple Files:</strong> Select multiple files at once (where allowed)</p>
                        <p>✅ <strong>File Validation:</strong> Try uploading wrong file types or too-large files</p>
                        <p>✅ <strong>Progress:</strong> Watch upload progress and status badges</p>
                        <p>✅ <strong>Previews:</strong> See image thumbnails automatically</p>
                        <p>✅ <strong>Remove:</strong> Click X button to remove files during upload</p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
