import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, EnergyReport, Site } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { DollarSign, Download, TrendingUp, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface Props {
    site: Site;
    report: EnergyReport;
    from: string;
    to: string;
}

export default function EnergyReportPage({ site, report, from, to }: Props) {
    const { t } = useLang();
    const [dateFrom, setDateFrom] = useState(from);
    const [dateTo, setDateTo] = useState(to);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Energy Report', href: '#' },
    ];

    function applyDates() {
        router.get(`/sites/${site.id}/reports/energy`, { from: dateFrom, to: dateTo }, { preserveState: true });
    }

    const s = report.summary;

    const dailyChartData = useMemo(() => {
        return report.daily_totals.map((day) => ({
            date: day.date,
            kwh: Math.round(day.total_kwh * 10) / 10,
            cost: Math.round(day.cost_mxn * 100) / 100,
        }));
    }, [report.daily_totals]);

    const avgDailyKwh = useMemo(() => {
        if (dailyChartData.length === 0) return null;
        const total = dailyChartData.reduce((sum, d) => sum + d.kwh, 0);
        return Math.round((total / dailyChartData.length) * 10) / 10;
    }, [dailyChartData]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Energy Report')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Energy Report')}
                                </p>
                                <h1 className="mt-1.5 font-display text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {site.name}
                                </h1>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={`/sites/${site.id}/reports/energy/download?from=${dateFrom}&to=${dateTo}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('Export PDF')}
                                </a>
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Date Range ───────────────────────────────────── */}
                <FadeIn delay={60} duration={500}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Date Range')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card className="shadow-elevation-1">
                            <CardContent className="flex flex-wrap items-end gap-3 p-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">{t('From')}</Label>
                                    <DatePicker
                                        date={dateFrom ? new Date(dateFrom + 'T00:00:00') : undefined}
                                        onDateChange={(d) => setDateFrom(d ? format(d, 'yyyy-MM-dd') : '')}
                                        placeholder={t('Select date')}
                                        className="w-[160px]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{t('To')}</Label>
                                    <DatePicker
                                        date={dateTo ? new Date(dateTo + 'T00:00:00') : undefined}
                                        onDateChange={(d) => setDateTo(d ? format(d, 'yyyy-MM-dd') : '')}
                                        placeholder={t('Select date')}
                                        className="w-[160px]"
                                    />
                                </div>
                                <Button onClick={applyDates}>{t('Generate')}</Button>
                            </CardContent>
                        </Card>
                    </div>
                </FadeIn>

                {/* ── Summary KPIs ────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {([
                        {
                            icon: <Zap className="h-5 w-5 text-amber-500" />,
                            value: s.total_kwh.toLocaleString(),
                            unit: 'kWh',
                            label: t('Total kWh'),
                        },
                        {
                            icon: <DollarSign className="h-5 w-5 text-emerald-500" />,
                            value: `$${s.total_cost.toLocaleString()}`,
                            label: t('Total Cost (MXN)'),
                        },
                        {
                            icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
                            value: `$${s.avg_daily_cost.toFixed(0)}`,
                            label: t('Avg Daily Cost'),
                        },
                        {
                            icon: null,
                            value: s.baseline_comparison_pct !== null
                                ? `${s.baseline_comparison_pct > 0 ? '+' : ''}${s.baseline_comparison_pct.toFixed(1)}%`
                                : '—',
                            label: t('vs Baseline'),
                        },
                    ]).map((kpi, i) => (
                        <FadeIn key={kpi.label} delay={120 + i * 60} duration={400}>
                            <Card className="shadow-elevation-1">
                                <CardContent className="flex items-center gap-3 p-4">
                                    {kpi.icon && kpi.icon}
                                    <div>
                                        <p className="font-mono text-2xl font-bold tabular-nums">
                                            {kpi.value}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </FadeIn>
                    ))}
                </div>

                {/* ── Daily Consumption Chart ──────────────────────── */}
                {dailyChartData.length > 0 && (
                    <FadeIn delay={200} duration={500}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Daily Energy Consumption')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <Card className="shadow-elevation-1">
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Daily Energy Consumption')}</CardTitle>
                                    <CardDescription>{t('kWh and cost over the selected period')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={dailyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="kwhGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                                            <YAxis yAxisId="kwh" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={(v) => `${v}`} label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                                            <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={(v) => `$${v}`} label={{ value: 'MXN', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
                                            <Tooltip
                                                formatter={(value: number, name: string) => {
                                                    if (name === 'kwh') return [`${value.toFixed(1)} kWh`, t('Energy')];
                                                    return [`$${value.toFixed(2)} MXN`, t('Cost')];
                                                }}
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--popover))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: '8px',
                                                    fontSize: 12,
                                                    color: 'hsl(var(--popover-foreground))',
                                                }}
                                            />
                                            {avgDailyKwh !== null && (
                                                <ReferenceLine
                                                    yAxisId="kwh"
                                                    y={avgDailyKwh}
                                                    stroke="#8b5cf6"
                                                    strokeDasharray="4 3"
                                                    label={{ value: `${t('Avg')}: ${avgDailyKwh} kWh`, position: 'insideTopRight', fontSize: 11, fill: '#8b5cf6' }}
                                                />
                                            )}
                                            <Area
                                                yAxisId="kwh"
                                                type="monotone"
                                                dataKey="kwh"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                fill="url(#kwhGradient)"
                                            />
                                            <Line
                                                yAxisId="cost"
                                                type="monotone"
                                                dataKey="cost"
                                                stroke="#f59e0b"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </FadeIn>
                )}

                {/* ── Per Device Breakdown ─────────────────────────── */}
                <FadeIn delay={260} duration={500}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Per Device')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {report.per_device.length} {t('CT101 device(s)')}
                            </span>
                        </div>
                        <Card className="shadow-elevation-1">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Device')}</TableHead>
                                        <TableHead>{t('Zone')}</TableHead>
                                        <TableHead>{t('Total kWh')}</TableHead>
                                        <TableHead>{t('Avg Daily kWh')}</TableHead>
                                        <TableHead>{t('Peak Current (A)')}</TableHead>
                                        <TableHead>{t('Readings')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.per_device.map((device) => (
                                        <TableRow key={device.name}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{device.name}</span>
                                                    <Badge variant="outline" className="font-mono text-xs">{device.model}</Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>{device.zone ?? '—'}</TableCell>
                                            <TableCell className="font-mono font-medium tabular-nums">
                                                {device.total_kwh.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="font-mono tabular-nums">
                                                {device.avg_daily_kwh.toFixed(1)}
                                            </TableCell>
                                            <TableCell className="font-mono tabular-nums">
                                                {device.peak_current.toFixed(1)}
                                            </TableCell>
                                            <TableCell className="font-mono tabular-nums text-muted-foreground">
                                                {device.readings_count}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                </FadeIn>

                {/* ── Daily Consumption Table ──────────────────────── */}
                {report.daily_totals.length > 0 && (
                    <FadeIn delay={320} duration={500}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Daily Consumption')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {report.daily_totals.length} {t('days')}
                                </span>
                            </div>
                            <Card className="shadow-elevation-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Date')}</TableHead>
                                            <TableHead>{t('kWh')}</TableHead>
                                            <TableHead>{t('Cost (MXN)')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {report.daily_totals.map((day) => (
                                            <TableRow key={day.date}>
                                                <TableCell className="font-mono tabular-nums">
                                                    {day.date}
                                                </TableCell>
                                                <TableCell className="font-mono font-medium tabular-nums">
                                                    {day.total_kwh.toFixed(1)}
                                                </TableCell>
                                                <TableCell className="font-mono tabular-nums">
                                                    ${day.cost_mxn.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </FadeIn>
                )}
            </div>
        </AppLayout>
    );
}

export function EnergyReportSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <div className="flex items-start justify-between">
                    <div>
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="mt-3 h-8 w-40" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                </div>
            </div>
            {/* Date Range */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-20" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <div className="rounded-xl border p-4">
                    <div className="flex gap-3">
                        <Skeleton className="h-9 w-[160px]" />
                        <Skeleton className="h-9 w-[160px]" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                </div>
            </div>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-5 w-5" />
                            <div>
                                <Skeleton className="h-7 w-16" />
                                <Skeleton className="mt-1 h-3 w-20" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Chart placeholder */}
            <div className="rounded-xl border p-6">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="mt-4 h-[300px] w-full rounded-lg" />
            </div>
        </div>
    );
}
