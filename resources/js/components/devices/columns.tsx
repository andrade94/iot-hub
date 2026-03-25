import { Badge } from '@/components/ui/badge';
import type { Device } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

export function getDeviceColumns(): ColumnDef<Device>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Name
                    <ArrowUpDown className="h-3 w-3" />
                </button>
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'model',
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Model
                    <ArrowUpDown className="h-3 w-3" />
                </button>
            ),
            cell: ({ row }) => (
                <span className="font-mono text-xs">{row.original.model}</span>
            ),
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
            accessorKey: 'zone',
            header: 'Zone',
            cell: ({ row }) => (
                <span className="text-sm">{row.original.zone ?? '\u2014'}</span>
            ),
            enableSorting: false,
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
            cell: ({ row }) => (
                <Badge
                    variant={row.original.status === 'active' ? 'outline-success' : 'outline'}
                    className="text-xs"
                >
                    {row.original.status}
                </Badge>
            ),
        },
        {
            id: 'battery',
            header: 'Battery',
            cell: ({ row }) => {
                const device = row.original as Device & { battery_level?: number | null };
                const battery = device.battery_level ?? device.battery_pct;
                return (
                    <span className="font-mono text-xs tabular-nums">
                        {battery != null ? `${battery}%` : '\u2014'}
                    </span>
                );
            },
            enableSorting: false,
        },
        {
            id: 'last_seen',
            header: 'Last Seen',
            cell: ({ row }) => {
                const device = row.original as Device & { last_seen_at?: string | null };
                const lastSeen = device.last_seen_at ?? device.last_reading_at;
                return (
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {lastSeen ? new Date(lastSeen).toLocaleDateString() : '\u2014'}
                    </span>
                );
            },
            enableSorting: false,
        },
    ];
}
