import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, EnergyReport, Site } from '@/types';
import { Head, router } from '@inertiajs/react';
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
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Energy Report')}</h1>
                        <p className="text-sm text-muted-foreground">{site.name}</p>
                    </div>
                    <Button variant="outline" asChild>
                        <a
                            href={`/sites/${site.id}/reports/energy/download?from=${dateFrom}&to=${dateTo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {t('Export PDF')}
                        </a>
                    </Button>
                    <Button variant="outline" disabled>
                        <Download className="mr-2 h-4 w-4" />
                        {t('Export PDF')}
                    </Button>
                </div>

                {/* Date range */}
                <Card>
                    <CardContent className="flex flex-wrap items-end gap-3 p-4">
                        <div className="space-y-1">
                            <Label className="text-xs">{t('From')}</Label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t('To')}</Label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
                        </div>
                        <Button onClick={applyDates}>{t('Generate')}</Button>
                    </CardContent>
                </Card>

                {/* Summary KPIs */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <Zap className="h-5 w-5 text-amber-500" />
                            <div>
                                <p className="text-2xl font-bold tabular-nums">{s.total_kwh.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">{t('Total kWh')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                            <div>
                                <p className="text-2xl font-bold tabular-nums">${s.total_cost.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">{t('Total Cost (MXN)')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold tabular-nums">${s.avg_daily_cost.toFixed(0)}</p>
                                <p className="text-xs text-muted-foreground">{t('Avg Daily Cost')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div>
                                <p className="text-2xl font-bold tabular-nums">
                                    {s.baseline_comparison_pct !== null ? `${s.baseline_comparison_pct > 0 ? '+' : ''}${s.baseline_comparison_pct.toFixed(1)}%` : '—'}
                                </p>
                                <p className="text-xs text-muted-foreground">{t('vs Baseline')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Daily Consumption Chart */}
                {dailyChartData.length > 0 && (
                    <Card>
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
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis yAxisId="kwh" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                                    <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} label={{ value: 'MXN', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
                                    <Tooltip
                                        formatter={(value: number, name: string) => {
                                            if (name === 'kwh') return [`${value.toFixed(1)} kWh`, t('Energy')];
                                            return [`$${value.toFixed(2)} MXN`, t('Cost')];
                                        }}
                                        contentStyle={{ borderRadius: 8, fontSize: 13 }}
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
                )}

                {/* Per-device breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Per Device')}</CardTitle>
                        <CardDescription>{report.per_device.length} {t('CT101 device(s)')}</CardDescription>
                    </CardHeader>
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
                                    <TableCell className="tabular-nums font-medium">{device.total_kwh.toLocaleString()}</TableCell>
                                    <TableCell className="tabular-nums">{device.avg_daily_kwh.toFixed(1)}</TableCell>
                                    <TableCell className="tabular-nums">{device.peak_current.toFixed(1)}</TableCell>
                                    <TableCell className="tabular-nums text-muted-foreground">{device.readings_count}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                {/* Daily totals */}
                {report.daily_totals.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Daily Consumption')}</CardTitle>
                        </CardHeader>
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
                                        <TableCell>{day.date}</TableCell>
                                        <TableCell className="tabular-nums font-medium">{day.total_kwh.toFixed(1)}</TableCell>
                                        <TableCell className="tabular-nums">${day.cost_mxn.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
