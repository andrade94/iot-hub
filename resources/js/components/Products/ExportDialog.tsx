/**
 * ExportDialog Component
 *
 * Dialog for selecting export format and triggering product exports.
 */

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedIds?: string[];
    filters?: Record<string, unknown>;
}

type ExportFormat = 'xlsx' | 'csv' | 'pdf';

export function ExportDialog({ open, onOpenChange, selectedIds = [], filters = {} }: ExportDialogProps) {
    const [format, setFormat] = React.useState<ExportFormat>('xlsx');
    const [isExporting, setIsExporting] = React.useState(false);

    const handleExport = async () => {
        setIsExporting(true);

        try {
            if (format === 'pdf') {
                // PDF export
                if (selectedIds.length === 0) {
                    toast.error('Please select products to export to PDF');
                    return;
                }

                const response = await fetch('/products/bulk/pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                        Accept: 'application/pdf',
                    },
                    body: JSON.stringify({ ids: selectedIds, download: true }),
                });

                if (!response.ok) {
                    throw new Error('Export failed');
                }

                // Download the PDF
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `products-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast.success('PDF exported successfully');
            } else {
                // Excel/CSV export
                const params = new URLSearchParams();
                params.append('format', format);

                if (selectedIds.length > 0) {
                    selectedIds.forEach((id) => params.append('ids[]', id));
                }

                // Add filters
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        if (Array.isArray(value)) {
                            value.forEach((v) => params.append(`${key}[]`, String(v)));
                        } else {
                            params.append(key, String(value));
                        }
                    }
                });

                const response = await fetch(`/products/export/excel?${params.toString()}`, {
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                    },
                });

                // Check if response is JSON (queued) or file
                const contentType = response.headers.get('content-type');

                if (contentType?.includes('application/json')) {
                    const data = await response.json();
                    if (data.queued) {
                        toast.success(data.message);
                    } else if (!data.success) {
                        throw new Error(data.message || 'Export failed');
                    }
                } else {
                    // Download the file
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `products-${new Date().toISOString().split('T')[0]}.${format}`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    toast.success(`${format.toUpperCase()} exported successfully`);
                }
            }

            onOpenChange(false);
        } catch (error) {
            console.error('Export error:', error);
            toast.error(error instanceof Error ? error.message : 'Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Products</DialogTitle>
                    <DialogDescription>
                        {selectedIds.length > 0
                            ? `Export ${selectedIds.length} selected product(s)`
                            : 'Export all products matching current filters'}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Label className="mb-3 block text-sm font-medium">Export Format</Label>
                    <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)} className="space-y-3">
                        <div className="flex items-center space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                            <RadioGroupItem value="xlsx" id="xlsx" />
                            <Label htmlFor="xlsx" className="flex flex-1 cursor-pointer items-center gap-3">
                                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                                <div>
                                    <div className="font-medium">Excel (.xlsx)</div>
                                    <div className="text-muted-foreground text-xs">Best for data analysis and editing</div>
                                </div>
                            </Label>
                        </div>

                        <div className="flex items-center space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                            <RadioGroupItem value="csv" id="csv" />
                            <Label htmlFor="csv" className="flex flex-1 cursor-pointer items-center gap-3">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <div>
                                    <div className="font-medium">CSV (.csv)</div>
                                    <div className="text-muted-foreground text-xs">Universal format for imports</div>
                                </div>
                            </Label>
                        </div>

                        <div className="flex items-center space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                            <RadioGroupItem value="pdf" id="pdf" disabled={selectedIds.length === 0} />
                            <Label
                                htmlFor="pdf"
                                className={`flex flex-1 cursor-pointer items-center gap-3 ${selectedIds.length === 0 ? 'opacity-50' : ''}`}
                            >
                                <FileText className="h-5 w-5 text-red-600" />
                                <div>
                                    <div className="font-medium">PDF (.pdf)</div>
                                    <div className="text-muted-foreground text-xs">
                                        {selectedIds.length === 0 ? 'Select products to enable PDF export' : 'Best for printing and sharing'}
                                    </div>
                                </div>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
                        Cancel
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
