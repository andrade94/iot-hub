import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, X } from 'lucide-react';

interface FilterPill {
    key: string;
    label: string;
    onRemove: () => void;
}

interface FilterToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
    showSidebar: boolean;
    onToggleSidebar: () => void;
    pills?: FilterPill[];
    onClearAll?: () => void;
}

function FilterToolbar({
    showSidebar,
    onToggleSidebar,
    pills = [],
    onClearAll,
    className,
    children,
    ...props
}: FilterToolbarProps) {
    const hasActive = pills.length > 0;

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)} {...props}>
            <Button
                variant={showSidebar ? 'secondary' : 'outline'}
                size="sm"
                onClick={onToggleSidebar}
            >
                <SlidersHorizontal className="mr-1.5 size-3.5" />
                Filters
                {hasActive && (
                    <Badge variant="default" className="ml-1.5 h-5 min-w-5 px-1.5">
                        {pills.length}
                    </Badge>
                )}
            </Button>

            {children}

            {hasActive && (
                <>
                    <div className="h-4 w-px bg-border" />
                    {pills.map((pill) => (
                        <Badge
                            key={pill.key}
                            variant="secondary"
                            className="cursor-pointer gap-1 pr-1.5 hover:bg-destructive/10 hover:text-destructive"
                            onClick={pill.onRemove}
                        >
                            {pill.label}
                            <X className="size-3" />
                        </Badge>
                    ))}
                    {onClearAll && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={onClearAll}
                        >
                            Clear all
                        </Button>
                    )}
                </>
            )}
        </div>
    );
}

export { FilterToolbar };
export type { FilterToolbarProps, FilterPill };
