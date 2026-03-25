import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Site } from '@/types';
import { Head } from '@inertiajs/react';
import {
    Battery,
    BatteryLow,
    BatteryMedium,
    BatteryWarning,
    Cpu,
    Download,
    Signal,
    SignalLow,
    SignalMedium,
} from 'lucide-react';
import { useCallback } from 'react';

interface InventoryDevice {
    id: number;
    name: string;
    model: string;
    dev_eui: string;
    zone: string | null;
    status: string;
    battery_pct: number | null;
    rssi: number | null;
    last_reading_at: string | null;
    installed_at: string | null;
    gateway_name: string | null;
    recipe_name: string | null;
    calibration_status: string;
}

interface Props {
    site: Site;
    devices: InventoryDevice[];
}

const statusVariant: Record<string, 'outline-success' | 'outline-warning' | 'outline' | 'destructive'> = {
    active: 'outline-success',
    provisioned: 'outline-warning',
    pending: 'outline',
    offline: 'destructive',
    maintenance: 'outline-warning',
};

const calibrationLabels: Record<string, { label: string; variant: 'outline-success' | 'outline-warning' | 'outline' | 'destructive' }> = {
    valid: { label: 'Calibrated', variant: 'outline-success' },
    expiring_soon: { label: 'Expiring', variant: 'outline-warning' },
    expired: { label: 'Expired', variant: 'destructive' },
    none: { label: 'None', variant: 'outline' },
};

function BatteryIcon({ pct }: { pct: number | null }) {
    if (pct === null) return <Battery className="h-3.5 w-3.5 text-muted-foreground" />;
    if (pct < 10) return <BatteryWarning className="h-3.5 w-3.5 text-red-500" />;
    if (pct < 30) return <BatteryLow className="h-3.5 w-3.5 text-orange-500" />;
    if (pct < 60) return <BatteryMedium className="h-3.5 w-3.5 text-amber-500" />;
    return <Battery className="h-3.5 w-3.5 text-emerald-500" />;
}

function SignalIcon({ rssi }: { rssi: number | null }) {
    if (rssi === null) return <Signal className="h-3.5 w-3.5 text-muted-foreground" />;
    if (rssi < -100) return <SignalLow className="h-3.5 w-3.5 text-red-500" />;
    if (rssi < -80) return <SignalMedium className="h-3.5 w-3.5 text-amber-500" />;
    return <Signal className="h-3.5 w-3.5 text-emerald-500" />;
}

export default function DeviceInventory({ site, devices }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Reports'), href: '/reports' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: t('Device Inventory'), href: '#' },
    ];

    const exportCsv = useCallback(() => {
        const headers = [
            'Device Name',
            'Model',
            'DEV EUI',
            'Zone',
            'Status',
            'Battery %',
            'RSSI',
            'Last Seen',
            'Installed At',
            'Gateway',
            'Recipe',
            'Calibration',
        ];

        const rows = devices.map((d) => [
            d.name,
            d.model,
            d.dev_eui,
            d.zone ?? '',
            d.status,
            d.battery_pct !== null ? String(d.battery_pct) : '',
            d.rssi !== null ? String(d.rssi) : '',
            d.last_reading_at ?? '',
            d.installed_at ?? '',
            d.gateway_name ?? '',
            d.recipe_name ?? '',
            d.calibration_status,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) =>
                row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','),
            ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `device-inventory-${site.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [devices, site.name]);

    const onlineCount = devices.filter(
        (d) => d.status === 'active' && d.last_reading_at,
    ).length;
    const lowBatteryCount = devices.filter(
        (d) => d.battery_pct !== null && d.battery_pct < 20,
    ).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Device Inventory')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Device Inventory')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {site.name}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Complete asset inventory with status, battery, and calibration data')}
                                </p>
                            </div>
                            <Button onClick={exportCsv} variant="outline" size="sm">
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                {t('Export CSV')}
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* Summary Stats */}
                <FadeIn delay={50} duration={400}>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Card className="shadow-elevation-1">
                            <CardContent className="p-4">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Total Devices')}
                                </p>
                                <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                                    {devices.length}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-elevation-1">
                            <CardContent className="p-4">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Online')}
                                </p>
                                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-600">
                                    {onlineCount}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-elevation-1">
                            <CardContent className="p-4">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Low Battery')}
                                </p>
                                <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${lowBatteryCount > 0 ? 'text-orange-500' : ''}`}>
                                    {lowBatteryCount}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-elevation-1">
                            <CardContent className="p-4">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Zones')}
                                </p>
                                <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                                    {new Set(devices.map((d) => d.zone).filter(Boolean)).size}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </FadeIn>

                {/* Inventory Table */}
                <FadeIn delay={100} duration={400}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Asset Register')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {devices.length}
                            </span>
                        </div>

                        <Card className="shadow-elevation-1">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Device')}</TableHead>
                                                <TableHead>{t('Model')}</TableHead>
                                                <TableHead>{t('Zone')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead className="text-right">{t('Battery')}</TableHead>
                                                <TableHead className="text-right">{t('Signal')}</TableHead>
                                                <TableHead>{t('Last Seen')}</TableHead>
                                                <TableHead>{t('Gateway')}</TableHead>
                                                <TableHead>{t('Recipe')}</TableHead>
                                                <TableHead>{t('Calibration')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {devices.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="py-12 text-center">
                                                        <Cpu className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                                        <p className="mt-2 text-sm text-muted-foreground">
                                                            {t('No devices found')}
                                                        </p>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                devices.map((device) => {
                                                    const calInfo = calibrationLabels[device.calibration_status] ?? calibrationLabels.none;

                                                    return (
                                                        <TableRow key={device.id}>
                                                            <TableCell className="font-medium">
                                                                {device.name}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs">
                                                                {device.model}
                                                            </TableCell>
                                                            <TableCell>
                                                                {device.zone ? (
                                                                    <Badge variant="outline">{device.zone}</Badge>
                                                                ) : (
                                                                    <span className="text-muted-foreground">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={statusVariant[device.status] ?? 'outline'}>
                                                                    {device.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <BatteryIcon pct={device.battery_pct} />
                                                                    <span className="font-mono text-xs tabular-nums">
                                                                        {device.battery_pct !== null
                                                                            ? `${device.battery_pct}%`
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <SignalIcon rssi={device.rssi} />
                                                                    <span className="font-mono text-xs tabular-nums">
                                                                        {device.rssi !== null
                                                                            ? `${device.rssi} dBm`
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                                                                {device.last_reading_at
                                                                    ? new Date(device.last_reading_at).toLocaleDateString(undefined, {
                                                                          month: 'short',
                                                                          day: 'numeric',
                                                                          hour: '2-digit',
                                                                          minute: '2-digit',
                                                                      })
                                                                    : '—'}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs">
                                                                {device.gateway_name ?? '—'}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {device.recipe_name ?? '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={calInfo.variant}>
                                                                    {t(calInfo.label)}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </FadeIn>
            </div>
        </AppLayout>
    );
}
