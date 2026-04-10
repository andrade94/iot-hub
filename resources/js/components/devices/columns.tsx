import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Device } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { isDeviceOnline } from '@/utils/device';
import type { ColumnDef } from '@tanstack/react-table';

export function getDeviceColumns(): ColumnDef<Device>[] {
    return [
        {
            accessorKey: 'name',
            header: 'Device',
            cell: ({ row }) => (
                <div>
                    <p className="font-medium text-[13px]">{row.original.name}</p>
                    {row.original.label && (
                        <p className="text-[10px] text-muted-foreground/60">{row.original.label}</p>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'model',
            header: 'Model',
            cell: ({ row }) => (
                <Badge variant="outline" className="font-mono text-[9px]">{row.original.model}</Badge>
            ),
        },
        {
            id: 'site',
            header: 'Site',
            cell: ({ row }) => (
                <span className="text-[12px]">{row.original.site?.name ?? '—'}</span>
            ),
        },
        {
            accessorKey: 'zone',
            header: 'Zone',
            cell: ({ row }) => (
                <span className="text-[12px] text-muted-foreground">{row.original.zone || '—'}</span>
            ),
        },
        {
            id: 'recipe',
            header: 'Recipe',
            cell: ({ row }) => (
                <span className="text-[11px] text-muted-foreground">{row.original.recipe?.name ?? '—'}</span>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const online = isDeviceOnline(row.original.last_reading_at);
                return (
                    <Badge variant={online ? 'success' : 'destructive'} className="text-[8px]">
                        {online ? 'online' : 'offline'}
                    </Badge>
                );
            },
        },
        {
            id: 'battery',
            header: 'Battery',
            cell: ({ row }) => {
                const pct = row.original.battery_pct;
                if (pct == null) return <span className="text-muted-foreground/40">—</span>;
                const low = pct < 20;
                return (
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted/40">
                            <div className={cn('h-full rounded-full', low ? 'bg-rose-500' : pct < 50 ? 'bg-amber-400' : 'bg-emerald-500')}
                                style={{ width: `${pct}%` }} />
                        </div>
                        <span className={cn('font-mono text-[10px] tabular-nums', low && 'text-rose-500')}>{pct}%</span>
                    </div>
                );
            },
        },
        {
            id: 'last_reading',
            header: 'Last Reading',
            cell: ({ row }) => {
                const last = row.original.last_reading_at;
                const online = isDeviceOnline(last);
                return (
                    <span className={cn('font-mono text-[10px] tabular-nums', online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500')}>
                        {last ? formatTimeAgo(last) : '—'}
                    </span>
                );
            },
        },
    ];
}
