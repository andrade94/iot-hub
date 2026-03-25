import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { FadeIn } from '@/components/ui/fade-in';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, BarChart3, Download, Minus, Trophy } from 'lucide-react';
import { useMemo } from 'react';

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

    const columns = useMemo<ColumnDef<Ranking>[]>(
        () => [
            {
                id: 'rank',
                header: t('Rank'),
                cell: ({ row }) => {
                    const i = rankings.indexOf(row.original);
                    return (
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums ${
                            i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            i === rankings.length - 1 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-muted text-muted-foreground'
                        }`}>
                            {i + 1}
                        </span>
                    );
                },
                meta: { className: 'w-[60px]' },
            },
            {
                accessorKey: 'site_name',
                header: t('Site'),
                cell: ({ row }) => <span className="font-medium">{row.original.site_name}</span>,
            },
            {
                accessorKey: 'value',
                header: metricConfig.label,
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums">{metricConfig.format(row.original.value)}</span>
                ),
                meta: { className: 'text-right' },
            },
            {
                id: 'vs_avg',
                header: t('vs Avg'),
                cell: ({ row }) => {
                    const diff = avg > 0 ? ((row.original.value - avg) / avg) * 100 : 0;
                    const isGood = metricConfig.better === 'high' ? diff > 0 : diff < 0;
                    if (Math.abs(diff) <= 0.5) return null;
                    return (
                        <Badge variant={isGood ? 'success' : 'destructive'} className="gap-1 font-mono tabular-nums">
                            {isGood ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {Math.abs(Math.round(diff))}%
                        </Badge>
                    );
                },
                meta: { className: 'w-[100px] text-right' },
            },
        ],
        [t, rankings, avg, metricConfig],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Compare Sites')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header ------------------------------------------------ */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Site Comparison')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Compare Sites')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Rank and compare your sites by performance metrics')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
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
                                <ButtonGroup>
                                    {[30, 90, 365].map((d) => (
                                        <Button
                                            key={d}
                                            variant={days === d ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => changeDays(String(d))}
                                        >
                                            {d === 365 ? '1y' : `${d}d`}
                                        </Button>
                                    ))}
                                </ButtonGroup>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`/sites/compare/export?metric=${metric}&days=${days}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Download className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Export PDF')}
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* -- Summary Cards ----------------------------------------- */}
                {rankings.length >= 2 && (
                    <>
                        <FadeIn delay={75}>
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Summary')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                        </FadeIn>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <FadeIn delay={150}>
                                <Card className="shadow-elevation-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            {t('Best Performing')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2">
                                            <Trophy className="h-4 w-4 text-amber-500" />
                                            <span className="font-semibold">{best?.site_name}</span>
                                        </div>
                                        <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                                            {metricConfig.format(best?.value ?? 0)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                            <FadeIn delay={225}>
                                <Card className="shadow-elevation-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            {t('Organization Average')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2">
                                            <Minus className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold">{t('All Sites')}</span>
                                        </div>
                                        <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                                            {metricConfig.format(Math.round(avg * 10) / 10)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                            <FadeIn delay={300}>
                                <Card className="shadow-elevation-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            {t('Needs Attention')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2">
                                            <ArrowDown className="h-4 w-4 text-destructive" />
                                            <span className="font-semibold">{worst?.site_name}</span>
                                        </div>
                                        <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                                            {metricConfig.format(worst?.value ?? 0)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        </div>
                    </>
                )}

                {/* -- Ranking Table ----------------------------------------- */}
                <FadeIn delay={375}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Rankings')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                        {rankings.length > 0 && (
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {rankings.length} {t('sites')}
                            </span>
                        )}
                    </div>
                </FadeIn>
                <FadeIn delay={450}>
                    <Card className="shadow-elevation-1">
                        <DataTable
                            columns={columns}
                            data={rankings}
                            bordered={false}
                            getRowId={(row) => String(row.site_id)}
                            onRowClick={(r) => router.get(`/sites/${r.site_id}`)}
                            emptyState={
                                <div className="py-8 text-center text-muted-foreground">
                                    <BarChart3 className="mx-auto mb-2 h-8 w-8" />
                                    {t('Site comparison requires at least 2 sites.')}
                                </div>
                            }
                        />
                    </Card>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

export function SiteComparisonSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
                    <div>
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="mt-3 h-9 w-48" />
                        <Skeleton className="mt-2 h-4 w-64" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-[180px]" />
                        <Skeleton className="h-9 w-[120px]" />
                    </div>
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="shadow-elevation-1">
                        <CardContent className="p-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="mt-3 h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card className="shadow-elevation-1">
                <div className="space-y-3 p-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            </Card>
        </div>
    );
}
