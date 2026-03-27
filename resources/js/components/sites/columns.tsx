import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

/* -- Types ------------------------------------------------------------ */

export interface SiteRow {
    id: number;
    name: string;
    status: 'active' | 'inactive' | 'onboarding';
    timezone: string | null;
    organization_name: string | null;
    device_count: number;
    online_count: number;
    gateway_count: number;
    active_alerts: number;
    open_work_orders: number;
    created_at: string | null;
}

export interface SiteColumnOptions {
    t: (key: string) => string;
}

/* -- Sortable Header -------------------------------------------------- */

function SortableHeader({
    column,
    title,
}: {
    column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc: boolean) => void };
    title: string;
}) {
    const sorted = column.getIsSorted();
    return (
        <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 font-medium"
            onClick={() => column.toggleSorting(sorted === 'asc')}
        >
            {title}
            {sorted === 'asc' ? (
                <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
            ) : sorted === 'desc' ? (
                <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
            ) : (
                <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/50" />
            )}
        </Button>
    );
}

/* -- Badge Variants --------------------------------------------------- */

const statusBadgeVariant: Record<string, 'outline-success' | 'outline-warning' | 'outline'> = {
    active: 'outline-success',
    onboarding: 'outline-warning',
    inactive: 'outline',
};

/* -- Column Definitions ----------------------------------------------- */

export function getSiteColumns({ t }: SiteColumnOptions): ColumnDef<SiteRow>[] {
    return [
        // -- Name --
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column} title={t('Name')} />,
            cell: ({ row }) => (
                <span className="font-medium">{row.original.name}</span>
            ),
        },

        // -- Organization --
        {
            accessorKey: 'organization_name',
            header: () => t('Organization'),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.organization_name ?? '--'}
                </span>
            ),
            enableSorting: false,
        },

        // -- Status --
        {
            accessorKey: 'status',
            header: ({ column }) => <SortableHeader column={column} title={t('Status')} />,
            cell: ({ row }) => (
                <Badge variant={statusBadgeVariant[row.original.status] ?? 'outline'} className="text-xs capitalize">
                    {row.original.status}
                </Badge>
            ),
            sortingFn: (rowA, rowB) => {
                const order: Record<string, number> = { active: 0, onboarding: 1, inactive: 2 };
                const a = order[rowA.original.status] ?? 3;
                const b = order[rowB.original.status] ?? 3;
                return a - b;
            },
        },

        // -- Devices --
        {
            accessorKey: 'device_count',
            header: ({ column }) => <SortableHeader column={column} title={t('Devices')} />,
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{row.original.device_count}</span>
            ),
        },

        // -- Online --
        {
            accessorKey: 'online_count',
            header: () => t('Online'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{row.original.online_count}</span>
            ),
            enableSorting: false,
        },

        // -- Health % --
        {
            id: 'health',
            header: () => t('Health %'),
            cell: ({ row }) => {
                const { device_count, online_count } = row.original;
                if (device_count === 0) {
                    return <span className="font-mono tabular-nums text-muted-foreground">--</span>;
                }
                const pct = Math.round((online_count / device_count) * 100);
                return (
                    <span
                        className={cn(
                            'font-mono tabular-nums font-medium',
                            pct > 80 ? 'text-emerald-600 dark:text-emerald-400' :
                            pct > 50 ? 'text-amber-600 dark:text-amber-400' :
                            'text-destructive',
                        )}
                    >
                        {pct}%
                    </span>
                );
            },
            enableSorting: false,
        },

        // -- Active Alerts --
        {
            accessorKey: 'active_alerts',
            header: () => t('Alerts'),
            cell: ({ row }) => {
                const count = row.original.active_alerts;
                return (
                    <span
                        className={cn(
                            'font-mono tabular-nums',
                            count > 0 && 'font-medium text-destructive',
                        )}
                    >
                        {count}
                    </span>
                );
            },
            enableSorting: false,
        },

        // -- Open Work Orders --
        {
            accessorKey: 'open_work_orders',
            header: () => t('Work Orders'),
            cell: ({ row }) => {
                const count = row.original.open_work_orders;
                return (
                    <span
                        className={cn(
                            'font-mono tabular-nums',
                            count > 0 && 'font-medium text-amber-600 dark:text-amber-400',
                        )}
                    >
                        {count}
                    </span>
                );
            },
            enableSorting: false,
        },

        // -- Timezone --
        {
            accessorKey: 'timezone',
            header: () => t('Timezone'),
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">
                    {row.original.timezone ?? '--'}
                </span>
            ),
            enableSorting: false,
        },
    ];
}
