import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, Clock, Cpu, Download, ShieldCheck } from 'lucide-react';

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
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Performance Analytics')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Performance & SLA')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Key performance indicators for your organization')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <ButtonGroup>
                                    {[30, 90, 365].map((d) => (
                                        <Button
                                            key={d}
                                            variant={days === d ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => changeDays(d)}
                                        >
                                            {d === 365 ? '1y' : `${d}d`}
                                        </Button>
                                    ))}
                                </ButtonGroup>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span tabIndex={0}>
                                                <Button variant="outline" size="sm" disabled>
                                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                                    {t('ROI Report')}
                                                </Button>
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t('Coming soon')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── KPI Cards ────────────────────────────────────── */}
                <FadeIn delay={75}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Key Metrics')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FadeIn delay={150}>
                        <KpiCard
                            title={t('Avg Response Time')}
                            value={`${summary.avg_response_minutes} min`}
                            icon={<Clock className="h-4 w-4" />}
                            target={`Target: <${responseTarget} min`}
                            status={responseOnTarget ? 'success' : 'warning'}
                        />
                    </FadeIn>
                    <FadeIn delay={225}>
                        <KpiCard
                            title={t('Alerts Resolved')}
                            value={`${summary.resolved_pct}%`}
                            icon={<ShieldCheck className="h-4 w-4" />}
                            target={`${summary.total_alerts} total alerts`}
                            status={summary.resolved_pct >= 90 ? 'success' : summary.resolved_pct >= 70 ? 'warning' : 'danger'}
                        />
                    </FadeIn>
                    <FadeIn delay={300}>
                        <KpiCard
                            title={t('Device Uptime')}
                            value={`${summary.device_uptime_pct}%`}
                            icon={<Cpu className="h-4 w-4" />}
                            target={`${summary.online_devices}/${summary.total_devices} online`}
                            status={summary.device_uptime_pct >= 95 ? 'success' : summary.device_uptime_pct >= 80 ? 'warning' : 'danger'}
                        />
                    </FadeIn>
                    <FadeIn delay={375}>
                        <KpiCard
                            title={t('Alert Trend')}
                            value={String(summary.total_alerts)}
                            icon={<Activity className="h-4 w-4" />}
                            target={`Last ${days} days`}
                            status="neutral"
                        />
                    </FadeIn>
                </div>

                {/* ── Alert Trend Chart ────────────────────────────── */}
                {Object.keys(trend).length > 0 && (
                    <>
                        <FadeIn delay={450}>
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Alert Volume')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                        </FadeIn>
                        <FadeIn delay={525}>
                            <Card className="shadow-elevation-1">
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">{t('Daily Alert Volume')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex h-28 items-end gap-px">
                                        {Object.entries(trend).slice(-30).map(([date, count]) => {
                                            const max = Math.max(...Object.values(trend));
                                            const height = max > 0 ? (count / max) * 100 : 0;
                                            return (
                                                <div
                                                    key={date}
                                                    className="flex-1 rounded-t bg-primary/50 transition-colors hover:bg-primary"
                                                    style={{ height: `${Math.max(height, 2)}%` }}
                                                    title={`${date}: ${count} alerts`}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                                        <span className="font-mono tabular-nums">{Object.keys(trend).slice(-30)[0]}</span>
                                        <span className="font-mono tabular-nums">{Object.keys(trend).slice(-1)[0]}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </FadeIn>
                    </>
                )}

                {/* ── Site Breakdown Table ─────────────────────────── */}
                <FadeIn delay={600}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Site Breakdown')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                        {siteBreakdown.length > 0 && (
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {siteBreakdown.length} {t('sites')}
                            </span>
                        )}
                    </div>
                </FadeIn>
                <FadeIn delay={675}>
                    <Card className="shadow-elevation-1">
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
                                        <TableCell className="text-right font-mono tabular-nums">
                                            {site.alert_count}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge
                                                variant={site.compliance_pct >= 90 ? 'success' : site.compliance_pct >= 70 ? 'warning' : 'destructive'}
                                                className="font-mono tabular-nums"
                                            >
                                                {site.compliance_pct}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge
                                                variant={site.device_uptime_pct >= 95 ? 'success' : site.device_uptime_pct >= 80 ? 'warning' : 'destructive'}
                                                className="font-mono tabular-nums"
                                            >
                                                {site.device_uptime_pct}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

export function PerformanceSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
                    <div>
                        <Skeleton className="h-3 w-36" />
                        <Skeleton className="mt-3 h-9 w-56" />
                        <Skeleton className="mt-2 h-4 w-72" />
                    </div>
                    <Skeleton className="h-9 w-[120px]" />
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="shadow-elevation-1">
                        <CardContent className="p-4">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="mt-3 h-8 w-20" />
                            <Skeleton className="mt-1 h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card className="shadow-elevation-1">
                <CardContent className="p-4">
                    <Skeleton className="h-28 w-full" />
                </CardContent>
            </Card>
            <Card className="shadow-elevation-1">
                <CardContent className="space-y-3 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </CardContent>
            </Card>
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
        <Card className="shadow-elevation-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <p className={`font-mono text-2xl font-bold tabular-nums ${colors[status]}`}>{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{target}</p>
            </CardContent>
        </Card>
    );
}
