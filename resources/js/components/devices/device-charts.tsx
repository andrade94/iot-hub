import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ChartDataPoint } from '@/types';
import { Activity, DoorOpen, Gauge, Users, Zap } from 'lucide-react';
import { useMemo } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

/* ── Shared tooltip style ──────────────────────────────────────────── */

const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: 12,
    color: 'hsl(var(--popover-foreground))',
};

/* ── Chart type resolver ───────────────────────────────────────────── */

type ChartType = 'line' | 'door_timeline' | 'bar_count' | 'gauge_level' | 'area_duty' | 'line_zone';

export function getChartType(metric: string): ChartType {
    switch (metric) {
        case 'door_status':
            return 'door_timeline';
        case 'people_count':
            return 'bar_count';
        case 'distance':
            return 'gauge_level';
        case 'current':
        case 'power':
            return 'area_duty';
        case 'co2':
        case 'pm2_5':
            return 'line_zone';
        default:
            return 'line';
    }
}

function getChartIcon(chartType: ChartType) {
    switch (chartType) {
        case 'door_timeline': return <DoorOpen className="h-4 w-4" />;
        case 'bar_count': return <Users className="h-4 w-4" />;
        case 'gauge_level': return <Gauge className="h-4 w-4" />;
        case 'area_duty': return <Zap className="h-4 w-4" />;
        default: return <Activity className="h-4 w-4" />;
    }
}

/* ── Stats helper ──────────────────────────────────────────────────── */

function useChartStats(chartData: ChartDataPoint[]) {
    return useMemo(() => {
        if (chartData.length === 0) return null;
        const values = chartData.map((d) => d.avg_value ?? d.value ?? 0);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        return { min, max, avg };
    }, [chartData]);
}

/* ── Main dispatcher ───────────────────────────────────────────────── */

interface DeviceChartProps {
    chartData: ChartDataPoint[];
    metric: string;
    unit?: string;
    period: string;
    t: (key: string) => string;
}

export function DeviceChart({ chartData, metric, unit = '', period, t }: DeviceChartProps) {
    const chartType = getChartType(metric);
    const stats = useChartStats(chartData);
    const icon = getChartIcon(chartType);

    const metricLabel = unit ? `${metric} (${unit})` : metric;

    return (
        <Card className="shadow-elevation-1">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    {icon}
                    {metricLabel} — {period}
                </CardTitle>
                <CardDescription>
                    <span className="font-mono tabular-nums">{chartData.length}</span> {t('data points')}
                    {stats && chartType !== 'door_timeline' && (
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
                    <>
                        {chartType === 'line' && <TimeSeriesLine data={chartData} metric={metric} unit={unit} stats={stats} t={t} />}
                        {chartType === 'line_zone' && <ZonedLine data={chartData} metric={metric} unit={unit} stats={stats} t={t} />}
                        {chartType === 'door_timeline' && <DoorTimeline data={chartData} t={t} />}
                        {chartType === 'bar_count' && <PeopleBar data={chartData} t={t} />}
                        {chartType === 'gauge_level' && <GaugeLevel data={chartData} metric={metric} unit={unit} stats={stats} t={t} />}
                        {chartType === 'area_duty' && <DutyCycleArea data={chartData} metric={metric} unit={unit} stats={stats} t={t} />}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

/* ── 1. Standard line chart (temperature, humidity, pressure, etc.) ── */

function TimeSeriesLine({ data, metric, unit, stats, t }: {
    data: ChartDataPoint[]; metric: string; unit: string;
    stats: { min: number; max: number; avg: number } | null; t: (k: string) => string;
}) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" domain={['auto', 'auto']} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                    formatter={(val: number) => [`${val.toFixed(2)} ${unit}`, metric]} />
                {stats && (
                    <>
                        <ReferenceLine y={stats.min} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5}
                            label={{ value: t('Min'), position: 'insideTopLeft', fontSize: 10, fill: '#ef4444' }} />
                        <ReferenceLine y={stats.avg} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5}
                            label={{ value: t('Avg'), position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }} />
                        <ReferenceLine y={stats.max} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5}
                            label={{ value: t('Max'), position: 'insideBottomLeft', fontSize: 10, fill: '#ef4444' }} />
                    </>
                )}
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
            </LineChart>
        </ResponsiveContainer>
    );
}

/* ── 2. Door timeline (WS301, EM300-MCS binary state) ────────────── */

function DoorTimeline({ data, t }: { data: ChartDataPoint[]; t: (k: string) => string }) {
    const summary = useMemo(() => {
        const total = data.length;
        if (total === 0) return null;
        const openCount = data.filter((d) => (d.value ?? 0) >= 1).length;
        const closedCount = total - openCount;
        const openPct = ((openCount / total) * 100).toFixed(1);
        return { openCount, closedCount, openPct };
    }, [data]);

    return (
        <div className="space-y-3">
            {/* Summary strip */}
            {summary && (
                <div className="flex items-center gap-4 rounded-lg border px-4 py-2.5">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span className="text-xs font-medium">{t('Open')}</span>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">{summary.openPct}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium">{t('Closed')}</span>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">{(100 - parseFloat(summary.openPct)).toFixed(1)}%</span>
                    </div>
                    {/* Visual bar */}
                    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-emerald-500/20">
                        <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${summary.openPct}%` }} />
                        <div className="h-full flex-1 bg-emerald-500" />
                    </div>
                </div>
            )}

            {/* Timeline chart */}
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                        <linearGradient id="doorOpenGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis domain={[0, 1]} ticks={[0, 1]} tickLine={false} axisLine={false}
                        tickFormatter={(v) => (v === 1 ? t('Open') : t('Closed'))}
                        tick={{ fontSize: 10 }} className="fill-muted-foreground" width={50} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                        formatter={(val: number) => [val >= 1 ? t('Open') : t('Closed'), t('Status')]} />
                    <Area type="stepAfter" dataKey="value" stroke="#ef4444" strokeWidth={2}
                        fill="url(#doorOpenGrad)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── 3. People count bar chart (VS121) ───────────────────────────── */

function PeopleBar({ data, t }: { data: ChartDataPoint[]; t: (k: string) => string }) {
    const stats = useMemo(() => {
        const values = data.map((d) => d.value ?? 0);
        const max = Math.max(...values);
        const total = values.reduce((s, v) => s + v, 0);
        const peak = data.find((d) => (d.value ?? 0) === max);
        return { max, total, peakTime: peak?.time ?? '' };
    }, [data]);

    return (
        <div className="space-y-3">
            {/* Summary strip */}
            <div className="flex items-center gap-6 rounded-lg border px-4 py-2.5">
                <div className="text-center">
                    <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{t('Peak')}</p>
                    <p className="font-mono text-lg font-bold tabular-nums">{stats.max}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                    <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{t('Total')}</p>
                    <p className="font-mono text-lg font-bold tabular-nums">{stats.total.toLocaleString()}</p>
                </div>
                {stats.peakTime && (
                    <>
                        <div className="h-8 w-px bg-border" />
                        <div className="text-center">
                            <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{t('Peak Time')}</p>
                            <p className="font-mono text-sm tabular-nums text-muted-foreground">{stats.peakTime}</p>
                        </div>
                    </>
                )}
            </div>

            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                        formatter={(val: number) => [val, t('people')]} />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={24}>
                        {data.map((entry, i) => {
                            const val = entry.value ?? 0;
                            const pct = stats.max > 0 ? val / stats.max : 0;
                            const fill = pct > 0.8 ? '#ef4444' : pct > 0.5 ? '#f59e0b' : '#3b82f6';
                            return <Cell key={i} fill={fill} fillOpacity={0.8} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── 4. Gauge + line for distance/level (EM310-UDL) ──────────────── */

function GaugeLevel({ data, metric, unit, stats, t }: {
    data: ChartDataPoint[]; metric: string; unit: string;
    stats: { min: number; max: number; avg: number } | null; t: (k: string) => string;
}) {
    const current = data.length > 0 ? (data[data.length - 1].value ?? 0) : 0;
    const maxRange = stats ? stats.max * 1.2 : 1000; // 20% headroom
    const fillPct = maxRange > 0 ? Math.min((current / maxRange) * 100, 100) : 0;

    const levelColor = fillPct > 80 ? 'bg-emerald-500' : fillPct > 40 ? 'bg-blue-500' : fillPct > 15 ? 'bg-amber-400' : 'bg-rose-500';
    const levelLabel = fillPct > 80 ? t('Full') : fillPct > 40 ? t('Normal') : fillPct > 15 ? t('Low') : t('Critical');

    return (
        <div className="space-y-4">
            {/* Gauge visual */}
            <div className="flex items-center gap-6 rounded-lg border px-5 py-4">
                {/* Tank visualization */}
                <div className="relative flex h-28 w-14 items-end overflow-hidden rounded-lg border-2 border-border bg-muted/30">
                    <div className={cn('w-full rounded-b-md transition-all duration-700', levelColor)}
                        style={{ height: `${fillPct}%` }} />
                    {/* Level markers */}
                    <div className="absolute inset-x-0 top-[20%] border-t border-dashed border-border/40" />
                    <div className="absolute inset-x-0 top-[50%] border-t border-dashed border-border/40" />
                    <div className="absolute inset-x-0 top-[80%] border-t border-dashed border-border/40" />
                </div>
                <div className="flex-1 space-y-2">
                    <div>
                        <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{t('Current Level')}</p>
                        <p className="font-mono text-2xl font-bold tabular-nums">
                            {current.toFixed(0)}<span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', levelColor)} />
                        <span className="text-xs font-medium">{levelLabel}</span>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{fillPct.toFixed(0)}%</span>
                    </div>
                    {stats && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className="font-mono tabular-nums">{t('Min')}: {stats.min.toFixed(0)} {unit}</span>
                            <span className="font-mono tabular-nums">{t('Avg')}: {stats.avg.toFixed(0)} {unit}</span>
                            <span className="font-mono tabular-nums">{t('Max')}: {stats.max.toFixed(0)} {unit}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Sparkline */}
            <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                        <linearGradient id="levelGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle}
                        formatter={(val: number) => [`${val.toFixed(1)} ${unit}`, metric]} />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2}
                        fill="url(#levelGrad)" dot={false} activeDot={{ r: 3 }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── 5. Duty cycle / area chart (CT101 current, power) ───────────── */

function DutyCycleArea({ data, metric, unit, stats, t }: {
    data: ChartDataPoint[]; metric: string; unit: string;
    stats: { min: number; max: number; avg: number } | null; t: (k: string) => string;
}) {
    const duty = useMemo(() => {
        if (data.length === 0 || !stats) return null;
        // Duty cycle: % of time above 10% of max
        const threshold = stats.max * 0.1;
        const activeCount = data.filter((d) => (d.value ?? 0) > threshold).length;
        const dutyCycle = (activeCount / data.length) * 100;
        const peakVal = stats.max;
        const avgVal = stats.avg;
        return { dutyCycle, peakVal, avgVal };
    }, [data, stats]);

    return (
        <div className="space-y-3">
            {/* Duty cycle strip */}
            {duty && (
                <div className="flex items-center gap-6 rounded-lg border px-4 py-2.5">
                    <div className="text-center">
                        <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{t('Duty Cycle')}</p>
                        <p className="font-mono text-lg font-bold tabular-nums">{duty.dutyCycle.toFixed(1)}%</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="text-center">
                        <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{t('Peak')}</p>
                        <p className="font-mono text-lg font-bold tabular-nums">{duty.peakVal.toFixed(1)} <span className="text-xs font-normal">{unit}</span></p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="text-center">
                        <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{t('Avg')}</p>
                        <p className="font-mono text-lg font-bold tabular-nums">{duty.avgVal.toFixed(1)} <span className="text-xs font-normal">{unit}</span></p>
                    </div>
                    {/* Duty cycle bar */}
                    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted/40">
                        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${duty.dutyCycle}%` }} />
                    </div>
                </div>
            )}

            {/* Area chart */}
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                        <linearGradient id="dutyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                        formatter={(val: number) => [`${val.toFixed(2)} ${unit}`, metric]} />
                    {stats && (
                        <ReferenceLine y={stats.avg} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6}
                            label={{ value: t('Avg'), position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }} />
                    )}
                    <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2}
                        fill="url(#dutyGrad)" dot={false} activeDot={{ r: 3, strokeWidth: 2 }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── 6. Line chart with threshold zones (CO2, PM2.5) ────────────── */

const ZONE_THRESHOLDS: Record<string, { good: number; moderate: number; bad: number }> = {
    co2: { good: 800, moderate: 1200, bad: 2000 },
    pm2_5: { good: 12, moderate: 35, bad: 55 },
};

function ZonedLine({ data, metric, unit, stats, t }: {
    data: ChartDataPoint[]; metric: string; unit: string;
    stats: { min: number; max: number; avg: number } | null; t: (k: string) => string;
}) {
    const thresholds = ZONE_THRESHOLDS[metric];
    const current = data.length > 0 ? (data[data.length - 1].value ?? 0) : 0;

    let statusLabel = t('Good');
    let statusColor = 'text-emerald-500';
    if (thresholds) {
        if (current > thresholds.bad) { statusLabel = t('Poor'); statusColor = 'text-rose-500'; }
        else if (current > thresholds.moderate) { statusLabel = t('Moderate'); statusColor = 'text-amber-500'; }
        else if (current > thresholds.good) { statusLabel = t('Fair'); statusColor = 'text-amber-400'; }
    }

    return (
        <div className="space-y-3">
            {/* Status strip */}
            {thresholds && (
                <div className="flex items-center gap-4 rounded-lg border px-4 py-2.5">
                    <div>
                        <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{t('Current')}</p>
                        <p className="font-mono text-lg font-bold tabular-nums">{current.toFixed(1)} <span className="text-xs font-normal">{unit}</span></p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <span className={cn('text-sm font-semibold', statusColor)}>{statusLabel}</span>
                    {/* Zone legend */}
                    <div className="ml-auto flex gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-sm bg-emerald-500/40" />{t('Good')}</span>
                        <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-sm bg-amber-400/40" />{t('Moderate')}</span>
                        <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-sm bg-rose-500/40" />{t('Poor')}</span>
                    </div>
                </div>
            )}

            {/* Line chart with threshold zones */}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" domain={['auto', 'auto']} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                        formatter={(val: number) => [`${val.toFixed(2)} ${unit}`, metric]} />
                    {/* Threshold reference lines */}
                    {thresholds && (
                        <>
                            <ReferenceLine y={thresholds.good} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5}
                                label={{ value: t('Good'), position: 'insideTopLeft', fontSize: 9, fill: '#22c55e' }} />
                            <ReferenceLine y={thresholds.moderate} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5}
                                label={{ value: t('Moderate'), position: 'insideTopLeft', fontSize: 9, fill: '#f59e0b' }} />
                            <ReferenceLine y={thresholds.bad} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5}
                                label={{ value: t('Poor'), position: 'insideTopLeft', fontSize: 9, fill: '#ef4444' }} />
                        </>
                    )}
                    {stats && (
                        <ReferenceLine y={stats.avg} stroke="#a855f7" strokeDasharray="4 4" strokeOpacity={0.4}
                            label={{ value: t('Avg'), position: 'insideBottomLeft', fontSize: 9, fill: '#a855f7' }} />
                    )}
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
