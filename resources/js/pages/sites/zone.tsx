import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, BreadcrumbItem, Device, Site, ZoneMetricSummary } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    Cpu,
    Signal,
    SignalLow,
    SignalMedium,
} from 'lucide-react';

interface Props {
    site: Site;
    zone: string;
    devices: Device[];
    summary: ZoneMetricSummary[];
    alerts: Alert[];
}

export default function ZoneDetail({ site, zone, devices, summary, alerts }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: zone, href: '#' },
    ];

    const onlineCount = devices.filter((d) => isOnline(d)).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${zone} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.get(`/sites/${site.id}`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{zone}</h1>
                        <p className="text-sm text-muted-foreground">
                            {site.name} — {devices.length} {t('device(s)')}, {onlineCount} {t('online')}
                        </p>
                    </div>
                </div>

                {/* Metric summary cards */}
                {summary.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {summary.map((metric) => (
                            <Card key={metric.metric}>
                                <CardContent className="p-4">
                                    <p className="text-xs font-medium uppercase text-muted-foreground">
                                        {metric.metric}
                                    </p>
                                    <p className="mt-1 text-2xl font-bold tabular-nums">
                                        {metric.current?.toFixed(1) ?? '—'}
                                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                                            {metric.unit}
                                        </span>
                                    </p>
                                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                                        <span>{t('Min')} {metric.min?.toFixed(1)}</span>
                                        <span>{t('Avg')} {metric.avg?.toFixed(1)}</span>
                                        <span>{t('Max')} {metric.max?.toFixed(1)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_300px]">
                    {/* Devices table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Devices')}</CardTitle>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Device')}</TableHead>
                                    <TableHead>{t('Model')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead>{t('Battery')}</TableHead>
                                    <TableHead>{t('Signal')}</TableHead>
                                    <TableHead>{t('Last Seen')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {devices.map((device) => (
                                    <TableRow
                                        key={device.id}
                                        className="cursor-pointer"
                                        onClick={() => router.get(`/devices/${device.id}`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${isOnline(device) ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                                                <span className="font-medium">{device.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">{device.model}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={device.status} />
                                        </TableCell>
                                        <TableCell>
                                            <BatteryDisplay pct={device.battery_pct} />
                                        </TableCell>
                                        <TableCell>
                                            <SignalDisplay rssi={device.rssi} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {device.last_reading_at ? formatTimeAgo(device.last_reading_at) : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Alert timeline */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">{t('Recent Alerts')}</h3>
                        {alerts.length === 0 ? (
                            <Card>
                                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                                    {t('No alerts for this zone')}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {alerts.map((alert) => (
                                    <Card
                                        key={alert.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => router.get(`/alerts/${alert.id}`)}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-start gap-2">
                                                <SeverityDot severity={alert.severity} />
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium">
                                                        {alert.data?.rule_name ?? `Alert #${alert.id}`}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {alert.data?.device_name}
                                                    </p>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <Badge
                                                            variant={alert.status === 'active' ? 'destructive' : alert.status === 'resolved' ? 'success' : 'outline'}
                                                            className="text-[10px]"
                                                        >
                                                            {alert.status}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {formatTimeAgo(alert.triggered_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function StatusBadge({ status }: { status: string }) {
    const v: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
        active: 'success', provisioned: 'info', pending: 'warning', offline: 'destructive', maintenance: 'outline',
    };
    return <Badge variant={v[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}

function BatteryDisplay({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;
    const Icon = pct < 20 ? BatteryLow : pct < 60 ? BatteryMedium : BatteryFull;
    const color = pct < 20 ? 'text-red-500' : pct < 40 ? 'text-amber-500' : 'text-emerald-500';
    return <div className="flex items-center gap-1"><Icon className={`h-4 w-4 ${color}`} /><span className="text-xs tabular-nums">{pct}%</span></div>;
}

function SignalDisplay({ rssi }: { rssi: number | null }) {
    if (rssi === null) return <span className="text-xs text-muted-foreground">—</span>;
    const Icon = rssi > -70 ? Signal : rssi > -90 ? SignalMedium : SignalLow;
    return <div className="flex items-center gap-1"><Icon className="h-3.5 w-3.5" /><span className="text-xs tabular-nums">{rssi}</span></div>;
}

function SeverityDot({ severity }: { severity: string }) {
    const c: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-blue-400' };
    return <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${c[severity] ?? 'bg-zinc-400'}`} />;
}

function isOnline(d: Device) { return d.last_reading_at ? Date.now() - new Date(d.last_reading_at).getTime() < 15 * 60 * 1000 : false; }

function formatTimeAgo(s: string) {
    const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
    if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`;
}
