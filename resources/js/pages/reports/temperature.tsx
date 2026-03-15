import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Site, TemperatureExcursion, TemperatureReport, TemperatureReportZone } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Download, FileText, Thermometer } from 'lucide-react';
import { useState } from 'react';

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Temperature Report')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Temperature Report')}</h1>
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

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-2xl font-bold tabular-nums">{report.summary.total_readings}</p>
                                <p className="text-xs text-muted-foreground">{t('Total Readings')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <div>
                                <p className="text-2xl font-bold tabular-nums">{report.summary.total_excursions}</p>
                                <p className="text-xs text-muted-foreground">{t('Excursions')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">{t('Compliance')}</p>
                                {compliancePct >= 95 ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                )}
                            </div>
                            <p className="text-2xl font-bold tabular-nums">{compliancePct.toFixed(1)}%</p>
                            <Progress value={compliancePct} size="sm" variant={complianceVariant as 'success' | 'warning' | 'destructive'} className="mt-2" />
                        </CardContent>
                    </Card>
                </div>

                {/* Per-zone data */}
                {report.per_zone.map((zone) => (
                    <ZoneSection key={zone.zone} zone={zone} />
                ))}
            </div>
        </AppLayout>
    );
}

function ZoneSection({ zone }: { zone: TemperatureReportZone }) {
    const { t } = useLang();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    {zone.zone}
                </CardTitle>
                <CardDescription>
                    {zone.devices.length} {t('device(s)')}
                </CardDescription>
            </CardHeader>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Device')}</TableHead>
                        <TableHead>{t('Readings')}</TableHead>
                        <TableHead>{t('Min °C')}</TableHead>
                        <TableHead>{t('Avg °C')}</TableHead>
                        <TableHead>{t('Max °C')}</TableHead>
                        <TableHead>{t('Excursions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {zone.devices.map((device) => (
                        <TableRow key={device.name}>
                            <TableCell className="font-medium">{device.name}</TableCell>
                            <TableCell className="tabular-nums">{device.readings_count}</TableCell>
                            <TableCell className="tabular-nums">{device.min_temp.toFixed(1)}</TableCell>
                            <TableCell className="tabular-nums">{device.avg_temp.toFixed(1)}</TableCell>
                            <TableCell className="tabular-nums">{device.max_temp.toFixed(1)}</TableCell>
                            <TableCell>
                                {device.excursions.length === 0 ? (
                                    <Badge variant="success" className="text-xs">{t('None')}</Badge>
                                ) : (
                                    <Badge variant="destructive" className="text-xs">
                                        {device.excursions.length}
                                    </Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
