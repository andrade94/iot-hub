import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BulkActionBarProps {
    selectedCount: number;
    onClear: () => void;
    children: React.ReactNode;
}

export function BulkActionBar({ selectedCount, onClear, children }: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="bg-primary text-primary-foreground fixed inset-x-0 bottom-0 z-50 flex items-center justify-between border-t px-6 py-3 shadow-lg">
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{selectedCount} selected</span>
                <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground h-7" onClick={onClear}>
                    <X className="mr-1 h-3 w-3" />
                    Clear
                </Button>
            </div>
            <div className="flex items-center gap-2">{children}</div>
        </div>
    );
}
