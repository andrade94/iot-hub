import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { FadeIn } from '@/components/ui/fade-in';
import { Progress } from '@/components/ui/progress';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { isDeviceOnline } from '@/utils/device';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import {
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    ChevronLeft,
    ChevronRight,
    Cpu,
    Signal,
    WifiOff,
} from 'lucide-react';
import { useMemo } from 'react';

interface PaginatedDevices {
    data: Device[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    devices: PaginatedDevices;
    stats: {
        total: number;
        online: number;
        offline: number;
        low_battery: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Command Center', href: '/command-center' },
    { title: 'Device Health', href: '/command-center/devices' },
];

export default function CommandCenterDevices({ devices, stats }: Props) {
    const { t } = useLang();
    const healthPct = stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0;

    const columns = useMemo<ColumnDef<Device>[]>(
        () => [
            {
                id: 'name',
                header: t('Device'),
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <OnlineIndicator online={isDeviceOnline(row.original.last_reading_at)} />
                        <span className="font-medium">{row.original.name}</span>
                    </div>
                ),
            },
            {
                accessorKey: 'model',
                header: t('Model'),
                cell: ({ row }) => (
                    <Badge variant="outline" className="font-mono text-xs">{row.original.model}</Badge>
                ),
            },
            {
                id: 'site',
                header: t('Site'),
                cell: ({ row }) => <span className="text-sm">{row.original.site?.name ?? '\u2014'}</span>,
            },
            {
                accessorKey: 'status',
                header: t('Status'),
                cell: ({ row }) => <DeviceStatusBadge status={row.original.status} />,
            },
            {
                id: 'battery',
                header: t('Battery'),
                cell: ({ row }) => <BatteryIndicator pct={row.original.battery_pct} />,
            },
            {
                accessorKey: 'last_reading_at',
                header: t('Last Seen'),
                cell: ({ row }) => (
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {row.original.last_reading_at ? formatTimeAgo(row.original.last_reading_at) : '\u2014'}
                    </span>
                ),
            },
        ],
        [t],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Device Health')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header ------------------------------------------------ */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative p-6 md:p-8">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Device Health')}
                            </p>
                            <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                {t('Device Health')}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t('Global device status across all organizations')}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* -- KPI Cards --------------------------------------------- */}
                <FadeIn delay={75} duration={400}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Overview')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <KPICard icon={<Cpu className="h-4 w-4" />} label={t('Total')} value={stats.total} />
                            <KPICard icon={<Signal className="h-4 w-4 text-emerald-500" />} label={t('Online')} value={stats.online} accent="emerald" />
                            <KPICard icon={<WifiOff className="h-4 w-4 text-destructive" />} label={t('Offline')} value={stats.offline} accent={stats.offline > 0 ? 'red' : undefined} />
                            <KPICard icon={<BatteryLow className="h-4 w-4 text-amber-500" />} label={t('Low Battery')} value={stats.low_battery} accent={stats.low_battery > 0 ? 'amber' : undefined} />
                        </div>
                    </div>
                </FadeIn>

                {/* -- Health Bar -------------------------------------------- */}
                <FadeIn delay={125} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="flex items-center gap-4 p-4">
                            <Signal className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t('Fleet Health')}</span>
                                    <span className="font-mono font-bold tabular-nums">{healthPct}%</span>
                                </div>
                                <Progress
                                    value={healthPct}
                                    size="md"
                                    variant={healthPct > 80 ? 'success' : 'warning'}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* -- Devices Table ----------------------------------------- */}
                <FadeIn delay={175} duration={500}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Devices')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card className="shadow-elevation-1">
                            <DataTable
                                columns={columns}
                                data={devices.data}
                                bordered={false}
                                getRowId={(row) => String(row.id)}
                                onRowClick={(device) => router.get(`/devices/${device.id}`)}
                                rowClassName={() => 'hover:bg-muted/50'}
                                emptyState={
                                    <div className="py-12 text-center">
                                        <Cpu className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                        <p className="mt-2 text-sm text-muted-foreground">{t('No devices found')}</p>
                                    </div>
                                }
                            />

                            {devices.last_page > 1 && (
                                <div className="flex items-center justify-between border-t px-4 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        {t('Page')}{' '}
                                        <span className="font-mono font-medium tabular-nums text-foreground">
                                            {devices.current_page}
                                        </span>{' '}
                                        {t('of')}{' '}
                                        <span className="font-mono tabular-nums">
                                            {devices.last_page}
                                        </span>
                                    </p>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            disabled={!devices.prev_page_url}
                                            onClick={() => devices.prev_page_url && router.get(devices.prev_page_url, {}, { preserveState: true })}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            disabled={!devices.next_page_url}
                                            onClick={() => devices.next_page_url && router.get(devices.next_page_url, {}, { preserveState: true })}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

/* -- KPI Card ------------------------------------------------------------ */

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
    return (
        <Card className="shadow-elevation-1">
            <CardContent className="flex items-center gap-3 p-4">
                {icon}
                <div>
                    <p className={`font-mono text-2xl font-bold tabular-nums ${
                        accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
                        : accent === 'red' ? 'text-red-600 dark:text-red-400'
                        : accent === 'amber' ? 'text-amber-600 dark:text-amber-400'
                        : ''
                    }`}>
                        {value}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

/* -- Online Indicator ---------------------------------------------------- */

function OnlineIndicator({ online }: { online: boolean }) {
    return (
        <span
            className={`h-2 w-2 shrink-0 rounded-full ${
                online ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
        />
    );
}

/* -- Device Status Badge ------------------------------------------------- */

function DeviceStatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
        active: 'success',
        provisioned: 'info',
        pending: 'warning',
        offline: 'destructive',
        maintenance: 'outline',
    };
    return <Badge variant={variants[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}

/* -- Battery Indicator --------------------------------------------------- */

function BatteryIndicator({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="font-mono text-xs tabular-nums text-muted-foreground">{'\u2014'}</span>;
    const Icon = pct < 20 ? BatteryLow : pct < 60 ? BatteryMedium : BatteryFull;
    const color = pct < 20 ? 'text-destructive' : pct < 40 ? 'text-amber-500' : 'text-emerald-500';
    const variant = pct < 20 ? 'destructive' : pct < 40 ? 'warning' : 'success';
    return (
        <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <div className="w-12">
                <Progress value={pct} size="sm" variant={variant as 'destructive' | 'warning' | 'success'} />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
    );
}
