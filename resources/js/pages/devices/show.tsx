import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, BreadcrumbItem, ChartDataPoint, Device } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    Clock,
    Cpu,
    MapPin,
    Radio,
    Signal,
} from 'lucide-react';

interface LatestReading {
    metric: string;
    value: number;
    unit: string;
    time: string;
}

interface Props {
    device: Device;
    chartData: ChartDataPoint[];
    latestReadings: LatestReading[];
    alerts: Alert[];
    availableMetrics: string[];
    period: string;
    metric: string;
}

export default function DeviceShow({
    device,
    chartData,
    latestReadings,
    alerts,
    availableMetrics,
    period,
    metric,
}: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: device.site?.name ?? 'Site', href: `/sites/${device.site_id}` },
        { title: device.name, href: '#' },
    ];

    function changePeriod(newPeriod: string) {
        router.get(`/devices/${device.id}`, { period: newPeriod, metric }, { preserveState: true, replace: true });
    }

    function changeMetric(newMetric: string) {
        router.get(`/devices/${device.id}`, { period, metric: newMetric }, { preserveState: true, replace: true });
    }

    const BatteryIcon = (device.battery_pct ?? 100) < 20 ? BatteryLow : (device.battery_pct ?? 100) < 60 ? BatteryMedium : BatteryFull;
    const batteryColor = (device.battery_pct ?? 100) < 20 ? 'text-red-500' : (device.battery_pct ?? 100) < 40 ? 'text-amber-500' : 'text-emerald-500';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={device.name} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.get(`/sites/${device.site_id}`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
                            <Badge variant="outline" className="font-mono">{device.model}</Badge>
                            <StatusBadge status={device.status} />
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{device.dev_eui}</p>
                    </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard
                        icon={<BatteryIcon className={`h-4 w-4 ${batteryColor}`} />}
                        label={t('Battery')}
                        value={device.battery_pct !== null ? `${device.battery_pct}%` : '—'}
                    />
                    <StatCard
                        icon={<Signal className="h-4 w-4" />}
                        label={t('Signal')}
                        value={device.rssi !== null ? `${device.rssi} dBm` : '—'}
                    />
                    <StatCard
                        icon={<Clock className="h-4 w-4" />}
                        label={t('Last Seen')}
                        value={device.last_reading_at ? formatTimeAgo(device.last_reading_at) : '—'}
                    />
                    <StatCard
                        icon={<AlertTriangle className="h-4 w-4" />}
                        label={t('Alerts')}
                        value={String(alerts.length)}
                    />
                </div>

                <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_300px]">
                    {/* Chart area */}
                    <div className="space-y-4">
                        {/* Controls */}
                        <Card>
                            <CardContent className="flex items-center justify-between p-3">
                                <div className="flex gap-1">
                                    {['24h', '7d', '30d'].map((p) => (
                                        <Button
                                            key={p}
                                            variant={period === p ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => changePeriod(p)}
                                        >
                                            {p}
                                        </Button>
                                    ))}
                                </div>
                                <Select value={metric} onValueChange={changeMetric}>
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableMetrics.map((m) => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

                        {/* Chart placeholder — data is ready for Recharts */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Activity className="h-4 w-4" />
                                    {metric} — {period}
                                </CardTitle>
                                <CardDescription>
                                    {chartData.length} {t('data points')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chartData.length === 0 ? (
                                    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                                        {t('No readings for this period')}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Simple ASCII-style data visualization */}
                                        <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t('Min')}</p>
                                                <p className="text-lg font-bold tabular-nums">
                                                    {Math.min(...chartData.map((d) => d.min_value ?? d.value ?? 0)).toFixed(1)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t('Avg')}</p>
                                                <p className="text-lg font-bold tabular-nums">
                                                    {(chartData.reduce((sum, d) => sum + (d.avg_value ?? d.value ?? 0), 0) / chartData.length).toFixed(1)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t('Max')}</p>
                                                <p className="text-lg font-bold tabular-nums">
                                                    {Math.max(...chartData.map((d) => d.max_value ?? d.value ?? 0)).toFixed(1)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center">
                                            {t('Recharts integration ready — chartData prop contains time-series data')}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Latest readings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Latest Readings')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {latestReadings.map((reading) => (
                                        <div key={reading.metric} className="rounded-lg border p-3">
                                            <p className="text-xs font-medium uppercase text-muted-foreground">
                                                {reading.metric}
                                            </p>
                                            <p className="mt-1 text-xl font-bold tabular-nums">
                                                {typeof reading.value === 'number' ? reading.value.toFixed(1) : reading.value}
                                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                    {reading.unit}
                                                </span>
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {formatTimeAgo(reading.time)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Device info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Device Info')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <InfoRow icon={<Cpu className="h-3.5 w-3.5" />} label={t('Model')} value={device.model} />
                                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label={t('Zone')} value={device.zone ?? '—'} />
                                <InfoRow icon={<Radio className="h-3.5 w-3.5" />} label={t('Gateway')} value={device.gateway?.serial ?? '—'} />
                                {device.recipe && (
                                    <InfoRow label={t('Recipe')} value={device.recipe.name} />
                                )}
                                {device.installed_at && (
                                    <InfoRow label={t('Installed')} value={new Date(device.installed_at).toLocaleDateString()} />
                                )}
                            </CardContent>
                        </Card>

                        {/* Alert history */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Alert History')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {alerts.length === 0 ? (
                                    <p className="text-center text-xs text-muted-foreground py-4">{t('No alerts')}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {alerts.map((alert) => (
                                            <div
                                                key={alert.id}
                                                className="flex items-center gap-2 rounded border p-2 text-xs cursor-pointer hover:bg-muted/50"
                                                onClick={() => router.get(`/alerts/${alert.id}`)}
                                            >
                                                <SeverityDot severity={alert.severity} />
                                                <div className="flex-1 truncate">
                                                    <p className="font-medium truncate">{alert.data?.rule_name}</p>
                                                    <p className="text-muted-foreground">{formatTimeAgo(alert.triggered_at)}</p>
                                                </div>
                                                <Badge variant={alert.status === 'active' ? 'destructive' : 'outline'} className="text-[10px]">
                                                    {alert.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-3">
                {icon}
                <div>
                    <p className="text-sm font-bold tabular-nums">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const v: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
        active: 'success', provisioned: 'info', pending: 'warning', offline: 'destructive', maintenance: 'outline',
    };
    return <Badge variant={v[status] ?? 'outline'}>{status}</Badge>;
}

function SeverityDot({ severity }: { severity: string }) {
    const c: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-blue-400' };
    return <span className={`h-2 w-2 shrink-0 rounded-full ${c[severity] ?? 'bg-zinc-400'}`} />;
}

function formatTimeAgo(s: string) {
    const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
    if (m < 1) return 'now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`;
}
