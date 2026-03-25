import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { WorkOrder } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

/* ── Badge Helpers ─────────────────────────────────────────────── */

function TypeBadge({ type }: { type: string }) {
    return (
        <Badge variant="outline" className="text-xs">
            {type.replace('_', ' ')}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const v: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
        urgent: 'destructive',
        high: 'warning',
        medium: 'info',
        low: 'outline',
    };
    return (
        <Badge variant={v[priority] ?? 'outline'} className="text-xs">
            {priority}
        </Badge>
    );
}

function StatusBadge({ status }: { status: string }) {
    const v: Record<string, 'destructive' | 'warning' | 'success' | 'info' | 'outline'> = {
        open: 'destructive',
        assigned: 'warning',
        in_progress: 'info',
        completed: 'success',
        cancelled: 'outline',
    };
    return (
        <Badge variant={v[status] ?? 'outline'} className="text-xs">
            {status.replace('_', ' ')}
        </Badge>
    );
}

/* ── Column Definitions ────────────────────────────────────────── */

interface WorkOrderColumnOptions {
    isTechnician?: boolean;
    selectedIds: number[];
    onToggleSelect: (id: number) => void;
    onToggleSelectAll: () => void;
    allSelected: boolean;
}

export function getWorkOrderColumns(options: WorkOrderColumnOptions): ColumnDef<WorkOrder>[] {
    const { isTechnician, selectedIds, onToggleSelect, onToggleSelectAll, allSelected } = options;

    const columns: ColumnDef<WorkOrder>[] = [];

    // Select checkbox (only for non-technicians)
    if (!isTechnician) {
        columns.push({
            id: 'select',
            header: () => (
                <Checkbox
                    checked={allSelected}
                    onCheckedChange={onToggleSelectAll}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => {
                const wo = row.original;
                if (!['open', 'assigned'].includes(wo.status)) return null;
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={selectedIds.includes(wo.id)}
                            onCheckedChange={() => onToggleSelect(wo.id)}
                            aria-label={`Select WO ${wo.id}`}
                        />
                    </div>
                );
            },
            enableSorting: false,
            enableHiding: false,
        });
    }

    columns.push(
        {
            accessorKey: 'title',
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Title
                    <ArrowUpDown className="h-3 w-3" />
                </button>
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
        },
        {
            accessorKey: 'type',
            header: 'Type',
            cell: ({ row }) => <TypeBadge type={row.original.type} />,
            enableSorting: false,
        },
        {
            accessorKey: 'priority',
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Priority
                    <ArrowUpDown className="h-3 w-3" />
                </button>
            ),
            cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Status
                    <ArrowUpDown className="h-3 w-3" />
                </button>
            ),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            id: 'assigned_to',
            header: 'Assigned To',
            cell: ({ row }) => (
                <span className="text-sm">{row.original.assigned_user?.name ?? '\u2014'}</span>
            ),
            enableSorting: false,
        },
        {
            id: 'site',
            header: 'Site',
            cell: ({ row }) => (
                <span className="text-sm">{row.original.site?.name ?? '\u2014'}</span>
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Created
                    <ArrowUpDown className="h-3 w-3" />
                </button>
            ),
            cell: ({ row }) => (
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {new Date(row.original.created_at).toLocaleDateString()}
                </span>
            ),
        },
    );

    return columns;
}
