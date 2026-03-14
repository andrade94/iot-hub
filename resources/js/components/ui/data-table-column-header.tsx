import { cn } from '@/lib/utils';
import {
    ArrowDownIcon,
    ArrowUpIcon,
    CaretSortIcon,
} from '@radix-ui/react-icons';

interface DataTableColumnHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    column?: any;
    title: string;
}

export function DataTableColumnHeader({
    column,
    title,
    className,
    ...props
}: DataTableColumnHeaderProps) {
    if (!column?.column) {
        return <div className={cn('flex items-center space-x-2', className)} {...props}>{title}</div>;
    }

    const sorted = column.getIsSorted?.() || false;

    return (
        <div
            className={cn('flex items-center space-x-2', className)}
            {...props}
        >
            <span>{title}</span>
            {column.column.getCanSort?.() && (
                <button
                    onClick={() => column.column.toggleSorting?.(sorted === 'asc')}
                    className="h-8 w-8 p-0 hover:bg-accent rounded"
                >
                    {sorted === 'desc' ? (
                        <ArrowDownIcon className="h-4 w-4" />
                    ) : sorted === 'asc' ? (
                        <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                        <CaretSortIcon className="h-4 w-4" />
                    )}
                </button>
            )}
        </div>
    );
}