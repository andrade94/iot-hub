import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useMemo } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

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

                        {/* Device metric chart */}
                        <DeviceChart chartData={chartData} metric={metric} period={period} t={t} />

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

interface DeviceChartProps {
    chartData: ChartDataPoint[];
    metric: string;
    period: string;
    t: (key: string) => string;
}

function DeviceChart({ chartData, metric, period, t }: DeviceChartProps) {
    const stats = useMemo(() => {
        if (chartData.length === 0) return null;

        const values = chartData.map((d) => d.avg_value ?? d.value ?? 0);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

        return { min, max, avg };
    }, [chartData]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4" />
                    {metric} — {period}
                </CardTitle>
                <CardDescription>
                    {chartData.length} {t('data points')}
                    {stats && (
                        <span className="ml-3 tabular-nums">
                            {t('Min')} {stats.min.toFixed(1)} · {t('Avg')} {stats.avg.toFixed(1)} · {t('Max')} {stats.max.toFixed(1)}
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                        {t('No readings for this period')}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                            <defs>
                                <linearGradient id="deviceLineGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                className="fill-muted-foreground"
                            />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                className="fill-muted-foreground"
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--popover))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: 12,
                                    color: 'hsl(var(--popover-foreground))',
                                }}
                                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                                formatter={(val: number) => [val.toFixed(2), metric]}
                                labelFormatter={(label: string) => label}
                            />
                            {stats && (
                                <>
                                    <ReferenceLine
                                        y={stats.min}
                                        stroke="#ef4444"
                                        strokeDasharray="4 4"
                                        strokeOpacity={0.5}
                                        label={{ value: t('Min'), position: 'insideTopLeft', fontSize: 10, fill: '#ef4444' }}
                                    />
                                    <ReferenceLine
                                        y={stats.avg}
                                        stroke="#f59e0b"
                                        strokeDasharray="4 4"
                                        strokeOpacity={0.5}
                                        label={{ value: t('Avg'), position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }}
                                    />
                                    <ReferenceLine
                                        y={stats.max}
                                        stroke="#ef4444"
                                        strokeDasharray="4 4"
                                        strokeOpacity={0.5}
                                        label={{ value: t('Max'), position: 'insideBottomLeft', fontSize: 10, fill: '#ef4444' }}
                                    />
                                </>
                            )}
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
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

export function DeviceShowSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-3 w-40" />
                </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="flex items-center gap-3 p-3">
                            <Skeleton className="h-4 w-4 rounded" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-3 w-12" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_300px]">
                {/* Chart area */}
                <div className="space-y-4">
                    {/* Controls */}
                    <Card>
                        <CardContent className="flex items-center justify-between p-3">
                            <div className="flex gap-1">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-8 w-12" />
                                ))}
                            </div>
                            <Skeleton className="h-9 w-[160px]" />
                        </CardContent>
                    </Card>

                    {/* Chart placeholder */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-5 w-40" />
                            </div>
                            <Skeleton className="h-3 w-56" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[300px] w-full" />
                        </CardContent>
                    </Card>

                    {/* Latest readings */}
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-5 w-32" />
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="rounded-lg border p-3 space-y-2">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-6 w-16" />
                                        <Skeleton className="h-2 w-12" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-5 w-24" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <Skeleton className="h-5 w-28" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-2 rounded border p-2">
                                    <Skeleton className="h-2 w-2 rounded-full" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-3 w-24" />
                                        <Skeleton className="h-2 w-14" />
                                    </div>
                                    <Skeleton className="h-4 w-12" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
