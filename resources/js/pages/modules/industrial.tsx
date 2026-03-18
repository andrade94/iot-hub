import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Industrial Monitoring')}</h1>
                    <p className="text-sm text-muted-foreground">{site.name}</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KPICard icon={<Cpu className="h-4 w-4" />} label={t('Devices')} value={String(kpis.total)} />
                    <KPICard
                        icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                        label={t('Vibration Alerts')}
                        value={String(kpis.alerts)}
                        accent={kpis.alerts > 0 ? 'amber' : undefined}
                    />
                    <KPICard icon={<Activity className="h-4 w-4" />} label={t('Avg Duty Cycle')} value={`${kpis.avgDuty}%`} />
                    <KPICard icon={<Gauge className="h-4 w-4" />} label={t('Avg Pressure')} value={`${kpis.avgPressure} bar`} />
                </div>

                {/* Equipment Grid */}
                <div>
                    <h2 className="mb-3 text-lg font-semibold">{t('Equipment')}</h2>
                    {devices.length === 0 ? (
                        <Card>
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <Cpu className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                    <p className="mt-2 text-sm text-muted-foreground">{t('No industrial devices')}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {devices.map((device) => (
                                <DeviceCard key={device.id} device={device} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Compressor Health Table */}
                {compressorHealth.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Compressor Health')}</CardTitle>
                        </CardHeader>
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
                                                <span className="tabular-nums">{c.duty_cycle}%</span>
                                                <Progress
                                                    value={c.duty_cycle}
                                                    size="sm"
                                                    variant={c.duty_cycle < 60 ? 'success' : c.duty_cycle < 80 ? 'warning' : 'destructive'}
                                                    className="w-16"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`tabular-nums ${c.degradation_score > 50 ? 'text-red-500' : c.degradation_score > 25 ? 'text-amber-500' : 'text-emerald-500'}`}>
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
                )}

                {/* Trend Chart */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{t('Trends')}</CardTitle>
                            <div className="flex gap-1">
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
                            </div>
                        </div>
                    </CardHeader>
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
            </div>
        </AppLayout>
    );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
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

function DeviceCard({ device }: { device: IndustrialDevice }) {
    const { t } = useLang();
    const m = device.metrics;

    return (
        <Card>
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
                            <span className="font-medium tabular-nums">{device.duty_cycle}%</span>
                        </div>
                        <Progress
                            value={device.duty_cycle}
                            size="sm"
                            variant={device.duty_cycle < 60 ? 'success' : device.duty_cycle < 80 ? 'warning' : 'destructive'}
                        />
                    </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                    {device.last_reading_at ? timeAgo(device.last_reading_at) : t('No data')}
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
                <span className="font-medium tabular-nums">{value}</span>
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

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
