import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';

export interface SiteRow {
    id: number;
    name: string;
    status: 'active' | 'inactive' | 'onboarding' | 'draft';
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
    showOrg?: boolean;
}

function SortableHeader({ column, title }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc: boolean) => void }; title: string }) {
    const sorted = column.getIsSorted();
    return (
        <button
            className="-ml-1 flex items-center gap-1 rounded px-1 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70 transition-colors hover:text-foreground/70"
            onClick={() => column.toggleSorting(sorted === 'asc')}
        >
            {title}
            {sorted === 'asc' ? <ArrowUp className="h-3 w-3" /> : sorted === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
    );
}

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'outline' | 'secondary'> = {
    active: 'success',
    onboarding: 'warning',
    draft: 'outline',
    inactive: 'secondary',
};

export function getSiteColumns({ t, showOrg }: SiteColumnOptions): ColumnDef<SiteRow>[] {
    const columns: ColumnDef<SiteRow>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column} title={t('Site')} />,
            cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
        },
    ];

    if (showOrg) {
        columns.push({
            accessorKey: 'organization_name',
            header: () => t('Organization'),
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.organization_name ?? '—'}</span>,
            enableSorting: false,
        });
    }

    columns.push(
        {
            accessorKey: 'status',
            header: ({ column }) => <SortableHeader column={column} title={t('Status')} />,
            cell: ({ row }) => <Badge variant={statusBadgeVariant[row.original.status] ?? 'outline'} className="text-[10px] capitalize">{row.original.status}</Badge>,
            sortingFn: (rowA, rowB) => {
                const order: Record<string, number> = { active: 0, onboarding: 1, draft: 2, inactive: 3 };
                return (order[rowA.original.status] ?? 4) - (order[rowB.original.status] ?? 4);
            },
        },
        {
            accessorKey: 'device_count',
            header: ({ column }) => <SortableHeader column={column} title={t('Devices')} />,
            cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.device_count}</span>,
        },
        {
            id: 'online_pct',
            header: () => t('Online'),
            cell: ({ row }) => {
                const { device_count, online_count } = row.original;
                if (device_count === 0) return <span className="font-mono tabular-nums text-muted-foreground">—</span>;
                const pct = Math.round((online_count / device_count) * 100);
                return (
                    <span className={cn('font-mono text-xs font-semibold tabular-nums',
                        pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                        pct > 50 ? 'text-amber-600 dark:text-amber-400' :
                        'text-rose-600 dark:text-rose-400'
                    )}>{pct}%</span>
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: 'active_alerts',
            header: () => t('Alerts'),
            cell: ({ row }) => {
                const c = row.original.active_alerts;
                return <span className={cn('font-mono tabular-nums', c > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>{c}</span>;
            },
            enableSorting: false,
        },
        {
            accessorKey: 'open_work_orders',
            header: () => t('WOs'),
            cell: ({ row }) => {
                const c = row.original.open_work_orders;
                return <span className={cn('font-mono tabular-nums', c > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>{c}</span>;
            },
            enableSorting: false,
        },
        {
            accessorKey: 'gateway_count',
            header: () => t('GWs'),
            cell: ({ row }) => <span className="font-mono tabular-nums text-muted-foreground">{row.original.gateway_count}</span>,
            enableSorting: false,
        },
        {
            id: 'arrow',
            enableSorting: false,
            enableHiding: false,
            cell: () => <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />,
        },
    );

    return columns;
}
