import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { EmptyState } from '@/components/ui/empty-state';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
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
                {/* Header with filters */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Alert Tuning')}</h1>
                        <p className="text-sm text-muted-foreground">
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
                        <div className="flex rounded-md border">
                            <Button
                                variant={filters.days === 30 ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-r-none"
                                onClick={() => updateFilters('days', '30')}
                            >
                                30d
                            </Button>
                            <Button
                                variant={filters.days === 90 ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-l-none"
                                onClick={() => updateFilters('days', '90')}
                            >
                                90d
                            </Button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
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
                        value={summary.avg_response_minutes !== null ? `${summary.avg_response_minutes} min` : '—'}
                        accent="text-foreground"
                    />
                    <KPICard
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        label={t('Auto-Resolved')}
                        value={`${summary.auto_resolved_pct}%`}
                        accent="text-emerald-600 dark:text-emerald-400"
                    />
                </div>

                {summary.total_alerts === 0 ? (
                    <EmptyState
                        icon={CheckCircle2}
                        title={t('No alerts in this period')}
                        description={t("That's a good thing! Try expanding the date range to see historical data.")}
                    />
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                        {/* Main content */}
                        <div className="space-y-6">
                            {/* Noisiest Rules Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Noisiest Rules')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {noisiest_rules.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">{t('No rule-based alerts in this period.')}</p>
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
                                                        <TableCell className="text-right tabular-nums font-bold">{rule.alert_count}</TableCell>
                                                        <TableCell className="text-right hidden sm:table-cell">
                                                            <Badge variant={rule.dismissal_rate > 50 ? 'destructive' : rule.dismissal_rate > 25 ? 'warning' : 'outline'}>
                                                                {rule.dismissal_rate}%
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

                            {/* Alert Trend (simple bar visualization) */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Alert Trend')}</CardTitle>
                                </CardHeader>
                                <CardContent>
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

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Resolution Breakdown */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Resolution Breakdown')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <BreakdownRow label={t('Auto-resolved')} count={resolution_breakdown.auto} total={totalResolved} color="bg-emerald-500" />
                                    <BreakdownRow label={t('Manual')} count={resolution_breakdown.manual} total={totalResolved} color="bg-blue-500" />
                                    <BreakdownRow label={t('Work Order')} count={resolution_breakdown.work_order} total={totalResolved} color="bg-amber-500" />
                                    <BreakdownRow label={t('Dismissed')} count={resolution_breakdown.dismissed} total={totalResolved} color="bg-red-500" />
                                </CardContent>
                            </Card>

                            {/* Suggested Tuning */}
                            {suggested_tuning.length > 0 && (
                                <Card>
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
                                                <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0 text-xs">
                                                    <Link href={`/sites/${s.site_id}/rules/${s.rule_id}`}>
                                                        {t('Adjust threshold')} →
                                                    </Link>
                                                </Button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Trend indicator */}
                            {Object.keys(trend).length >= 7 && (
                                <Card>
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
                                                        ? t('Alert volume decreasing — trending in the right direction')
                                                        : t('Alert volume increasing — review noisy rules above');
                                                })()}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
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
        <Card>
            <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {icon}
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold tabular-nums tracking-tight ${accent}`}>{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function BreakdownRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">{count}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
