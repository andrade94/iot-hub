import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device } from '@/types';
import { Head, router } from '@inertiajs/react';
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Device Health')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Device Health')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('Global device status across all organizations')}
                    </p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KPICard icon={<Cpu className="h-4 w-4" />} label={t('Total')} value={stats.total} />
                    <KPICard icon={<Signal className="h-4 w-4 text-emerald-500" />} label={t('Online')} value={stats.online} accent="emerald" />
                    <KPICard icon={<WifiOff className="h-4 w-4 text-destructive" />} label={t('Offline')} value={stats.offline} accent={stats.offline > 0 ? 'red' : undefined} />
                    <KPICard icon={<BatteryLow className="h-4 w-4 text-amber-500" />} label={t('Low Battery')} value={stats.low_battery} accent={stats.low_battery > 0 ? 'amber' : undefined} />
                </div>

                {/* Health bar */}
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <Signal className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <div className="mb-1 flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('Fleet Health')}</span>
                                <span className="font-bold tabular-nums">{healthPct}%</span>
                            </div>
                            <Progress
                                value={healthPct}
                                size="md"
                                variant={healthPct > 80 ? 'success' : 'warning'}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Devices Table */}
                <Card className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Device')}</TableHead>
                                <TableHead>{t('Model')}</TableHead>
                                <TableHead>{t('Site')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Battery')}</TableHead>
                                <TableHead>{t('Last Seen')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {devices.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center">
                                        <Cpu className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                        <p className="mt-2 text-sm text-muted-foreground">{t('No devices found')}</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                devices.data.map((device) => (
                                    <TableRow key={device.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <OnlineIndicator online={isOnline(device)} />
                                                <span className="font-medium">{device.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">{device.model}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{device.site?.name ?? '—'}</TableCell>
                                        <TableCell>
                                            <DeviceStatusBadge status={device.status} />
                                        </TableCell>
                                        <TableCell>
                                            <BatteryIndicator pct={device.battery_pct} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {device.last_reading_at ? formatTimeAgo(device.last_reading_at) : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {devices.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-xs text-muted-foreground">
                                {t('Page')} {devices.current_page} {t('of')} {devices.last_page}
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
        </AppLayout>
    );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                {icon}
                <div>
                    <p className={`text-2xl font-bold tabular-nums ${accent ? `text-${accent}-600 dark:text-${accent}-400` : ''}`}>{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function OnlineIndicator({ online }: { online: boolean }) {
    return (
        <span
            className={`h-2 w-2 shrink-0 rounded-full ${
                online ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
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
    return <Badge variant={variants[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}

function BatteryIndicator({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;
    const Icon = pct < 20 ? BatteryLow : pct < 60 ? BatteryMedium : BatteryFull;
    const color = pct < 20 ? 'text-destructive' : pct < 40 ? 'text-amber-500' : 'text-emerald-500';
    const variant = pct < 20 ? 'destructive' : pct < 40 ? 'warning' : 'success';
    return (
        <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <div className="w-12">
                <Progress value={pct} size="sm" variant={variant as 'destructive' | 'warning' | 'success'} />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
    );
}

function isOnline(device: Device): boolean {
    if (!device.last_reading_at) return false;
    return Date.now() - new Date(device.last_reading_at).getTime() < 15 * 60 * 1000;
}

function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
