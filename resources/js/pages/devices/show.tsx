import { Can } from '@/components/Can';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { formatTimeAgo } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailCard, MetricCard } from '@/components/ui/detail-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, BreadcrumbItem, ChartDataPoint, Device } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Activity,
    ArrowLeft,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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

    const [showReplace, setShowReplace] = useState(false);
    const replaceForm = useForm({ new_dev_eui: '', new_app_key: '', new_model: '' });

    function changePeriod(newPeriod: string) {
        router.get(`/devices/${device.id}`, { period: newPeriod, metric }, { preserveState: true, replace: true });
    }

    function changeMetric(newMetric: string) {
        router.get(`/devices/${device.id}`, { period, metric: newMetric }, { preserveState: true, replace: true });
    }

    const batteryColor = (device.battery_pct ?? 100) < 20 ? 'text-red-500' : (device.battery_pct ?? 100) < 40 ? 'text-amber-500' : 'text-emerald-500';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={device.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div className="flex items-start gap-4">
                                <Button variant="ghost" size="icon" onClick={() => router.get(`/sites/${device.site_id}`)}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div>
                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Device Detail')}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                                        <h1 className="font-display text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                            {device.name}
                                        </h1>
                                        <StatusBadge status={device.status} />
                                    </div>
                                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                                        {device.model} · {device.dev_eui}
                                    </p>
                                </div>
                            </div>
                            {/* Replace button (Phase 10) */}
                            {['active', 'offline'].includes(device.status) && (
                                <Can permission="manage devices">
                                    <Button variant="outline" size="sm" onClick={() => setShowReplace(true)}>
                                        {t('Replace')}
                                    </Button>
                                </Can>
                            )}
                        </div>
                    </div>
                </FadeIn>

                {/* ── Quick Stats ──────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <FadeIn delay={0} duration={400}>
                        <MetricCard
                            label={t('Battery')}
                            value={device.battery_pct !== null ? `${device.battery_pct}%` : '—'}
                            badge={
                                device.battery_pct !== null
                                    ? (device.battery_pct ?? 100) < 20
                                        ? t('Low')
                                        : (device.battery_pct ?? 100) < 40
                                          ? t('Fair')
                                          : t('Good')
                                    : undefined
                            }
                            badgeColor={batteryColor}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                    <FadeIn delay={60} duration={400}>
                        <MetricCard
                            label={t('Signal')}
                            value={device.rssi !== null ? `${device.rssi} dBm` : '—'}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                    <FadeIn delay={120} duration={400}>
                        <MetricCard
                            label={t('Last Seen')}
                            value={device.last_reading_at ? formatTimeAgo(device.last_reading_at) : '—'}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                    <FadeIn delay={180} duration={400}>
                        <MetricCard
                            label={t('Alerts')}
                            value={alerts.length}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                </div>

                <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_300px]">
                    {/* ── Chart Area ──────────────────────────────── */}
                    <div className="space-y-6">
                        {/* Readings section divider + controls */}
                        <FadeIn delay={100} duration={500}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Readings')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                </div>

                                {/* Controls */}
                                <Card className="shadow-elevation-1">
                                    <CardContent className="flex items-center justify-between p-3">
                                        <ButtonGroup>
                                            {['24h', '7d', '30d'].map((p) => (
                                                <Button
                                                    key={p}
                                                    variant={period === p ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => changePeriod(p)}
                                                >
                                                    {p}
                                                </Button>
                                            ))}
                                        </ButtonGroup>
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
                            </div>
                        </FadeIn>

                        {/* ── Latest Readings ─────────────────────── */}
                        <FadeIn delay={200} duration={500}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Latest Readings')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                        {latestReadings.length}
                                    </span>
                                </div>

                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                            {latestReadings.map((reading) => (
                                                <div key={reading.metric} className="rounded-lg border p-3">
                                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                        {reading.metric}
                                                    </p>
                                                    <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                                                        {typeof reading.value === 'number' ? reading.value.toFixed(1) : reading.value}
                                                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                            {reading.unit}
                                                        </span>
                                                    </p>
                                                    <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                                        {formatTimeAgo(reading.time)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </FadeIn>
                    </div>

                    {/* ── Sidebar ─────────────────────────────────── */}
                    <div className="space-y-6">
                        {/* Device Info */}
                        <FadeIn delay={150} duration={500}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Device Info')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                </div>

                                <DetailCard
                                    className="shadow-elevation-1"
                                    items={[
                                        { label: t('Model'), value: <span className="font-mono tabular-nums">{device.model}</span> },
                                        { label: t('Zone'), value: device.zone ?? '—' },
                                        { label: t('Gateway'), value: <span className="font-mono tabular-nums">{device.gateway?.serial ?? '—'}</span> },
                                        ...(device.recipe ? [{ label: t('Recipe'), value: device.recipe.name }] : []),
                                        ...(device.installed_at ? [{ label: t('Installed'), value: <span className="font-mono tabular-nums">{new Date(device.installed_at).toLocaleDateString()}</span> }] : []),
                                    ]}
                                />
                            </div>
                        </FadeIn>

                        {/* Alert History */}
                        <FadeIn delay={250} duration={500}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Alert History')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                    {alerts.length > 0 && (
                                        <Badge variant="destructive" className="font-mono tabular-nums">
                                            {alerts.length}
                                        </Badge>
                                    )}
                                </div>

                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-4">
                                        {alerts.length === 0 ? (
                                            <p className="py-4 text-center text-xs text-muted-foreground">{t('No alerts')}</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {alerts.map((alert) => (
                                                    <div
                                                        key={alert.id}
                                                        className="flex cursor-pointer items-center gap-2 rounded border p-2 text-xs transition-colors hover:bg-muted/50"
                                                        onClick={() => router.get(`/alerts/${alert.id}`)}
                                                    >
                                                        <SeverityDot severity={alert.severity} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate font-medium">{alert.data?.rule_name}</p>
                                                            <p className="font-mono tabular-nums text-muted-foreground">
                                                                {formatTimeAgo(alert.triggered_at)}
                                                            </p>
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
                        </FadeIn>
                    </div>
                </div>

                {/* Device Replacement Dialog (Phase 10) */}
                <Dialog open={showReplace} onOpenChange={setShowReplace}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('Replace Device')}</DialogTitle>
                            <DialogDescription>{t('Transfer all config to a new device. Old device will be marked as replaced.')}</DialogDescription>
                        </DialogHeader>
                        <div className="rounded-lg bg-muted p-3 text-sm">
                            <p className="font-medium">{device.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{device.dev_eui} · {device.model}</p>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); replaceForm.post(`/sites/${device.site_id}/devices/${device.id}/replace`, { preserveScroll: true, onSuccess: () => { replaceForm.reset(); setShowReplace(false); } }); }} className="space-y-4">
                            <div className="grid gap-2">
                                <Label>{t('New DevEUI')}</Label>
                                <Input value={replaceForm.data.new_dev_eui} onChange={e => replaceForm.setData('new_dev_eui', e.target.value)} placeholder={t('Scan or enter DevEUI')} className="font-mono" maxLength={16} />
                                <InputError message={replaceForm.errors.new_dev_eui} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('New AppKey')}</Label>
                                <Input value={replaceForm.data.new_app_key} onChange={e => replaceForm.setData('new_app_key', e.target.value)} placeholder={t('Enter OTAA AppKey')} className="font-mono" maxLength={32} />
                                <InputError message={replaceForm.errors.new_app_key} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowReplace(false)}>{t('Cancel')}</Button>
                                <Button type="submit" disabled={replaceForm.processing}>{replaceForm.processing ? t('Replacing...') : t('Replace Device')}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
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
        <Card className="shadow-elevation-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4" />
                    {metric} — {period}
                </CardTitle>
                <CardDescription>
                    <span className="font-mono tabular-nums">{chartData.length}</span> {t('data points')}
                    {stats && (
                        <span className="ml-3 font-mono tabular-nums">
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

export function DeviceShowSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-48" />
                <Skeleton className="mt-2 h-3 w-40" />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="shadow-elevation-1">
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

            <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_300px]">
                {/* Chart area */}
                <div className="space-y-6">
                    {/* Section divider */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-16" />
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Controls */}
                    <Card className="shadow-elevation-1">
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
                    <Card className="shadow-elevation-1">
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

                    {/* Latest readings section divider */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-28" />
                        <div className="h-px flex-1 bg-border" />
                        <Skeleton className="h-3 w-4" />
                    </div>

                    {/* Latest readings */}
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="space-y-2 rounded-lg border p-3">
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
                <div className="space-y-6">
                    {/* Device Info section divider */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-20" />
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    <Card className="shadow-elevation-1">
                        <CardContent className="space-y-3 p-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Alert History section divider */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-24" />
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    <Card className="shadow-elevation-1">
                        <CardContent className="space-y-2 p-4">
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
