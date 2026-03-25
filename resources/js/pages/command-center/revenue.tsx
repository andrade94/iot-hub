import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { formatMXN } from '@/utils/formatters';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface Props {
    mrrBySegment: { segment: string; org_count: number; mrr: number }[];
    mrrByOrg: { id: number; name: string; segment: string; mrr: number }[];
    invoiceHistory: { month: string; total: number; count: number }[];
    kpis: { total_mrr: number; active_subscriptions: number; collection_rate: number; overdue_invoices: number };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Command Center', href: '/command-center' },
    { title: 'Revenue', href: '#' },
];

const segmentColors: Record<string, string> = {
    cold_chain: '#3b82f6',
    retail: '#f59e0b',
    industrial: '#8b5cf6',
    commercial: '#10b981',
    foodservice: '#ef4444',
};

export default function CommandCenterRevenue({ mrrBySegment, mrrByOrg, invoiceHistory, kpis }: Props) {
    const { t } = useLang();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Revenue Dashboard')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Revenue Dashboard')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {formatMXN(kpis.total_mrr)}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Platform-wide revenue metrics and subscription tracking')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/command-center">{t('Overview')}</Link>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/command-center/alerts">{t('Alert Queue')}</Link>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/command-center/devices">{t('Device Health')}</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── KEY METRICS section divider ─────────────────── */}
                <FadeIn delay={100} duration={400}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Key Metrics')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <FadeIn delay={150} duration={400}>
                        <KPICard
                            icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
                            label={t('Total MRR')}
                            value={formatMXN(kpis.total_mrr)}
                            accent="emerald"
                        />
                    </FadeIn>
                    <FadeIn delay={200} duration={400}>
                        <KPICard
                            icon={<CreditCard className="h-4 w-4" />}
                            label={t('Active Subscriptions')}
                            value={String(kpis.active_subscriptions)}
                        />
                    </FadeIn>
                    <FadeIn delay={250} duration={400}>
                        <KPICard
                            icon={<TrendingUp className="h-4 w-4" />}
                            label={t('Collection Rate')}
                            value={`${kpis.collection_rate}%`}
                            accent={collectionRateAccent(kpis.collection_rate)}
                        />
                    </FadeIn>
                    <FadeIn delay={300} duration={400}>
                        <KPICard
                            icon={<AlertTriangle className="h-4 w-4" />}
                            label={t('Overdue Invoices')}
                            value={String(kpis.overdue_invoices)}
                            accent={kpis.overdue_invoices > 0 ? 'red' : undefined}
                        />
                    </FadeIn>
                </div>

                {/* Charts row */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* ── MRR BY SEGMENT section divider + chart ──── */}
                    <FadeIn delay={350} duration={400}>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('MRR by Segment')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {mrrBySegment.length} {t('segments')}
                                </span>
                            </div>
                            <Card className="shadow-elevation-1">
                                <CardContent className="pt-6">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={mrrBySegment} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                            <XAxis dataKey="segment" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toLocaleString()}`} className="fill-muted-foreground" />
                                            <Tooltip
                                                formatter={(value: number) => [formatMXN(value), t('MRR')]}
                                                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                                            />
                                            <Bar dataKey="mrr" radius={[4, 4, 0, 0]}>
                                                {mrrBySegment.map((entry) => (
                                                    <Cell
                                                        key={entry.segment}
                                                        fill={segmentColors[entry.segment] ?? '#6b7280'}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </FadeIn>

                    {/* ── REVENUE TREND section divider + chart ───── */}
                    <FadeIn delay={400} duration={400}>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Revenue Trend')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {t('12 months')}
                                </span>
                            </div>
                            <Card className="shadow-elevation-1">
                                <CardContent className="pt-6">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={invoiceHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                            <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toLocaleString()}`} className="fill-muted-foreground" />
                                            <Tooltip
                                                formatter={(value: number) => [formatMXN(value), t('Revenue')]}
                                                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="total"
                                                stroke="#3b82f6"
                                                fill="url(#revenueGradient)"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </FadeIn>
                </div>

                {/* ── TOP ORGANIZATIONS section divider + table ──── */}
                <FadeIn delay={450} duration={400}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Top Organizations')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            {mrrByOrg.length}
                        </span>
                    </div>
                </FadeIn>

                <FadeIn delay={500} duration={400}>
                    <Card className="shadow-elevation-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Name')}</TableHead>
                                    <TableHead>{t('Segment')}</TableHead>
                                    <TableHead className="text-right">{t('MRR')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mrrByOrg.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-12 text-center">
                                            <DollarSign className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {t('No subscription data available')}
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    mrrByOrg.map((org) => (
                                        <TableRow
                                            key={org.id}
                                            className="cursor-pointer transition-colors hover:bg-accent/50"
                                            onClick={() => router.get(`/command-center/${org.id}`)}
                                        >
                                            <TableCell className="font-medium">{org.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{org.segment}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium tabular-nums">
                                                {formatMXN(org.mrr)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
    const accentColor =
        accent === 'emerald'
            ? 'text-emerald-600 dark:text-emerald-400'
            : accent === 'red'
              ? 'text-red-600 dark:text-red-400'
              : accent === 'amber'
                ? 'text-amber-600 dark:text-amber-400'
                : '';

    return (
        <Card className="shadow-elevation-1">
            <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                    {icon}
                </div>
                <div>
                    <p className={`font-mono text-2xl font-bold tabular-nums ${accentColor}`}>
                        {value}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function collectionRateAccent(rate: number): string | undefined {
    if (rate > 80) return 'emerald';
    if (rate > 50) return 'amber';
    return 'red';
}
