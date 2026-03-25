import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatTimeAgo } from '@/utils/date';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Activity, AlertTriangle, Cpu, Gauge, Thermometer, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface IndustrialDevice {
    id: number;
    name: string;
    zone: string | null;
    model: string;
    metrics: {
        vibration?: { value: number; unit: string; status: 'normal' | 'warning' | 'critical' };
        current?: { value: number; unit: string };
        temperature?: { value: number; unit: string };
        pressure?: { value: number; unit: string };
    };
    duty_cycle?: number;
    last_reading_at: string | null;
}

interface CompressorHealth {
    device_name: string;
    duty_cycle: number;
    degradation_score: number;
    status: string;
}

interface Props {
    site: { id: number; name: string };
    devices: IndustrialDevice[];
    chartData: { time: string; vibration: number; current: number; pressure: number }[];
    compressorHealth: CompressorHealth[];
}

const PERIODS = ['24h', '7d', '30d'] as const;

// Pre-defined accent classes to avoid dynamic Tailwind purge issues
const accentClasses: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    orange: 'text-orange-600 dark:text-orange-400',
    blue: 'text-blue-600 dark:text-blue-400',
};

export default function IndustrialDashboard({ site, devices, chartData, compressorHealth }: Props) {
    const { t } = useLang();
    const [period, setPeriod] = useState<string>('24h');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Industrial Monitoring', href: '#' },
    ];

    const kpis = useMemo(() => {
        const alertDevices = devices.filter(
            (d) => d.metrics.vibration?.status === 'critical' || d.metrics.vibration?.status === 'warning',
        ).length;
        const avgDuty = devices.length > 0
            ? Math.round(devices.reduce((sum, d) => sum + (d.duty_cycle ?? 0), 0) / devices.length)
            : 0;
        const pressureDevices = devices.filter((d) => d.metrics.pressure);
        const avgPressure = pressureDevices.length > 0
            ? (pressureDevices.reduce((sum, d) => sum + (d.metrics.pressure?.value ?? 0), 0) / pressureDevices.length).toFixed(1)
            : '--';

        return { total: devices.length, alerts: alertDevices, avgDuty, avgPressure };
    }, [devices]);

    function changePeriod(p: string) {
        setPeriod(p);
        router.get(`/sites/${site.id}/modules/industrial`, { period: p }, { preserveState: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Industrial Monitoring')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Industrial Monitor')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {site.name}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums">{devices.length}</span> {t('devices monitored')}
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── OVERVIEW ─────────────────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Overview')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FadeIn delay={100} duration={400}>
                        <KPICard icon={<Cpu className="h-4 w-4" />} label={t('Devices')} value={String(kpis.total)} />
                    </FadeIn>
                    <FadeIn delay={125} duration={400}>
                        <KPICard
                            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                            label={t('Vibration Alerts')}
                            value={String(kpis.alerts)}
                            accent={kpis.alerts > 0 ? 'amber' : undefined}
                        />
                    </FadeIn>
                    <FadeIn delay={150} duration={400}>
                        <KPICard icon={<Activity className="h-4 w-4" />} label={t('Avg Duty Cycle')} value={`${kpis.avgDuty}%`} />
                    </FadeIn>
                    <FadeIn delay={175} duration={400}>
                        <KPICard icon={<Gauge className="h-4 w-4" />} label={t('Avg Pressure')} value={`${kpis.avgPressure} bar`} />
                    </FadeIn>
                </div>

                {/* ── EQUIPMENT ────────────────────────────────────── */}
                <FadeIn delay={200} duration={400}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Equipment')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            {devices.length}
                        </span>
                    </div>
                </FadeIn>

                {devices.length === 0 ? (
                    <FadeIn delay={225} duration={400}>
                        <Card className="shadow-elevation-1">
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <Cpu className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                    <p className="mt-2 text-sm text-muted-foreground">{t('No industrial devices')}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </FadeIn>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {devices.map((device, i) => (
                            <FadeIn key={device.id} delay={225 + i * 50} duration={400}>
                                <DeviceCard device={device} />
                            </FadeIn>
                        ))}
                    </div>
                )}

                {/* ── COMPRESSOR HEALTH ────────────────────────────── */}
                {compressorHealth.length > 0 && (
                    <>
                        <FadeIn delay={225 + devices.length * 50} duration={400}>
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Compressor Health')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {compressorHealth.length}
                                </span>
                            </div>
                        </FadeIn>

                        <FadeIn delay={250 + devices.length * 50} duration={400}>
                            <Card className="shadow-elevation-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Device')}</TableHead>
                                            <TableHead>{t('Duty Cycle')}</TableHead>
                                            <TableHead>{t('Degradation')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {compressorHealth.map((c) => (
                                            <TableRow key={c.device_name}>
                                                <TableCell className="font-medium">{c.device_name}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono tabular-nums">{c.duty_cycle}%</span>
                                                        <Progress
                                                            value={c.duty_cycle}
                                                            size="sm"
                                                            variant={c.duty_cycle < 60 ? 'success' : c.duty_cycle < 80 ? 'warning' : 'destructive'}
                                                            className="w-16"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`font-mono tabular-nums ${c.degradation_score > 50 ? 'text-red-500' : c.degradation_score > 25 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                        {c.degradation_score}/100
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <HealthBadge status={c.status} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </FadeIn>
                    </>
                )}

                {/* ── TREND ────────────────────────────────────────── */}
                <FadeIn delay={275 + devices.length * 50 + (compressorHealth.length > 0 ? 50 : 0)} duration={400}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Trend')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>

                <FadeIn delay={300 + devices.length * 50 + (compressorHealth.length > 0 ? 50 : 0)} duration={400}>
                    <Card className="shadow-elevation-1">
                        <div className="flex items-center justify-between p-6 pb-2">
                            <h3 className="text-base font-semibold">{t('Trends')}</h3>
                            <ButtonGroup>
                                {PERIODS.map((p) => (
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
                        </div>
                        <CardContent>
                            {chartData.length === 0 ? (
                                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                                    {t('No data for selected period')}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="vibration" stroke="#ef4444" name="Vibration" dot={false} strokeWidth={2} />
                                        <Line type="monotone" dataKey="current" stroke="#3b82f6" name="Current (A)" dot={false} strokeWidth={2} />
                                        <Line type="monotone" dataKey="pressure" stroke="#f59e0b" name="Pressure (bar)" dot={false} strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

export function IndustrialDashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-3 h-8 w-40" />
                <Skeleton className="mt-2 h-4 w-36" />
            </div>
            {/* Overview */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-4 w-4" />
                            <div>
                                <Skeleton className="h-7 w-14" />
                                <Skeleton className="mt-1 h-3 w-20" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Equipment */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-20" />
                <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                        {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="flex justify-between">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                        <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                ))}
            </div>
            {/* Chart */}
            <div className="rounded-xl border p-6">
                <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
        </div>
    );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
    return (
        <Card className="shadow-elevation-1">
            <CardContent className="flex items-center gap-3 p-4">
                {icon}
                <div>
                    <p className={`font-mono text-2xl font-bold tabular-nums ${accentClasses[accent ?? ''] ?? ''}`}>{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function DeviceCard({ device }: { device: IndustrialDevice }) {
    const { t } = useLang();
    const m = device.metrics;

    return (
        <Card className="shadow-elevation-1">
            <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                    <span className="font-medium">{device.name}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">{device.model}</Badge>
                </div>

                {device.zone && <p className="text-xs text-muted-foreground">{device.zone}</p>}

                <div className="space-y-2 text-sm">
                    {m.vibration && (
                        <MetricRow
                            icon={<Activity className="h-3.5 w-3.5" />}
                            label={t('Vibration')}
                            value={`${m.vibration.value} ${m.vibration.unit}`}
                            status={m.vibration.status}
                        />
                    )}
                    {m.current && (
                        <MetricRow icon={<Zap className="h-3.5 w-3.5" />} label={t('Current')} value={`${m.current.value} ${m.current.unit}`} />
                    )}
                    {m.temperature && (
                        <MetricRow icon={<Thermometer className="h-3.5 w-3.5" />} label={t('Temperature')} value={`${m.temperature.value} ${m.temperature.unit}`} />
                    )}
                    {m.pressure && (
                        <MetricRow icon={<Gauge className="h-3.5 w-3.5" />} label={t('Pressure')} value={`${m.pressure.value} ${m.pressure.unit}`} />
                    )}
                </div>

                {device.duty_cycle != null && (
                    <div>
                        <div className="mb-1 flex justify-between text-xs">
                            <span className="text-muted-foreground">{t('Duty Cycle')}</span>
                            <span className="font-mono font-medium tabular-nums">{device.duty_cycle}%</span>
                        </div>
                        <Progress
                            value={device.duty_cycle}
                            size="sm"
                            variant={device.duty_cycle < 60 ? 'success' : device.duty_cycle < 80 ? 'warning' : 'destructive'}
                        />
                    </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                    {device.last_reading_at ? formatTimeAgo(device.last_reading_at) : t('No data')}
                </p>
            </CardContent>
        </Card>
    );
}

function MetricRow({ icon, label, value, status }: { icon: React.ReactNode; label: string; value: string; status?: string }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
                {icon}
                <span>{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="font-mono font-medium tabular-nums">{value}</span>
                {status && (
                    <span
                        className={`h-2 w-2 rounded-full ${
                            status === 'critical' ? 'bg-red-500' : status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                    />
                )}
            </div>
        </div>
    );
}

function HealthBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
        healthy: 'success',
        degraded: 'warning',
        critical: 'destructive',
    };
    return <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>;
}
