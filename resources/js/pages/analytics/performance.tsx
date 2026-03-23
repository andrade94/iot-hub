import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Activity, ArrowDown, ArrowUp, Clock, Cpu, ShieldCheck, TrendingUp } from 'lucide-react';

interface Summary {
    total_alerts: number;
    resolved_pct: number;
    avg_response_minutes: number;
    device_uptime_pct: number;
    total_devices: number;
    online_devices: number;
}

interface SiteBreakdown {
    site_id: number;
    site_name: string;
    alert_count: number;
    compliance_pct: number;
    device_uptime_pct: number;
}

interface Props {
    summary: Summary;
    trend: Record<string, number>;
    siteBreakdown: SiteBreakdown[];
    days: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Performance', href: '/analytics/performance' },
];

export default function PerformanceDashboard({ summary, trend, siteBreakdown, days }: Props) {
    const { t } = useLang();

    function changeDays(d: number) {
        router.get('/analytics/performance', { days: d }, { preserveState: true, replace: true });
    }

    const responseTarget = 15; // minutes
    const responseOnTarget = summary.avg_response_minutes <= responseTarget;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Performance')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Performance & SLA')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {t('Key performance indicators for your organization')}
                        </p>
                    </div>
                    <div className="flex rounded-md border">
                        {[30, 90, 365].map((d) => (
                            <Button
                                key={d}
                                variant={days === d ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-none first:rounded-l-md last:rounded-r-md"
                                onClick={() => changeDays(d)}
                            >
                                {d === 365 ? '1y' : `${d}d`}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        title={t('Avg Response Time')}
                        value={`${summary.avg_response_minutes} min`}
                        icon={<Clock className="h-4 w-4" />}
                        target={`Target: <${responseTarget} min`}
                        status={responseOnTarget ? 'success' : 'warning'}
                    />
                    <KpiCard
                        title={t('Alerts Resolved')}
                        value={`${summary.resolved_pct}%`}
                        icon={<ShieldCheck className="h-4 w-4" />}
                        target={`${summary.total_alerts} total alerts`}
                        status={summary.resolved_pct >= 90 ? 'success' : summary.resolved_pct >= 70 ? 'warning' : 'danger'}
                    />
                    <KpiCard
                        title={t('Device Uptime')}
                        value={`${summary.device_uptime_pct}%`}
                        icon={<Cpu className="h-4 w-4" />}
                        target={`${summary.online_devices}/${summary.total_devices} online`}
                        status={summary.device_uptime_pct >= 95 ? 'success' : summary.device_uptime_pct >= 80 ? 'warning' : 'danger'}
                    />
                    <KpiCard
                        title={t('Alert Trend')}
                        value={String(summary.total_alerts)}
                        icon={<Activity className="h-4 w-4" />}
                        target={`Last ${days} days`}
                        status="neutral"
                    />
                </div>

                {/* Alert Trend mini-chart (simple bar representation) */}
                {Object.keys(trend).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">{t('Daily Alert Volume')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex h-24 items-end gap-px">
                                {Object.entries(trend).slice(-30).map(([date, count]) => {
                                    const max = Math.max(...Object.values(trend));
                                    const height = max > 0 ? (count / max) * 100 : 0;
                                    return (
                                        <div
                                            key={date}
                                            className="bg-primary/60 hover:bg-primary flex-1 rounded-t transition-colors"
                                            style={{ height: `${Math.max(height, 2)}%` }}
                                            title={`${date}: ${count} alerts`}
                                        />
                                    );
                                })}
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                                <span>{Object.keys(trend).slice(-30)[0]}</span>
                                <span>{Object.keys(trend).slice(-1)[0]}</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Site Breakdown Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">{t('Site Breakdown')}</CardTitle>
                    </CardHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Site')}</TableHead>
                                <TableHead className="text-right">{t('Alerts')}</TableHead>
                                <TableHead className="text-right">{t('Compliance')}</TableHead>
                                <TableHead className="text-right">{t('Device Uptime')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {siteBreakdown.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        {t('No site data available yet.')}
                                    </TableCell>
                                </TableRow>
                            ) : siteBreakdown.map((site) => (
                                <TableRow
                                    key={site.site_id}
                                    className="cursor-pointer"
                                    onClick={() => router.get(`/sites/${site.site_id}`)}
                                >
                                    <TableCell className="font-medium">{site.site_name}</TableCell>
                                    <TableCell className="text-right font-mono">{site.alert_count}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={site.compliance_pct >= 90 ? 'success' : site.compliance_pct >= 70 ? 'warning' : 'destructive'}>
                                            {site.compliance_pct}%
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={site.device_uptime_pct >= 95 ? 'success' : site.device_uptime_pct >= 80 ? 'warning' : 'destructive'}>
                                            {site.device_uptime_pct}%
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AppLayout>
    );
}

export function PerformanceSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="flex items-center justify-between">
                <div><Skeleton className="h-7 w-48" /><Skeleton className="mt-2 h-4 w-72" /></div>
                <Skeleton className="h-9 w-[120px]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-28" /><Skeleton className="mt-3 h-8 w-20" /><Skeleton className="mt-1 h-3 w-32" /></CardContent></Card>
                ))}
            </div>
            <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            <Card><CardContent className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
        </div>
    );
}

function KpiCard({ title, value, icon, target, status }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    target: string;
    status: 'success' | 'warning' | 'danger' | 'neutral';
}) {
    const colors = {
        success: 'text-emerald-600 dark:text-emerald-400',
        warning: 'text-amber-600 dark:text-amber-400',
        danger: 'text-red-600 dark:text-red-400',
        neutral: 'text-foreground',
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <p className={`text-2xl font-bold ${colors[status]}`}>{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{target}</p>
            </CardContent>
        </Card>
    );
}
