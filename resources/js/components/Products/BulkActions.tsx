import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Download, Trash2, X } from 'lucide-react';

interface BulkActionsProps {
    selectedCount: number;
    onClearSelection: () => void;
    onDelete: () => void;
    onStatusChange: (status: 'active' | 'inactive' | 'draft') => void;
    onExport: () => void;
}

export function BulkActions({
    selectedCount,
    onClearSelection,
    onDelete,
    onStatusChange,
    onExport,
}: BulkActionsProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border bg-card p-4 shadow-lg">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                    {selectedCount} selected
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClearSelection}
                    className="h-6 w-6"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
                <Select onValueChange={(value: any) => onStatusChange(value)}>
                    <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active">Set Active</SelectItem>
                        <SelectItem value="inactive">Set Inactive</SelectItem>
                        <SelectItem value="draft">Set Draft</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={onExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>

                <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDelete}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </Button>
            </div>
        </div>
    );
}
