import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { cn } from '@/lib/utils';
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
    ArrowDown,
    ArrowUp,
    BarChart3,
    Clock,
    Download,
    Lightbulb,
    Settings2,
    Sliders,
    TrendingDown,
    Users,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────── */

interface NoisyRule {
    rule_id: number;
    rule_name: string;
    site_id: number;
    severity?: string;
    alert_count: number;
    dismissal_rate: number;
}

interface TuningSuggestion extends NoisyRule {
    weekly_rate: number;
    suggestion: string;
}

interface Summary {
    total_alerts: number;
    total_delta: number;
    dismissal_rate: number;
    dismissal_rate_delta: number;
    dismissed_count: number;
    avg_ack_minutes: number | null;
    avg_ack_minutes_delta: number | null;
    auto_resolved_pct: number;
    avg_response_minutes: number | null;
}

interface Mttr {
    mean: number | null;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    sample_count: number;
}

interface AckHistogramBucket {
    label: string;
    count: number;
}

interface AckHistogram {
    buckets: AckHistogramBucket[];
    p50: number | null;
    p95: number | null;
    p99: number | null;
    sample_count: number;
}

interface NoiseScore {
    score: number;
    max: number;
    components: {
        volume: number;
        dismissal: number;
        mttr: number;
    };
    label: 'quiet' | 'moderate' | 'noisy' | 'overwhelming';
}

interface TrendRow {
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
}

interface TeamMember {
    user_id: number;
    user_name: string;
    handled_count: number;
    avg_ack_minutes: number | null;
    dismissal_rate: number;
}

interface Props {
    summary: Summary;
    mttr: Mttr;
    ack_histogram: AckHistogram;
    noise_score: NoiseScore;
    noisiest_rules: NoisyRule[];
    trend: Record<string, number>;
    trend_by_severity: TrendRow[];
    resolution_breakdown: { auto: number; manual: number; work_order: number; dismissed: number };
    suggested_tuning: TuningSuggestion[];
    team_performance: TeamMember[];
    sites: { id: number; name: string }[];
    filters: { days: number; site_id: string | null; severity: string | null };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics', href: '#' },
    { title: 'Alert Tuning', href: '#' },
];

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

/** Format minutes as "42s" / "3m 12s" / "1h 22m" / "2d 4h" */
function formatMinutes(minutes: number | null): string {
    if (minutes === null || minutes === undefined) return '—';
    if (minutes < 1) {
        const seconds = Math.round(minutes * 60);
        return `${seconds}s`;
    }
    if (minutes < 60) {
        const whole = Math.floor(minutes);
        const seconds = Math.round((minutes - whole) * 60);
        return seconds > 0 ? `${whole}m ${seconds}s` : `${whole}m`;
    }
    if (minutes < 1440) {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

/* ── Main Component ─────────────────────────────────────────── */

export default function AlertAnalytics({
    summary,
    mttr,
    ack_histogram,
    noise_score,
    noisiest_rules,
    trend_by_severity,
    resolution_breakdown,
    suggested_tuning,
    team_performance,
    sites,
    filters,
}: Props) {
    const { t } = useLang();

    const updateFilters = (key: string, value: string) => {
        const next: Record<string, string> = {};
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') next[k] = String(v);
        });
        if (value) next[key] = value;
        else delete next[key];
        router.get('/analytics/alerts', next, { preserveState: true, replace: true });
    };

    const exportCsv = () => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') params.set(k, String(v));
        });
        window.location.href = `/analytics/alerts/export?${params.toString()}`;
    };

    const totalResolved =
        resolution_breakdown.auto +
        resolution_breakdown.manual +
        resolution_breakdown.work_order +
        resolution_breakdown.dismissed;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Alert Tuning')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Hero ───────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
                            <div className="max-w-xl">
                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Alert Analytics')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Alert Tuning')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t(
                                        'Identify noisy rules, track response times, and reduce alert fatigue. Every tuning suggestion links back to the rule editor.',
                                    )}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {sites.length > 1 && (
                                    <Select
                                        value={filters.site_id ?? 'all'}
                                        onValueChange={(v) => updateFilters('site_id', v === 'all' ? '' : v)}
                                    >
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder={t('All sites')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All sites')}</SelectItem>
                                            {sites.map((s) => (
                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <ButtonGroup>
                                    <Button
                                        variant={filters.days === 7 ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateFilters('days', '7')}
                                    >
                                        <span className="font-mono tabular-nums">7</span>d
                                    </Button>
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={exportCsv}
                                    title={t('Download filtered analytics as CSV')}
                                >
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Export CSV')}
                                </Button>
                            </div>
                        </div>

                        {/* Severity filter pills */}
                        <div className="relative flex flex-wrap items-center gap-2 border-t border-border/50 px-6 py-3 md:px-8">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                                {t('Severity')}:
                            </span>
                            <FilterPill
                                active={!filters.severity}
                                onClick={() => updateFilters('severity', '')}
                                label={t('All')}
                            />
                            {SEVERITIES.map((sev) => (
                                <FilterPill
                                    key={sev}
                                    active={filters.severity === sev}
                                    onClick={() => updateFilters('severity', filters.severity === sev ? '' : sev)}
                                    label={sev}
                                />
                            ))}
                        </div>
                    </div>
                </FadeIn>

                {/* ── Executive KPI strip ─────────────────────────── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <ExecKpi
                        label={t('Total alerts')}
                        value={summary.total_alerts.toLocaleString()}
                        trend={summary.total_delta}
                        trendGood="down"
                        subtitle={`${(summary.total_alerts / Math.max(filters.days, 1)).toFixed(0)}/${t('day avg')}`}
                    />
                    <ExecKpi
                        label={t('Dismissal rate')}
                        value={`${summary.dismissal_rate}%`}
                        tone={summary.dismissal_rate > 40 ? 'danger' : summary.dismissal_rate > 25 ? 'warning' : 'info'}
                        trend={summary.dismissal_rate_delta}
                        trendGood="down"
                        subtitle={`${summary.dismissed_count} ${t('dismissed')}`}
                    />
                    <ExecKpi
                        label={t('MTTR')}
                        value={formatMinutes(mttr.mean)}
                        tone={(mttr.mean ?? 0) > 60 ? 'warning' : 'info'}
                        subtitle={
                            mttr.sample_count > 0
                                ? `p50 ${formatMinutes(mttr.p50)} · p95 ${formatMinutes(mttr.p95)}`
                                : t('no resolved alerts')
                        }
                    />
                    <ExecKpi
                        label={t('Avg ack time')}
                        value={formatMinutes(summary.avg_ack_minutes)}
                        tone="good"
                        trend={summary.avg_ack_minutes_delta}
                        trendGood="down"
                        subtitle={
                            ack_histogram.sample_count > 0
                                ? `${Math.round(((ack_histogram.buckets[0].count + ack_histogram.buckets[1].count) / ack_histogram.sample_count) * 100)}% ${t('acked within 5 min')}`
                                : '—'
                        }
                    />
                    <NoiseScoreCard score={noise_score} t={t} />
                </div>

                {/* ── Daily trend stacked by severity ─────────────── */}
                <FadeIn delay={100} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Alert volume')} · {filters.days} {t('days')}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">{t('Stacked by severity')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.get('/alerts')}
                                    className="font-mono text-[10px] text-primary hover:text-primary/80"
                                >
                                    {t('VIEW IN ALERTS')} →
                                </button>
                            </div>
                            <StackedTrendChart data={trend_by_severity} t={t} />
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* ── Row: Resolution breakdown + Ack histogram ──── */}
                <div className="grid gap-4 lg:grid-cols-3">
                    <FadeIn delay={150} duration={400}>
                        <Card className="h-full shadow-elevation-1">
                            <CardContent className="p-6">
                                <p className="mb-4 font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Resolution breakdown')}
                                </p>
                                <div className="space-y-3">
                                    <ResolutionRow label={t('Auto-resolved')} count={resolution_breakdown.auto} total={totalResolved} color="emerald" />
                                    <ResolutionRow label={t('Manual')} count={resolution_breakdown.manual} total={totalResolved} color="cyan" />
                                    <ResolutionRow label={t('Work order')} count={resolution_breakdown.work_order} total={totalResolved} color="violet" />
                                    <ResolutionRow label={t('Dismissed')} count={resolution_breakdown.dismissed} total={totalResolved} color="amber" />
                                </div>
                                <div className="mt-4 flex justify-between border-t border-border/50 pt-3 font-mono text-[10px] text-muted-foreground">
                                    <span>{t('Total resolved')}</span>
                                    <strong className="text-foreground">{totalResolved}</strong>
                                </div>
                            </CardContent>
                        </Card>
                    </FadeIn>

                    <FadeIn delay={200} duration={400} className="lg:col-span-2">
                        <Card className="h-full shadow-elevation-1">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                            <Clock className="mr-1.5 inline-block h-3 w-3 align-[-0.125em]" />
                                            {t('Time to acknowledge')}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t('Distribution across')} {ack_histogram.sample_count} {t('alerts')}
                                        </p>
                                    </div>
                                </div>
                                <AckHistogramChart histogram={ack_histogram} />
                            </CardContent>
                        </Card>
                    </FadeIn>
                </div>

                {/* ── Noisiest rules leaderboard ──────────────────── */}
                <FadeIn delay={250} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-6">
                            <div className="mb-4">
                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Noisiest rules')} · {t('top 10')}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('Ranked by alert count · rules with > 50% dismissal flagged as likely false positive')}
                                </p>
                            </div>

                            {noisiest_rules.length === 0 ? (
                                <EmptyState
                                    size="sm"
                                    variant="muted"
                                    icon={<TrendingDown className="h-5 w-5 text-muted-foreground" />}
                                    title={t('No noisy rules')}
                                    description={t('No rules fired during this period. Expand the date range to see more.')}
                                />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10">#</TableHead>
                                            <TableHead>{t('Rule')}</TableHead>
                                            <TableHead className="w-24 text-center">{t('Severity')}</TableHead>
                                            <TableHead className="w-24 text-right">{t('Count')}</TableHead>
                                            <TableHead className="w-28 text-right">{t('Weekly rate')}</TableHead>
                                            <TableHead className="w-44 text-right">{t('Dismissal rate')}</TableHead>
                                            <TableHead className="w-24 text-center">{t('Tune')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {noisiest_rules.map((rule, i) => {
                                            const weeklyRate = Math.round((rule.alert_count / Math.max(filters.days, 1)) * 7);
                                            const isHot = i < 2 && rule.dismissal_rate > 40;
                                            return (
                                                <TableRow key={rule.rule_id}>
                                                    <TableCell
                                                        className={cn(
                                                            'text-center font-mono text-sm font-bold tabular-nums',
                                                            isHot ? 'text-rose-500' : 'text-muted-foreground/60',
                                                        )}
                                                    >
                                                        {i + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{rule.rule_name}</div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {rule.severity && <SeverityTag severity={rule.severity} />}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono tabular-nums">{rule.alert_count}</TableCell>
                                                    <TableCell
                                                        className={cn(
                                                            'text-right font-mono tabular-nums',
                                                            weeklyRate > 50 && 'text-rose-500',
                                                            weeklyRate > 20 && weeklyRate <= 50 && 'text-amber-500',
                                                        )}
                                                    >
                                                        ~{weeklyRate}/wk
                                                    </TableCell>
                                                    <TableCell>
                                                        <DismissalBar rate={rule.dismissal_rate} />
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href={`/sites/${rule.site_id}/rules/${rule.rule_id}`}>
                                                                <Sliders className="mr-1.5 h-3 w-3" />
                                                                {t('Tune')}
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* ── Suggested tuning actions ────────────────────── */}
                {suggested_tuning.length > 0 && (
                    <FadeIn delay={300} duration={400}>
                        <Card className="shadow-elevation-1">
                            <CardContent className="p-6">
                                <div className="mb-4">
                                    <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        <Lightbulb className="mr-1.5 inline-block h-3 w-3 align-[-0.125em]" />
                                        {t('Suggested tuning')} · {suggested_tuning.length} {t('actions')}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t('Rules firing >50×/week. Edit button opens the rule editor.')}
                                    </p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {suggested_tuning.map((s) => (
                                        <div
                                            key={s.rule_id}
                                            className="rounded-lg border border-amber-500/25 border-l-[3px] border-l-amber-500 bg-amber-500/[0.03] p-4"
                                        >
                                            <p className="text-sm font-semibold">{s.rule_name}</p>
                                            <p className="mt-2 text-[11px] text-muted-foreground">{s.suggestion}</p>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                                    {s.weekly_rate}/wk · {s.dismissal_rate}% dismissed
                                                </span>
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/sites/${s.site_id}/rules/${s.rule_id}/edit`}>
                                                        <Settings2 className="mr-1.5 h-3 w-3" />
                                                        {t('Edit rule')}
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* ── Team performance ───────────────────────────── */}
                {team_performance.length > 0 && (
                    <FadeIn delay={350} duration={400}>
                        <Card className="shadow-elevation-1">
                            <CardContent className="p-6">
                                <div className="mb-4">
                                    <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        <Users className="mr-1.5 inline-block h-3 w-3 align-[-0.125em]" />
                                        {t('Team performance')} · {filters.days} {t('days')}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t('Who responds fastest — and who dismisses most. Helps spot training needs.')}
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {team_performance.map((tm) => (
                                        <div key={tm.user_id} className="rounded-lg border border-border/50 bg-muted/10 p-4">
                                            <p className="text-sm font-semibold">{tm.user_name}</p>
                                            <div className="mt-3 grid grid-cols-3 gap-3">
                                                <TeamStat label={t('Handled')} value={tm.handled_count.toString()} />
                                                <TeamStat
                                                    label={t('Avg ack')}
                                                    value={formatMinutes(tm.avg_ack_minutes)}
                                                    tone={(tm.avg_ack_minutes ?? 0) > 5 ? 'warn' : 'good'}
                                                />
                                                <TeamStat
                                                    label={t('Dismissed')}
                                                    value={`${tm.dismissal_rate}%`}
                                                    tone={tm.dismissal_rate > 35 ? 'warn' : undefined}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {summary.total_alerts === 0 && (
                    <FadeIn delay={400} duration={400}>
                        <EmptyState
                            icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
                            title={t('No alerts in this period')}
                            description={t(
                                'No rules fired in the selected window. Your configuration is quiet — either expand the range to review long-term trends, or verify rules are firing correctly.',
                            )}
                        />
                    </FadeIn>
                )}
            </div>
        </AppLayout>
    );
}

/* ── FilterPill ─────────────────────────────────────────────── */

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'rounded-md border px-2.5 py-1 text-[11px] capitalize transition-colors',
                active
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
            )}
        >
            {label}
        </button>
    );
}

/* ── ExecKpi card ───────────────────────────────────────────── */

function ExecKpi({
    label,
    value,
    tone = 'neutral',
    trend,
    trendGood,
    subtitle,
}: {
    label: string;
    value: string;
    tone?: 'good' | 'warning' | 'danger' | 'info' | 'neutral';
    trend?: number | null;
    trendGood?: 'up' | 'down';
    subtitle?: string;
}) {
    const toneClasses = {
        good: 'border-emerald-500/20',
        warning: 'border-amber-500/25',
        danger: 'border-rose-500/30 bg-gradient-to-br from-card to-rose-500/[0.03]',
        info: 'border-border/50',
        neutral: 'border-border/50',
    } as const;
    const valueTone = {
        good: 'text-emerald-500',
        warning: 'text-amber-500',
        danger: 'text-rose-500',
        info: 'text-foreground',
        neutral: 'text-foreground',
    } as const;

    const trendDisplay = (() => {
        if (trend === undefined || trend === null || trend === 0) return null;
        const isUp = trend > 0;
        const isGood = trendGood === 'up' ? isUp : !isUp;
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium',
                    isGood ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500',
                )}
            >
                {isUp ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                {Math.abs(trend).toLocaleString()}
            </span>
        );
    })();

    return (
        <Card className={cn('shadow-elevation-1 transition-all hover:-translate-y-0.5', toneClasses[tone])}>
            <CardContent className="p-5">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className={cn('font-display mt-3 text-3xl font-bold leading-none tracking-tight tabular-nums', valueTone[tone])}>
                    {value}
                </p>
                <div className="mt-2 flex items-baseline gap-2 text-[11px]">
                    {trendDisplay}
                    {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Noise Score card ───────────────────────────────────────── */

function NoiseScoreCard({ score, t }: { score: NoiseScore; t: (key: string) => string }) {
    const label = {
        quiet: { color: 'text-emerald-500', stroke: '#10b981' },
        moderate: { color: 'text-cyan-500', stroke: '#06b6d4' },
        noisy: { color: 'text-amber-500', stroke: '#f59e0b' },
        overwhelming: { color: 'text-rose-500', stroke: '#f43f5e' },
    }[score.label];
    const arcLength = Math.PI * 22;
    const scorePct = Math.min(score.score / score.max, 1);
    const filled = scorePct * arcLength;

    return (
        <Card className="shadow-elevation-1 transition-all hover:-translate-y-0.5">
            <CardContent className="p-5">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('Noise score')}
                </p>
                <p className={cn('font-display mt-3 text-3xl font-bold leading-none tracking-tight tabular-nums', label.color)}>
                    {score.score.toFixed(1)}
                    <span className="text-base text-muted-foreground">/{score.max}</span>
                </p>
                <div className="mt-2 flex items-center justify-between">
                    <span className={cn('font-mono text-[10px] font-semibold uppercase tracking-wider', label.color)}>
                        {t(score.label)}
                    </span>
                    <svg width="56" height="28" viewBox="0 0 56 28">
                        <path
                            d="M4,24 A22,22 0 0 1 52,24"
                            fill="none"
                            stroke="#1e2228"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                        <path
                            d="M4,24 A22,22 0 0 1 52,24"
                            fill="none"
                            stroke={label.stroke}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${filled} ${arcLength}`}
                        />
                    </svg>
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Stacked Trend Chart ────────────────────────────────────── */

function StackedTrendChart({ data, t }: { data: TrendRow[]; t: (key: string) => string }) {
    if (data.length === 0) {
        return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">{t('No trend data available')}</div>;
    }
    const maxTotal = Math.max(...data.map((d) => d.total), 1);
    const labelCount = Math.min(data.length, 6);
    const step = Math.max(1, Math.floor(data.length / labelCount));
    const fmtDate = (iso: string) =>
        new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

    const totals = {
        critical: data.reduce((s, d) => s + d.critical, 0),
        high: data.reduce((s, d) => s + d.high, 0),
        medium: data.reduce((s, d) => s + d.medium, 0),
        low: data.reduce((s, d) => s + d.low, 0),
    };
    const grandTotal = totals.critical + totals.high + totals.medium + totals.low;

    return (
        <div>
            <div className="flex h-44 items-end gap-1 border-l border-border px-1 pb-1">
                {data.map((d) => {
                    const heightPct = (d.total / maxTotal) * 100;
                    return (
                        <div
                            key={d.date}
                            className="group relative flex flex-1 flex-col justify-end"
                            style={{ height: `${Math.max(heightPct, 2)}%` }}
                        >
                            {d.critical > 0 && (
                                <div className="w-full bg-rose-500" style={{ height: `${(d.critical / d.total) * 100}%` }} />
                            )}
                            {d.high > 0 && (
                                <div className="w-full bg-amber-500" style={{ height: `${(d.high / d.total) * 100}%` }} />
                            )}
                            {d.medium > 0 && (
                                <div className="w-full bg-cyan-500" style={{ height: `${(d.medium / d.total) * 100}%` }} />
                            )}
                            {d.low > 0 && (
                                <div className="w-full bg-muted-foreground/50" style={{ height: `${(d.low / d.total) * 100}%` }} />
                            )}
                            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-popover px-2 py-1.5 font-mono text-[10px] text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                {fmtDate(d.date)} · {d.total} alerts
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 flex gap-1 px-1">
                {data.map((d, i) => {
                    const showLabel = i === 0 || i === data.length - 1 || i % step === 0;
                    return (
                        <div key={d.date} className="flex-1 text-center">
                            {showLabel && (
                                <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">{fmtDate(d.date)}</span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/50 pt-3 text-xs">
                <LegendDot color="rose" label={t('Critical')} count={totals.critical} />
                <LegendDot color="amber" label={t('High')} count={totals.high} />
                <LegendDot color="cyan" label={t('Medium')} count={totals.medium} />
                <LegendDot color="muted" label={t('Low')} count={totals.low} />
                <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">
                    {t('Total')}: <span className="font-semibold text-foreground">{grandTotal.toLocaleString()}</span>
                </span>
            </div>
        </div>
    );
}

function LegendDot({
    color,
    label,
    count,
}: {
    color: 'rose' | 'amber' | 'cyan' | 'muted';
    label: string;
    count: number;
}) {
    const bg = {
        rose: 'bg-rose-500',
        amber: 'bg-amber-500',
        cyan: 'bg-cyan-500',
        muted: 'bg-muted-foreground/50',
    }[color];
    return (
        <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-sm', bg)} />
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono font-medium tabular-nums text-foreground">{count}</span>
        </div>
    );
}

/* ── Resolution row ─────────────────────────────────────────── */

function ResolutionRow({
    label,
    count,
    total,
    color,
}: {
    label: string;
    count: number;
    total: number;
    color: 'emerald' | 'cyan' | 'violet' | 'amber';
}) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    const bg = {
        emerald: 'bg-emerald-500',
        cyan: 'bg-cyan-500',
        violet: 'bg-violet-500',
        amber: 'bg-amber-500',
    }[color];
    return (
        <div className="grid grid-cols-[100px_1fr_48px] items-center gap-3 text-xs">
            <span className="text-muted-foreground">{label}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', bg)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-right font-mono font-medium tabular-nums text-foreground">{count}</span>
        </div>
    );
}

/* ── Ack histogram chart ────────────────────────────────────── */

function AckHistogramChart({ histogram }: { histogram: AckHistogram }) {
    if (histogram.sample_count === 0) {
        return (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No acknowledged alerts in this period
            </div>
        );
    }
    const maxCount = Math.max(...histogram.buckets.map((b) => b.count), 1);
    return (
        <div>
            <div className="flex h-40 items-end gap-2 px-2">
                {histogram.buckets.map((b) => {
                    const heightPct = (b.count / maxCount) * 100;
                    return (
                        <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                            <div
                                className="relative w-full rounded-t bg-gradient-to-t from-cyan-500/30 to-cyan-500 transition-all hover:from-amber-500/30 hover:to-amber-500"
                                style={{ height: `${Math.max(heightPct, 2)}%` }}
                            >
                                <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] font-medium tabular-nums">
                                    {b.count}
                                </span>
                            </div>
                            <span className="text-center font-mono text-[9px] text-muted-foreground">{b.label}</span>
                        </div>
                    );
                })}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border/50 pt-3 text-center">
                <PercentileStat label="p50" value={histogram.p50} />
                <PercentileStat label="p95" value={histogram.p95} />
                <PercentileStat label="p99" value={histogram.p99} />
            </div>
        </div>
    );
}

function PercentileStat({ label, value }: { label: string; value: number | null }) {
    const tone =
        value === null ? '' : value < 5 ? 'text-emerald-500' : value < 15 ? 'text-cyan-500' : 'text-amber-500';
    return (
        <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={cn('font-mono mt-1 text-sm font-semibold tabular-nums', tone)}>{formatMinutes(value)}</p>
        </div>
    );
}

/* ── Dismissal rate inline bar ─────────────────────────────── */

function DismissalBar({ rate }: { rate: number }) {
    const tone = rate > 50 ? 'bg-rose-500' : rate > 25 ? 'bg-amber-500' : 'bg-emerald-500';
    const textTone = rate > 50 ? 'text-rose-500' : rate > 25 ? 'text-amber-500' : 'text-emerald-500';
    return (
        <div className="flex items-center justify-end gap-2">
            <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', tone)} style={{ width: `${rate}%` }} />
            </div>
            <span className={cn('min-w-[40px] text-right font-mono text-xs font-semibold tabular-nums', textTone)}>
                {rate}%
            </span>
        </div>
    );
}

/* ── Severity tag ───────────────────────────────────────────── */

function SeverityTag({ severity }: { severity: string }) {
    const tone =
        {
            critical: 'bg-rose-500/15 text-rose-500',
            high: 'bg-amber-500/15 text-amber-500',
            medium: 'bg-cyan-500/15 text-cyan-500',
            low: 'bg-muted text-muted-foreground',
        }[severity] ?? 'bg-muted text-muted-foreground';
    return (
        <span
            className={cn(
                'inline-flex items-center rounded px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider',
                tone,
            )}
        >
            {severity}
        </span>
    );
}

/* ── Team stat ──────────────────────────────────────────────── */

function TeamStat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
    const textTone = tone === 'good' ? 'text-emerald-500' : tone === 'warn' ? 'text-amber-500' : 'text-foreground';
    return (
        <div className="text-center">
            <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/70">{label}</p>
            <p className={cn('font-mono mt-1 text-sm font-semibold tabular-nums', textTone)}>{value}</p>
        </div>
    );
}
