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
import { useState } from 'react';

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
