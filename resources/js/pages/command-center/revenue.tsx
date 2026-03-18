import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
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
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Revenue Dashboard')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('Platform-wide revenue metrics and subscription tracking')}
                    </p>
                </div>

                {/* Quick nav */}
                <div className="flex gap-2">
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

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KPICard
                        icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
                        label={t('Total MRR')}
                        value={formatMXN(kpis.total_mrr)}
                        accent="emerald"
                    />
                    <KPICard
                        icon={<CreditCard className="h-4 w-4" />}
                        label={t('Active Subscriptions')}
                        value={String(kpis.active_subscriptions)}
                    />
                    <KPICard
                        icon={<TrendingUp className="h-4 w-4" />}
                        label={t('Collection Rate')}
                        value={`${kpis.collection_rate}%`}
                        accent={collectionRateAccent(kpis.collection_rate)}
                    />
                    <KPICard
                        icon={<AlertTriangle className="h-4 w-4" />}
                        label={t('Overdue Invoices')}
                        value={String(kpis.overdue_invoices)}
                        accent={kpis.overdue_invoices > 0 ? 'red' : undefined}
                    />
                </div>

                {/* Charts row */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* MRR by Segment */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('MRR by Segment')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={mrrBySegment} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="segment" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
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

                    {/* Revenue Trend */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Revenue Trend (12 months)')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={invoiceHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
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

                {/* Top Organizations table */}
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="text-base">{t('Top Organizations by MRR')}</CardTitle>
                    </CardHeader>
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
                                        className="cursor-pointer"
                                        onClick={() => router.get(`/command-center/${org.id}`)}
                                    >
                                        <TableCell className="font-medium">{org.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{org.segment}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">
                                            {formatMXN(org.mrr)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AppLayout>
    );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                {icon}
                <div>
                    <p className={`text-2xl font-bold tabular-nums ${accent ? `text-${accent}-600 dark:text-${accent}-400` : ''}`}>
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

function formatMXN(n: number): string {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MXN';
}
