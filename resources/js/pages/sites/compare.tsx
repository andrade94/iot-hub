import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, BarChart3, Minus, Trophy } from 'lucide-react';

interface Ranking {
    site_id: number;
    site_name: string;
    value: number;
}

interface SiteOption {
    id: number;
    name: string;
}

interface Props {
    rankings: Ranking[];
    metric: string;
    days: number;
    sites: SiteOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compare Sites', href: '/sites/compare' },
];

const METRICS = [
    { value: 'compliance', label: 'Compliance %', format: (v: number) => `${v}%`, better: 'high' },
    { value: 'alert_count', label: 'Alert Count', format: (v: number) => String(Math.round(v)), better: 'low' },
    { value: 'response_time', label: 'Avg Response Time', format: (v: number) => `${v} min`, better: 'low' },
    { value: 'device_uptime', label: 'Device Uptime', format: (v: number) => `${v}%`, better: 'high' },
] as const;

export default function SiteComparison({ rankings, metric, days, sites }: Props) {
    const { t } = useLang();
    const metricConfig = METRICS.find((m) => m.value === metric) ?? METRICS[0];

    function changeMetric(m: string) {
        router.get('/sites/compare', { metric: m, days }, { preserveState: true, replace: true });
    }

    function changeDays(d: string) {
        router.get('/sites/compare', { metric, days: d }, { preserveState: true, replace: true });
    }

    const best = rankings[0];
    const worst = rankings[rankings.length - 1];
    const avg = rankings.length > 0 ? rankings.reduce((sum, r) => sum + r.value, 0) / rankings.length : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Compare Sites')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Site Comparison')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {t('Rank and compare your sites by performance metrics')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Select value={metric} onValueChange={changeMetric}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {METRICS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex rounded-md border">
                            {[30, 90, 365].map((d) => (
                                <Button
                                    key={d}
                                    variant={days === d ? 'default' : 'ghost'}
                                    size="sm"
                                    className="rounded-none first:rounded-l-md last:rounded-r-md"
                                    onClick={() => changeDays(String(d))}
                                >
                                    {d}d
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary cards */}
                {rankings.length >= 2 && (
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Best Performing')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-amber-500" />
                                    <span className="font-semibold">{best?.site_name}</span>
                                </div>
                                <p className="mt-1 text-2xl font-bold">{metricConfig.format(best?.value ?? 0)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Organization Average')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <Minus className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold">{t('All Sites')}</span>
                                </div>
                                <p className="mt-1 text-2xl font-bold">{metricConfig.format(Math.round(avg * 10) / 10)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Needs Attention')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <ArrowDown className="h-4 w-4 text-destructive" />
                                    <span className="font-semibold">{worst?.site_name}</span>
                                </div>
                                <p className="mt-1 text-2xl font-bold">{metricConfig.format(worst?.value ?? 0)}</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Ranking table */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60px]">{t('Rank')}</TableHead>
                                <TableHead>{t('Site')}</TableHead>
                                <TableHead className="text-right">{metricConfig.label}</TableHead>
                                <TableHead className="w-[100px] text-right">{t('vs Avg')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rankings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        <BarChart3 className="mx-auto mb-2 h-8 w-8" />
                                        {t('Site comparison requires at least 2 sites.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rankings.map((r, i) => {
                                    const diff = avg > 0 ? ((r.value - avg) / avg) * 100 : 0;
                                    const isGood = metricConfig.better === 'high' ? diff > 0 : diff < 0;

                                    return (
                                        <TableRow
                                            key={r.site_id}
                                            className="cursor-pointer"
                                            onClick={() => router.get(`/sites/${r.site_id}`)}
                                        >
                                            <TableCell>
                                                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                                    i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    i === rankings.length - 1 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-muted text-muted-foreground'
                                                }`}>
                                                    {i + 1}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium">{r.site_name}</TableCell>
                                            <TableCell className="text-right font-mono">{metricConfig.format(r.value)}</TableCell>
                                            <TableCell className="text-right">
                                                {Math.abs(diff) > 0.5 && (
                                                    <Badge variant={isGood ? 'success' : 'destructive'} className="gap-1">
                                                        {isGood ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                                        {Math.abs(Math.round(diff))}%
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AppLayout>
    );
}
