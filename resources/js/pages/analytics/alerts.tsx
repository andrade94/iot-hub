import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Lightbulb,
    Settings2,
    TrendingDown,
    XCircle,
} from 'lucide-react';

interface NoisyRule {
    rule_id: number;
    rule_name: string;
    site_id: number;
    alert_count: number;
    dismissal_rate: number;
}

interface TuningSuggestion extends NoisyRule {
    weekly_rate: number;
    suggestion: string;
}

interface Props {
    summary: {
        total_alerts: number;
        dismissal_rate: number;
        avg_response_minutes: number | null;
        auto_resolved_pct: number;
    };
    noisiest_rules: NoisyRule[];
    trend: Record<string, number>;
    resolution_breakdown: { auto: number; manual: number; work_order: number; dismissed: number };
    suggested_tuning: TuningSuggestion[];
    sites: { id: number; name: string }[];
    filters: { days: number; site_id: string | null };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics', href: '#' },
    { title: 'Alert Tuning', href: '#' },
];

export default function AlertAnalytics({ summary, noisiest_rules, trend, resolution_breakdown, suggested_tuning, sites, filters }: Props) {
    const { t } = useLang();

    const updateFilters = (key: string, value: string) => {
        router.get('/analytics/alerts', { ...filters, [key]: value }, { preserveState: true, replace: true });
    };

    const totalResolved = resolution_breakdown.auto + resolution_breakdown.manual + resolution_breakdown.work_order + resolution_breakdown.dismissed;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Alert Analytics')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Alert Tuning')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Alert Analytics')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Identify noisy rules, track response times, and reduce alert fatigue.')}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Select value={filters.site_id ?? 'all'} onValueChange={(v) => updateFilters('site_id', v === 'all' ? '' : v)}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder={t('All sites')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All sites')}</SelectItem>
                                        {sites.map((s) => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <ButtonGroup>
                                    <Button
                                        variant={filters.days === 30 ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateFilters('days', '30')}
                                    >
                                        <span className="font-mono tabular-nums">30</span>d
                                    </Button>
                                    <Button
                                        variant={filters.days === 90 ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateFilters('days', '90')}
                                    >
                                        <span className="font-mono tabular-nums">90</span>d
                                    </Button>
                                </ButtonGroup>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── KPI Cards ────────────────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Key Metrics')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <KPICard
                                icon={<AlertTriangle className="h-4 w-4" />}
                                label={t('Total Alerts')}
                                value={summary.total_alerts.toLocaleString()}
                                accent="text-foreground"
                            />
                            <KPICard
                                icon={<XCircle className="h-4 w-4" />}
                                label={t('Dismissal Rate')}
                                value={`${summary.dismissal_rate}%`}
                                accent={summary.dismissal_rate > 30 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
                            />
                            <KPICard
                                icon={<Clock className="h-4 w-4" />}
                                label={t('Avg Response')}
                                value={summary.avg_response_minutes !== null ? `${summary.avg_response_minutes} min` : '\u2014'}
                                accent="text-foreground"
                            />
                            <KPICard
                                icon={<CheckCircle2 className="h-4 w-4" />}
                                label={t('Auto-Resolved')}
                                value={`${summary.auto_resolved_pct}%`}
                                accent="text-emerald-600 dark:text-emerald-400"
                            />
                        </div>
                    </div>
                </FadeIn>

                {summary.total_alerts === 0 ? (
                    <FadeIn delay={150} duration={500}>
                        <EmptyState
                            icon={<CheckCircle2 className="h-10 w-10 text-emerald-500" />}
                            title={t('No alerts in this period')}
                            description={t("That's a good thing! Try expanding the date range to see historical data.")}
                        />
                    </FadeIn>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                        {/* ── Main Content ──────────────────────────────── */}
                        <div className="space-y-6">
                            {/* Noisiest Rules Table */}
                            <FadeIn delay={150} duration={500}>
                                <div>
                                    <div className="mb-2 flex items-center gap-3">
                                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {t('Noisiest Rules')}
                                        </p>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <Card className="shadow-elevation-1">
                                        <CardContent className="p-0">
                                            {noisiest_rules.length === 0 ? (
                                                <p className="p-6 text-sm text-muted-foreground">{t('No rule-based alerts in this period.')}</p>
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>{t('Rule')}</TableHead>
                                                            <TableHead className="text-right">{t('Alerts')}</TableHead>
                                                            <TableHead className="text-right hidden sm:table-cell">{t('Dismissal %')}</TableHead>
                                                            <TableHead className="text-right">{t('Action')}</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {noisiest_rules.map((rule) => (
                                                            <TableRow key={`${rule.rule_id}-${rule.site_id}`}>
                                                                <TableCell className="font-medium">{rule.rule_name}</TableCell>
                                                                <TableCell className="text-right font-mono font-bold tabular-nums">{rule.alert_count}</TableCell>
                                                                <TableCell className="text-right hidden sm:table-cell">
                                                                    <Badge variant={rule.dismissal_rate > 50 ? 'destructive' : rule.dismissal_rate > 25 ? 'warning' : 'outline'}>
                                                                        <span className="font-mono tabular-nums">{rule.dismissal_rate}%</span>
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button asChild variant="outline" size="sm">
                                                                        <Link href={`/sites/${rule.site_id}/rules/${rule.rule_id}`}>
                                                                            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                                                                            {t('Tune')}
                                                                        </Link>
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </FadeIn>

                            {/* Alert Trend */}
                            <FadeIn delay={225} duration={500}>
                                <div>
                                    <div className="mb-2 flex items-center gap-3">
                                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {t('Alert Trend')}
                                        </p>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <Card className="shadow-elevation-1">
                                        <CardContent className="p-6">
                                            {Object.keys(trend).length > 0 ? (
                                                <div className="flex items-end gap-1 h-32">
                                                    {Object.entries(trend).map(([date, count]) => {
                                                        const maxCount = Math.max(...Object.values(trend));
                                                        const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                                        return (
                                                            <div key={date} className="flex-1 flex flex-col items-center gap-1">
                                                                <div
                                                                    className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                                                                    style={{ height: `${Math.max(height, 2)}%` }}
                                                                    title={`${date}: ${count} alerts`}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">{t('No trend data available.')}</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </FadeIn>
                        </div>

                        {/* ── Sidebar ───────────────────────────────────── */}
                        <div className="space-y-6">
                            {/* Resolution Breakdown */}
                            <FadeIn delay={150} duration={500}>
                                <div>
                                    <div className="mb-2 flex items-center gap-3">
                                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {t('Resolution')}
                                        </p>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <Card className="shadow-elevation-1">
                                        <CardContent className="space-y-3 p-6">
                                            <BreakdownRow label={t('Auto-resolved')} count={resolution_breakdown.auto} total={totalResolved} color="bg-emerald-500" />
                                            <BreakdownRow label={t('Manual')} count={resolution_breakdown.manual} total={totalResolved} color="bg-blue-500" />
                                            <BreakdownRow label={t('Work Order')} count={resolution_breakdown.work_order} total={totalResolved} color="bg-amber-500" />
                                            <BreakdownRow label={t('Dismissed')} count={resolution_breakdown.dismissed} total={totalResolved} color="bg-red-500" />
                                        </CardContent>
                                    </Card>
                                </div>
                            </FadeIn>

                            {/* Suggested Tuning */}
                            {suggested_tuning.length > 0 && (
                                <FadeIn delay={225} duration={500}>
                                    <div>
                                        <div className="mb-2 flex items-center gap-3">
                                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {t('Suggestions')}
                                            </p>
                                            <div className="h-px flex-1 bg-border" />
                                        </div>
                                        <Card className="shadow-elevation-1">
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-base">
                                                    <Lightbulb className="h-4 w-4 text-amber-500" />
                                                    {t('Suggested Tuning')}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {suggested_tuning.map((s) => (
                                                    <div key={s.rule_id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                                                        <p className="text-sm font-medium">{s.rule_name}</p>
                                                        <p className="text-xs text-muted-foreground">{s.suggestion}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            <span className="font-mono tabular-nums font-medium text-foreground">{s.weekly_rate}</span>{' '}
                                                            {t('alerts/week')}
                                                        </p>
                                                        <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0 text-xs">
                                                            <Link href={`/sites/${s.site_id}/rules/${s.rule_id}`}>
                                                                {t('Adjust threshold')} &rarr;
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </FadeIn>
                            )}

                            {/* Trend indicator */}
                            {Object.keys(trend).length >= 7 && (
                                <FadeIn delay={300} duration={500}>
                                    <Card className="shadow-elevation-1">
                                        <CardContent className="flex items-center gap-3 p-4">
                                            <TrendingDown className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">{t('Trend')}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(() => {
                                                        const values = Object.values(trend);
                                                        const firstHalf = values.slice(0, Math.floor(values.length / 2));
                                                        const secondHalf = values.slice(Math.floor(values.length / 2));
                                                        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                                                        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                                                        return secondAvg < firstAvg
                                                            ? t('Alert volume decreasing \u2014 trending in the right direction')
                                                            : t('Alert volume increasing \u2014 review noisy rules above');
                                                    })()}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </FadeIn>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

/* ── Sub-components ───────────────────────────────── */

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
    return (
        <Card className="shadow-elevation-1">
            <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {icon}
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`font-mono text-2xl font-bold tabular-nums tracking-tight ${accent}`}>{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export function AlertTuningSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="mt-3 h-8 w-40" />
                        <Skeleton className="mt-2 h-4 w-72" />
                    </div>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-9 w-24" />
                    </div>
                </div>
            </div>
            {/* KPI Cards */}
            <div>
                <div className="mb-2 flex items-center gap-3">
                    <Skeleton className="h-3 w-20" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border p-4">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div>
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="mt-2 h-7 w-16" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Main content */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-6">
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <Skeleton className="h-3 w-24" />
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="rounded-xl border p-4 space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <Skeleton className="h-3 w-20" />
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="rounded-xl border p-6 space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-8" />
                                    </div>
                                    <Skeleton className="h-2 w-full rounded-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BreakdownRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-medium tabular-nums">{count}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
