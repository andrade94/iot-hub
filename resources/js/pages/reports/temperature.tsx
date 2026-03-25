import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Site, TemperatureReport, TemperatureReportZone } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Download, FileText, Thermometer } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
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

interface Props {
    site: Site;
    report: TemperatureReport;
    from: string;
    to: string;
}

export default function TemperatureReportPage({ site, report, from, to }: Props) {
    const { t } = useLang();
    const [dateFrom, setDateFrom] = useState(from);
    const [dateTo, setDateTo] = useState(to);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Temperature Report', href: '#' },
    ];

    function applyDates() {
        router.get(`/sites/${site.id}/reports/temperature`, { from: dateFrom, to: dateTo }, { preserveState: true });
    }

    const compliancePct = report.summary.compliance_pct;
    const complianceVariant = compliancePct >= 95 ? 'success' : compliancePct >= 80 ? 'warning' : 'destructive';

    const zoneComplianceData = useMemo(() => {
        return report.per_zone.map((zone) => {
            const totalReadings = zone.devices.reduce((sum, d) => sum + d.readings_count, 0);
            const totalExcursions = zone.devices.reduce((sum, d) => sum + d.excursions.length, 0);
            const pct = totalReadings > 0 ? ((totalReadings - totalExcursions) / totalReadings) * 100 : 100;
            return { zone: zone.zone, compliance_pct: Math.round(pct * 10) / 10 };
        });
    }, [report.per_zone]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Temperature Report')} \u2014 ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Temperature Report')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {site.name}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('COFEPRIS-compliant temperature monitoring')}
                                </p>
                            </div>
                            <Button variant="outline" asChild className="shrink-0">
                                <a
                                    href={`/sites/${site.id}/reports/temperature/download?from=${dateFrom}&to=${dateTo}`}
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
                <FadeIn delay={75} duration={400}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Date Range')}
                            </p>
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

                {/* ── Summary KPIs ─────────────────────────────────── */}
                <FadeIn delay={150} duration={500}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Summary')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Card className="shadow-elevation-1">
                                <CardContent className="flex items-center gap-3 p-4">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-mono text-2xl font-bold tabular-nums">{report.summary.total_readings.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">{t('Total Readings')}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-elevation-1">
                                <CardContent className="flex items-center gap-3 p-4">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    <div>
                                        <p className="font-mono text-2xl font-bold tabular-nums">{report.summary.total_excursions.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">{t('Excursions')}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-elevation-1">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">{t('Compliance')}</p>
                                        {compliancePct >= 95 ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        )}
                                    </div>
                                    <p className="font-mono text-2xl font-bold tabular-nums">{compliancePct.toFixed(1)}%</p>
                                    <Progress value={compliancePct} size="sm" variant={complianceVariant as 'success' | 'warning' | 'destructive'} className="mt-2" />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Compliance by Zone Chart ─────────────────────── */}
                {zoneComplianceData.length > 0 && (
                    <FadeIn delay={225} duration={500}>
                        <div>
                            <div className="mb-2 flex items-center gap-3">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Compliance by Zone')}
                                </p>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <Card className="shadow-elevation-1">
                                <CardContent className="p-6">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={zoneComplianceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                            <YAxis type="category" dataKey="zone" width={120} tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                formatter={(value: number) => [`${value.toFixed(1)}%`, t('Compliance')]}
                                                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                                            />
                                            <ReferenceLine x={95} stroke="#10b981" strokeDasharray="3 3" label={{ value: '95%', position: 'top', fontSize: 11 }} />
                                            <ReferenceLine x={80} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '80%', position: 'top', fontSize: 11 }} />
                                            <Bar dataKey="compliance_pct" radius={[0, 4, 4, 0]} maxBarSize={32}>
                                                {zoneComplianceData.map((entry, index) => {
                                                    let fill = '#ef4444';
                                                    if (entry.compliance_pct >= 95) {
                                                        fill = '#10b981';
                                                    } else if (entry.compliance_pct >= 80) {
                                                        fill = '#f59e0b';
                                                    }
                                                    return <Cell key={index} fill={fill} />;
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </FadeIn>
                )}

                {/* ── Per-Zone Data ────────────────────────────────── */}
                {report.per_zone.map((zone, idx) => (
                    <FadeIn key={zone.zone} delay={300 + idx * 75} duration={500}>
                        <ZoneSection zone={zone} />
                    </FadeIn>
                ))}
            </div>
        </AppLayout>
    );
}

interface ZoneChartPoint {
    time: string;
    avg_temp: number;
    min_temp?: number;
    max_temp?: number;
}

export function TemperatureReportSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <div className="flex items-start justify-between">
                    <div>
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="mt-3 h-8 w-44" />
                        <Skeleton className="mt-2 h-4 w-56" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                </div>
            </div>
            {/* Date Range */}
            <div>
                <div className="mb-2 flex items-center gap-3">
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
            {/* Summary KPIs */}
            <div>
                <div className="mb-2 flex items-center gap-3">
                    <Skeleton className="h-3 w-16" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-xl border p-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-5 w-5" />
                                <div>
                                    <Skeleton className="h-7 w-16" />
                                    <Skeleton className="mt-1 h-3 w-24" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Chart placeholder */}
            <div className="rounded-xl border p-6">
                <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
        </div>
    );
}

function ZoneSection({ zone }: { zone: TemperatureReportZone & { chartData?: ZoneChartPoint[] } }) {
    const { t } = useLang();
    const chartData = zone.chartData;

    return (
        <div>
            <div className="mb-2 flex items-center gap-3">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                    {zone.zone}
                </p>
                <div className="h-px flex-1 bg-border" />
            </div>
            <Card className="shadow-elevation-1">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4" />
                        {zone.zone}
                    </CardTitle>
                    <CardDescription>
                        <span className="font-mono tabular-nums">{zone.devices.length}</span> {t('device(s)')}
                    </CardDescription>
                </CardHeader>

                {chartData && chartData.length > 0 && (
                    <CardContent className="pb-2">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{t('Temperature Trend')}</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}\u00B0`} />
                                <Tooltip
                                    formatter={(value: number, name: string) => {
                                        const labels: Record<string, string> = {
                                            avg_temp: t('Avg'),
                                            min_temp: t('Min'),
                                            max_temp: t('Max'),
                                        };
                                        return [`${value.toFixed(1)}\u00B0C`, labels[name] ?? name];
                                    }}
                                    contentStyle={{ borderRadius: 8, fontSize: 13 }}
                                />
                                <Line type="monotone" dataKey="avg_temp" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="min_temp" stroke="#10b981" strokeWidth={1} strokeDasharray="4 2" dot={false} />
                                <Line type="monotone" dataKey="max_temp" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                )}

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Device')}</TableHead>
                            <TableHead>{t('Readings')}</TableHead>
                            <TableHead>{t('Min \u00B0C')}</TableHead>
                            <TableHead>{t('Avg \u00B0C')}</TableHead>
                            <TableHead>{t('Max \u00B0C')}</TableHead>
                            <TableHead>{t('Excursions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {zone.devices.map((device) => (
                            <TableRow key={device.name}>
                                <TableCell className="font-medium">{device.name}</TableCell>
                                <TableCell className="font-mono tabular-nums">{device.readings_count.toLocaleString()}</TableCell>
                                <TableCell className="font-mono tabular-nums">{device.min_temp.toFixed(1)}</TableCell>
                                <TableCell className="font-mono tabular-nums">{device.avg_temp.toFixed(1)}</TableCell>
                                <TableCell className="font-mono tabular-nums">{device.max_temp.toFixed(1)}</TableCell>
                                <TableCell>
                                    {device.excursions.length === 0 ? (
                                        <Badge variant="success" className="text-xs">{t('None')}</Badge>
                                    ) : (
                                        <Badge variant="destructive" className="text-xs">
                                            <span className="font-mono tabular-nums">{device.excursions.length}</span>
                                        </Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
