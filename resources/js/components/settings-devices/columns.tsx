import type { ColumnDef } from '@tanstack/react-table';
import type { Device } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatTimeAgo } from '@/utils/date';
import { isDeviceOnline } from '@/utils/device';
import {
    ArrowUpDown,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    Signal,
    SignalLow,
    SignalMedium,
} from 'lucide-react';

interface SettingsDeviceColumnOptions {
    t: (key: string) => string;
}

function OnlineIndicator({ online }: { online: boolean }) {
    return (
        <span
            className={`h-2 w-2 shrink-0 rounded-full ${online ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-zinc-300 dark:bg-zinc-600'}`}
        />
    );
}

function DeviceStatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
        active: 'success',
        provisioned: 'info',
        pending: 'warning',
        offline: 'destructive',
        maintenance: 'outline',
    };
    return (
        <Badge variant={variants[status] ?? 'outline'} className="text-xs">
            {status}
        </Badge>
    );
}

function BatteryIndicator({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-xs text-muted-foreground">&mdash;</span>;
    const Icon = pct < 20 ? BatteryLow : pct < 60 ? BatteryMedium : BatteryFull;
    const color = pct < 20 ? 'text-destructive' : pct < 40 ? 'text-amber-500' : 'text-emerald-500';
    const variant = pct < 20 ? 'destructive' : pct < 40 ? 'warning' : 'success';
    return (
        <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <div className="w-12">
                <Progress
                    value={pct}
                    size="sm"
                    variant={variant as 'destructive' | 'warning' | 'success'}
                />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
    );
}

function SignalIndicator({ rssi }: { rssi: number | null }) {
    if (rssi === null) return <span className="text-xs text-muted-foreground">&mdash;</span>;
    const Icon = rssi > -70 ? Signal : rssi > -90 ? SignalMedium : SignalLow;
    const color = rssi > -70 ? 'text-emerald-500' : rssi > -90 ? 'text-amber-500' : 'text-destructive';
    return (
        <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${color}`} />
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{rssi} dBm</span>
        </div>
    );
}

export function getSettingsDeviceColumns({ t }: SettingsDeviceColumnOptions): ColumnDef<Device>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {t('Device')}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <OnlineIndicator online={isDeviceOnline(row.original.last_reading_at)} />
                    <span className="font-medium">{row.getValue('name')}</span>
                </div>
            ),
        },
        {
            accessorKey: 'model',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {t('Model')}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
            ),
            cell: ({ row }) => (
                <Badge variant="outline" className="font-mono text-xs">
                    {row.getValue('model')}
                </Badge>
            ),
        },
        {
            accessorKey: 'dev_eui',
            header: t('DevEUI'),
            enableSorting: false,
            meta: { className: 'hidden md:table-cell' },
            cell: ({ row }) => (
                <span className="hidden font-mono text-xs tabular-nums text-muted-foreground md:inline">
                    {row.getValue('dev_eui')}
                </span>
            ),
        },
        {
            accessorKey: 'zone',
            header: t('Zone'),
            enableSorting: false,
            cell: ({ row }) => (
                <span className="text-sm">{(row.getValue('zone') as string) || '\u2014'}</span>
            ),
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {t('Status')}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
            ),
            cell: ({ row }) => <DeviceStatusBadge status={row.getValue('status')} />,
        },
        {
            accessorKey: 'battery_pct',
            header: t('Battery'),
            enableSorting: false,
            cell: ({ row }) => <BatteryIndicator pct={row.original.battery_pct} />,
        },
        {
            accessorKey: 'rssi',
            header: t('Signal'),
            enableSorting: false,
            meta: { className: 'hidden lg:table-cell' },
            cell: ({ row }) => (
                <span className="hidden lg:inline">
                    <SignalIndicator rssi={row.original.rssi} />
                </span>
            ),
        },
        {
            accessorKey: 'last_reading_at',
            header: t('Last Seen'),
            enableSorting: false,
            cell: ({ row }) => (
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {row.original.last_reading_at
                        ? formatTimeAgo(row.original.last_reading_at)
                        : '\u2014'}
                </span>
            ),
        },
    ];
}
