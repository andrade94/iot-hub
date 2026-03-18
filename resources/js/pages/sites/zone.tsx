import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, BreadcrumbItem, ChartDataPoint, Device, Site, ZoneMetricSummary } from '@/types';
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
    Thermometer,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Props {
    site: Site;
    zone: string;
    devices: Device[];
    summary: ZoneMetricSummary[];
    alerts: Alert[];
    chartData?: ChartDataPoint[];
    period?: string;
}

export default function ZoneDetail({ site, zone, devices, summary, alerts, chartData = [], period = '24h' }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: zone, href: '#' },
    ];

    const onlineCount = devices.filter((d) => isOnline(d)).length;

    function changePeriod(newPeriod: string): void {
        router.get(`/sites/${site.id}/zones/${encodeURIComponent(zone)}`, { period: newPeriod }, { preserveState: true, replace: true });
    }

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

                {/* Zone temperature chart */}
                <ZoneChart
                    chartData={chartData}
                    period={period}
                    onPeriodChange={changePeriod}
                    t={t}
                />

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

interface ZoneChartProps {
    chartData: ChartDataPoint[];
    period: string;
    onPeriodChange: (period: string) => void;
    t: (key: string) => string;
}

function ZoneChart({ chartData, period, onPeriodChange, t }: ZoneChartProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Thermometer className="h-4 w-4" />
                        {t('Temperature Readings')}
                    </CardTitle>
                    <CardDescription>
                        {chartData.length > 0
                            ? `${chartData.length} ${t('data points')}`
                            : t('No data available for this period')}
                    </CardDescription>
                </div>
                <div className="flex gap-1">
                    {(['24h', '7d', '30d'] as const).map((p) => (
                        <Button
                            key={p}
                            variant={period === p ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onPeriodChange(p)}
                        >
                            {p}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                        {t('No readings for this period')}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                            <defs>
                                <linearGradient id="zoneAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
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
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#zoneAreaGradient)"
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
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
