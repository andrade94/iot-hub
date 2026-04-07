import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Alert, BreadcrumbItem, ChartDataPoint, Device, Site, ZoneMetricSummary } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { isDeviceOnline } from '@/utils/device';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    Check,
    ChevronRight,
    Plus,
    Signal,
    SignalLow,
    SignalMedium,
    Thermometer,
} from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface AvailableDevice {
    id: number;
    name: string;
    model: string;
    zone: string | null;
}

interface Props {
    site: Site;
    zone: string;
    devices: Device[];
    summary: ZoneMetricSummary[];
    alerts: Alert[];
    chartData?: ChartDataPoint[];
    period?: string;
    availableDevices?: AvailableDevice[];
}

const severityDot: Record<string, string> = {
    critical: 'bg-rose-500 animate-pulse', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-blue-400',
};

const severityBadge: Record<string, string> = {
    critical: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/40 dark:border-rose-800/40',
    high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/40 dark:border-orange-800/40',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/40 dark:border-amber-800/40',
    low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/40 dark:border-blue-800/40',
};

export default function ZoneDetail({ site, zone, devices, summary, alerts, chartData = [], period = '24h', availableDevices = [] }: Props) {
    const { t } = useLang();
    const [showAssign, setShowAssign] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: zone, href: '#' },
    ];

    const onlineCount = devices.filter((d) => isDeviceOnline(d.last_reading_at)).length;
    const allOnline = onlineCount === devices.length && devices.length > 0;

    // Find temp summary for chart range band
    const tempSummary = summary.find((s) => s.metric.toLowerCase().includes('temp'));

    function changePeriod(newPeriod: string): void {
        router.get(`/sites/${site.id}/zones/${encodeURIComponent(zone)}`, { period: newPeriod }, { preserveState: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${zone} — ${site.name}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">

                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div>
                        <button
                            onClick={() => router.get(`/sites/${site.id}`)}
                            className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-3 w-3" />{site.name}
                        </button>
                        <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground md:text-[32px]">
                            {zone}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">
                                {devices.length} {t('devices')} · {onlineCount} {t('online')}
                            </Badge>
                            {allOnline && (
                                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                    {t('All OK')}
                                </span>
                            )}
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ METRIC SUMMARY STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {summary.length > 0 && (
                    <FadeIn delay={50} duration={400}>
                        <div className="mt-6 flex items-stretch overflow-hidden rounded-lg border border-border bg-card">
                            {summary.map((metric, i) => (
                                <div
                                    key={metric.metric}
                                    className={`flex flex-1 flex-col items-center gap-1.5 py-5 ${i < summary.length - 1 ? 'border-r border-border/50' : ''}`}
                                >
                                    <span className="font-display text-4xl font-bold leading-none tracking-tight text-foreground">
                                        {metric.current?.toFixed(1) ?? '—'}
                                        <span className="ml-1 text-base font-normal text-muted-foreground">{metric.unit}</span>
                                    </span>
                                    <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{metric.metric}</span>
                                    <div className="flex gap-2 font-mono text-[9px] tabular-nums text-muted-foreground/70">
                                        <span>{metric.min?.toFixed(1)}</span>
                                        <span>·</span>
                                        <span>{metric.avg?.toFixed(1)}</span>
                                        <span>·</span>
                                        <span>{metric.max?.toFixed(1)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                )}

                {/* ━━ CHART ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={t('Temperature')} />
                <FadeIn delay={100} duration={500}>
                    <ZoneChart
                        chartData={chartData}
                        period={period}
                        onPeriodChange={changePeriod}
                        tempSummary={tempSummary}
                        t={t}
                    />
                </FadeIn>

                {/* ━━ DEVICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="my-7 flex items-center gap-4">
                    <div className="h-px flex-1 bg-border" />
                    <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('Devices in Zone').toUpperCase()}</span>
                    <div className="h-px flex-1 bg-border" />
                </div>
                {availableDevices.length > 0 && (
                    <div className="-mt-4 mb-4 flex justify-end">
                        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setShowAssign(true)}>
                            <Plus className="mr-1 h-3 w-3" />{t('Assign')}
                        </Button>
                    </div>
                )}
                <FadeIn delay={175} duration={400}>
                    {devices.length === 0 ? (
                        <EmptyState size="sm" variant="muted"
                            icon={<Thermometer className="h-5 w-5 text-muted-foreground" />}
                            title={t('No devices in this zone')}
                            description={t('Devices assigned to this zone will appear here')}
                        />
                    ) : (
                        <div className="space-y-3">
                            {devices.map((device, i) => (
                                <FadeIn key={device.id} delay={i * 40} duration={400}>
                                    <DeviceCard device={device} t={t} />
                                </FadeIn>
                            ))}
                        </div>
                    )}
                </FadeIn>

                {/* ━━ ALERTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={t('Recent Alerts')} />
                <FadeIn delay={250} duration={400}>
                    {alerts.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10">
                            <Signal className="h-6 w-6 text-emerald-500" />
                            <p className="text-sm text-muted-foreground">{t('All clear — no alerts for this zone')}</p>
                        </div>
                    ) : (
                        <Card className="border-border shadow-none overflow-hidden">
                            <div className="divide-y divide-border/30">
                                {alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                        onClick={() => router.get(`/alerts/${alert.id}`)}
                                    >
                                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${severityDot[alert.severity] ?? severityDot.low}`} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-medium">
                                                {alert.data?.rule_name ?? `Alert #${alert.id}`}
                                            </p>
                                            <p className="truncate font-mono text-[10px] text-muted-foreground">
                                                {alert.data?.device_name}
                                            </p>
                                        </div>
                                        <span className={`rounded border px-2 py-0.5 text-[9px] font-medium capitalize ${severityBadge[alert.severity] ?? severityBadge.low}`}>
                                            {alert.severity}
                                        </span>
                                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
                                            {formatTimeAgo(alert.triggered_at)}
                                        </span>
                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </FadeIn>

                {/* ━━ ASSIGN DIALOG ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <AssignDeviceDialog
                    site={site} zone={zone} availableDevices={availableDevices}
                    open={showAssign} onOpenChange={setShowAssign}
                />
            </div>
        </AppLayout>
    );
}

/* -- Assign Device Dialog -------------------------------------------- */

function AssignDeviceDialog({ site, zone, availableDevices, open, onOpenChange }: {
    site: Site; zone: string; availableDevices: AvailableDevice[];
    open: boolean; onOpenChange: (open: boolean) => void;
}) {
    const { t } = useLang();
    const [selected, setSelected] = useState<Set<number>>(new Set());

    function toggle(id: number) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    }

    function handleAssign() {
        if (selected.size === 0) return;
        // Update each device's zone — sequential PUTs
        const ids = [...selected];
        let completed = 0;
        ids.forEach((id) => {
            router.put(`/sites/${site.id}/devices/${id}`, { zone }, {
                preserveScroll: true,
                onSuccess: () => {
                    completed++;
                    if (completed === ids.length) {
                        setSelected(new Set());
                        onOpenChange(false);
                    }
                },
            });
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Assign Devices to Zone')}</DialogTitle>
                    <DialogDescription>
                        {t('Select devices to move into')} <span className="font-semibold">{zone}</span>
                    </DialogDescription>
                </DialogHeader>
                {availableDevices.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t('All devices are already in this zone')}</p>
                ) : (
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                        {availableDevices.map((d) => {
                            const isSelected = selected.has(d.id);
                            return (
                                <button key={d.id} type="button" onClick={() => toggle(d.id)}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors',
                                        isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:bg-accent/30',
                                    )}>
                                    <div className={cn(
                                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                                    )}>
                                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-medium">{d.name}</p>
                                        <p className="font-mono text-[10px] text-muted-foreground">
                                            {d.model}{d.zone ? ` · ${d.zone}` : ` · ${t('Unassigned')}`}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
                    <Button onClick={handleAssign} disabled={selected.size === 0}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        {t('Assign')} {selected.size > 0 && `(${selected.size})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* -- Section Divider ------------------------------------------------- */

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{label.toUpperCase()}</span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

/* -- Zone Chart ------------------------------------------------------ */

interface ZoneChartProps {
    chartData: ChartDataPoint[];
    period: string;
    onPeriodChange: (period: string) => void;
    tempSummary?: ZoneMetricSummary;
    t: (key: string) => string;
}

function ZoneChart({ chartData, period, onPeriodChange, tempSummary, t }: ZoneChartProps) {
    // Acceptable temperature range (2°C – 5°C for cold storage, fallback)
    const rangeMin = 2;
    const rangeMax = 5;

    return (
        <Card className="border-border shadow-none">
            <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                            <Thermometer className="h-4 w-4 text-muted-foreground/70" />
                            {t('Temperature')} — {period === '24h' ? t('Last 24 Hours') : period === '7d' ? t('Last 7 Days') : t('Last 30 Days')}
                        </h3>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                            {chartData.length > 0
                                ? <>{chartData.length} {t('data points')} · {t('Acceptable range')} {rangeMin}°C – {rangeMax}°C</>
                                : t('No data available for this period')}
                        </p>
                    </div>
                    <div className="flex overflow-hidden rounded-md border border-border">
                        {(['24h', '7d', '30d'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => onPeriodChange(p)}
                                className={cn(
                                    'px-3 py-1.5 font-mono text-[10px] font-medium transition-colors',
                                    period === p
                                        ? 'bg-accent text-foreground'
                                        : 'text-muted-foreground/70 hover:bg-accent/30 hover:text-muted-foreground'
                                )}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                        {t('No readings for this period')}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                            <defs>
                                <linearGradient id="zoneAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" strokeOpacity={0.5} />
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 10, fontFamily: 'Fira Code', fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fontFamily: 'Fira Code', fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                            />
                            {/* Acceptable range band */}
                            <ReferenceArea
                                y1={rangeMin}
                                y2={rangeMax}
                                fill="#10b981"
                                fillOpacity={0.06}
                                stroke="#10b981"
                                strokeOpacity={0.2}
                                strokeDasharray="4 4"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--popover))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: 11,
                                    fontFamily: 'Fira Code',
                                    color: 'hsl(var(--popover-foreground))',
                                    padding: '8px 12px',
                                }}
                                labelStyle={{ fontWeight: 600, marginBottom: 4, fontFamily: 'Lexend' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                fill="url(#zoneAreaGradient)"
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--primary))' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}

                {/* Chart legend */}
                {chartData.length > 0 && (
                    <div className="mt-3 flex items-center justify-center gap-5 text-[10px] text-muted-foreground/70">
                        <span className="flex items-center gap-1.5">
                            <span className="h-[2px] w-4 rounded-full bg-[hsl(var(--primary))]" />
                            {t('Temperature')}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-4 rounded-sm bg-emerald-500/10 border border-dashed border-emerald-500/30" />
                            {t('Acceptable Range')}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* -- Device Card ----------------------------------------------------- */

function DeviceCard({ device, t }: { device: Device; t: (key: string) => string }) {
    const online = isDeviceOnline(device.last_reading_at);

    return (
        <div
            className="group flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-colors cursor-pointer hover:border-primary/30"
            onClick={() => router.get(`/devices/${device.id}`)}
        >
            {/* Status dot + info */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${online ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                    <span className="truncate text-[13px] font-medium text-foreground">{device.name}</span>
                    <Badge variant="outline" className="ml-1 font-mono text-[9px]">{device.model}</Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-4 text-[11px]">
                    {device.last_reading_at && (
                        <span className="font-mono text-muted-foreground/70">
                            {formatTimeAgo(device.last_reading_at)}
                        </span>
                    )}
                    <BatteryDisplay pct={device.battery_pct} />
                    <SignalDisplay rssi={device.rssi} />
                </div>
            </div>

            {/* Status label */}
            <span className={`text-[11px] font-medium ${online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {online ? t('Online') : t('Offline')}
            </span>

            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        </div>
    );
}

/* -- Battery Display ------------------------------------------------- */

function BatteryDisplay({ pct }: { pct: number | null }) {
    if (pct === null) return null;
    const Icon = pct < 20 ? BatteryLow : pct < 60 ? BatteryMedium : BatteryFull;
    const color = pct < 20 ? 'text-rose-600 dark:text-rose-400' : pct < 40 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/70';
    return (
        <span className={`flex items-center gap-1 ${color}`}>
            <Icon className="h-3 w-3" />
            <span className="font-mono text-[10px] tabular-nums">{pct}%</span>
        </span>
    );
}

/* -- Signal Display -------------------------------------------------- */

function SignalDisplay({ rssi }: { rssi: number | null }) {
    if (rssi === null) return null;
    const Icon = rssi > -70 ? Signal : rssi > -90 ? SignalMedium : SignalLow;
    return (
        <span className="flex items-center gap-1 text-muted-foreground/70">
            <Icon className="h-3 w-3" />
            <span className="font-mono text-[10px] tabular-nums">{rssi} dBm</span>
        </span>
    );
}
