import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Battery,
    BatteryWarning,
    CheckCircle2,
    Cpu,
    ShieldCheck,
    Thermometer,
    TrendingUp,
    Wrench,
    X,
} from 'lucide-react';
import { type ReactNode } from 'react';

/* ── Types ──────────────────────────────────────────────────── */

interface BatteryPrediction {
    device_id: number;
    device_name: string;
    device_model: string;
    site_id: number;
    site_name: string | null;
    zone: string | null;
    current_pct: number;
    estimated_days: number | null;
    estimated_date: string | null;
    confidence: 'high' | 'medium' | 'low' | 'insufficient_data' | 'stable';
    drain_rate_per_day: number | null;
    urgency: 'urgent' | 'warning' | 'healthy' | 'unknown';
}

interface Insight {
    id: string;
    type: 'compressor_degradation' | 'temperature_drift';
    device_id: number;
    device_name: string;
    site_id: number;
    site_name: string | null;
    severity: 'high' | 'medium' | 'low';
    title: string;
    baseline: number | null;
    current: number | null;
    consecutive_weeks: number;
    drift_direction?: string;
    description: string;
}

interface Anomaly {
    id: number;
    device_id: number;
    device_name: string | null;
    site_name: string | null;
    metric: string;
    value: number;
    valid_min: number;
    valid_max: number;
    unit: string;
    recorded_at: string | null;
}

interface Stats {
    urgent_count: number;
    warning_count: number;
    degradation_count: number;
    health_pct: number;
    total_devices: number;
    healthy_devices: number;
}

interface Props {
    batteryPredictions: BatteryPrediction[];
    insights: Insight[];
    anomalies: Anomaly[];
    stats: Stats;
    sites: { id: number; name: string }[];
    filters: { site_id: string | null };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics', href: '#' },
    { title: 'Predictive', href: '/analytics/predictions' },
];

/* ── Main Component ─────────────────────────────────────────── */

export default function PredictiveAnalytics({
    batteryPredictions,
    insights,
    anomalies,
    stats,
    sites,
    filters,
}: Props) {
    const { t } = useLang();

    const updateFilter = (key: string, value: string | null) => {
        const next: Record<string, string> = {};
        if (value && value !== 'all') next[key] = value;
        router.get('/analytics/predictions', next, { preserveState: true, replace: true });
    };

    const noData =
        batteryPredictions.length === 0 && insights.length === 0 && anomalies.length === 0;

    // Only show predictions with actual urgency or data
    const actionableBatteries = batteryPredictions.filter(
        (b) => b.urgency === 'urgent' || b.urgency === 'warning' || (b.estimated_days !== null && b.estimated_days <= 180),
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Predictive Analytics')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Hero ───────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
                            <div className="max-w-2xl">
                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Predictive maintenance')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t("What's about to break")}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t(
                                        'Battery forecasts, compressor degradation, and temperature drift — computed daily from 90 days of sensor history. Act before the alert fires.',
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {sites.length > 1 && (
                                    <Select
                                        value={filters.site_id ?? 'all'}
                                        onValueChange={(v) => updateFilter('site_id', v === 'all' ? null : v)}
                                    >
                                        <SelectTrigger className="h-8 w-48 text-xs">
                                            <SelectValue placeholder={t('All sites')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All sites')}</SelectItem>
                                            {sites.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {noData ? (
                    <FadeIn delay={100}>
                        <EmptyState
                            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                            title={t('Fleet looks healthy')}
                            description={t(
                                'No battery replacements, degradation warnings, or sensor drift detected. The analysis runs daily at 05:00.',
                            )}
                        />
                    </FadeIn>
                ) : (
                    <>
                        {/* ── Stat strip ────────────────────────────── */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <FadeIn delay={50}>
                                <StatCell
                                    icon={<BatteryWarning className="h-3 w-3" />}
                                    label={t('Urgent replacements')}
                                    value={stats.urgent_count.toString()}
                                    tone={stats.urgent_count > 0 ? 'coral' : 'default'}
                                    subtitle={
                                        stats.urgent_count > 0
                                            ? t('batteries < 7 days')
                                            : t('none')
                                    }
                                />
                            </FadeIn>
                            <FadeIn delay={100}>
                                <StatCell
                                    icon={<Battery className="h-3 w-3" />}
                                    label={t('Upcoming (30d)')}
                                    value={stats.warning_count.toString()}
                                    tone={stats.warning_count > 0 ? 'amber' : 'default'}
                                    subtitle={t('batteries 7–30 days remaining')}
                                />
                            </FadeIn>
                            <FadeIn delay={150}>
                                <StatCell
                                    icon={<Activity className="h-3 w-3" />}
                                    label={t('Degradation warnings')}
                                    value={stats.degradation_count.toString()}
                                    tone="cyan"
                                    subtitle={t('compressor + temperature drift')}
                                />
                            </FadeIn>
                            <FadeIn delay={200}>
                                <StatCell
                                    icon={<ShieldCheck className="h-3 w-3" />}
                                    label={t('Fleet health')}
                                    value={`${stats.health_pct}%`}
                                    tone="emerald"
                                    subtitle={`${stats.healthy_devices} ${t('of')} ${stats.total_devices} ${t('devices with no issues')}`}
                                />
                            </FadeIn>
                        </div>

                        {/* ── Battery forecasts ─────────────────────── */}
                        {actionableBatteries.length > 0 && (
                            <FadeIn delay={250} duration={400}>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-5">
                                            <p className="font-display text-base font-semibold tracking-tight">
                                                {t('Battery forecasts')}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('Linear regression on 90 days of battery readings. Replace when reaching 20%.')}
                                            </p>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                            {actionableBatteries.map((b) => (
                                                <BatteryCard key={b.device_id} prediction={b} t={t} />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}

                        {/* ── Equipment insights ────────────────────── */}
                        {insights.length > 0 && (
                            <FadeIn delay={300} duration={400}>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-5">
                                            <p className="font-display text-base font-semibold tracking-tight">
                                                {t('Equipment insights')}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('Compressor degradation and temperature drift detected from sensor history.')}
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            {insights.map((insight) => (
                                                <InsightRow key={insight.id} insight={insight} t={t} />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}

                        {/* ── Anomaly log ───────────────────────────── */}
                        {anomalies.length > 0 && (
                            <FadeIn delay={350} duration={400}>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-5">
                                            <p className="font-display text-base font-semibold tracking-tight">
                                                {t('Anomaly log')}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('Sensor readings that failed sanity checks — values physically impossible for the sensor type.')}
                                            </p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-border">
                                                        <th className="px-3 py-2 text-left font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t('Device')}</th>
                                                        <th className="px-3 py-2 text-left font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t('Site')}</th>
                                                        <th className="px-3 py-2 text-left font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t('Metric')}</th>
                                                        <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t('Reading')}</th>
                                                        <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t('Valid range')}</th>
                                                        <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t('When')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {anomalies.map((a) => (
                                                        <tr key={a.id} className="border-b border-border/40">
                                                            <td className="px-3 py-2.5">
                                                                <Link
                                                                    href={`/devices/${a.device_id}`}
                                                                    className="font-semibold text-foreground hover:text-cyan-500 hover:underline"
                                                                >
                                                                    {a.device_name ?? '—'}
                                                                </Link>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-muted-foreground">{a.site_name ?? '—'}</td>
                                                            <td className="px-3 py-2.5 font-mono">{a.metric}</td>
                                                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-rose-500">
                                                                {a.value}{a.unit}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                                                                {a.valid_min} – {a.valid_max}{a.unit}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                                                                {a.recorded_at
                                                                    ? new Date(a.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                                                    : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}

/* ── Stat cell ──────────────────────────────────────────────── */

function StatCell({
    icon,
    label,
    value,
    tone = 'default',
    subtitle,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    tone?: 'coral' | 'amber' | 'cyan' | 'emerald' | 'default';
    subtitle?: string;
}) {
    const barClass = {
        coral: 'before:bg-rose-500',
        amber: 'before:bg-amber-500',
        cyan: 'before:bg-cyan-500',
        emerald: 'before:bg-emerald-500',
        default: 'before:bg-muted-foreground/40',
    }[tone];

    const valueClass = tone === 'coral' ? 'text-rose-500' : tone === 'amber' ? 'text-amber-500' : 'text-foreground';

    return (
        <Card
            className={cn(
                'relative overflow-hidden shadow-elevation-1 transition-all hover:-translate-y-0.5',
                "before:absolute before:left-0 before:right-0 before:top-0 before:h-[2px] before:opacity-70 before:content-['']",
                barClass,
            )}
        >
            <CardContent className="p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-widest">{label}</p>
                    {icon}
                </div>
                <p className={cn('font-display mt-3 text-3xl font-bold leading-none tracking-tight tabular-nums', valueClass)}>
                    {value}
                </p>
                {subtitle && <p className="mt-2 font-mono text-[10px] text-muted-foreground">{subtitle}</p>}
            </CardContent>
        </Card>
    );
}

/* ── Battery card ───────────────────────────────────────────── */

function BatteryCard({
    prediction: b,
    t,
}: {
    prediction: BatteryPrediction;
    t: (k: string) => string;
}) {
    const urgencyStyle = {
        urgent: { border: 'border-l-rose-500', bar: 'bg-gradient-to-r from-rose-500 to-rose-500/50', tag: 'bg-rose-500/15 text-rose-500', text: 'text-rose-500' },
        warning: { border: 'border-l-amber-500', bar: 'bg-gradient-to-r from-amber-500 to-amber-500/50', tag: 'bg-amber-500/15 text-amber-500', text: 'text-amber-500' },
        healthy: { border: 'border-l-emerald-500', bar: 'bg-gradient-to-r from-emerald-500 to-emerald-500/50', tag: 'bg-emerald-500/15 text-emerald-500', text: 'text-emerald-500' },
        unknown: { border: 'border-l-border', bar: 'bg-muted', tag: 'bg-muted text-muted-foreground', text: 'text-muted-foreground' },
    }[b.urgency];

    const confidenceStyle = {
        high: 'bg-emerald-500/15 text-emerald-500',
        medium: 'bg-amber-500/15 text-amber-500',
        low: 'bg-muted text-muted-foreground',
        insufficient_data: 'bg-muted text-muted-foreground',
        stable: 'bg-muted text-muted-foreground',
    }[b.confidence];

    const daysLabel = b.estimated_days === null
        ? '—'
        : b.estimated_days === 0
          ? t('Replace now')
          : b.estimated_days <= 7
            ? `${b.estimated_days}d`
            : b.estimated_days <= 30
              ? `${b.estimated_days}d`
              : `${b.estimated_days}d+`;

    return (
        <div className={cn('relative rounded-lg border border-l-[3px] bg-muted/20 p-4 transition-colors hover:bg-muted/30', urgencyStyle.border)}>
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <Link
                        href={`/devices/${b.device_id}`}
                        className="text-[13px] font-semibold text-foreground hover:text-cyan-500 hover:underline"
                    >
                        {b.device_model} · {b.device_name}
                    </Link>
                    <p className="font-mono text-[9px] text-muted-foreground">
                        {b.site_name}{b.zone ? ` · ${b.zone}` : ''}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <span className={cn('rounded px-2 py-0.5 font-mono text-[9px] font-semibold uppercase', urgencyStyle.tag)}>
                        {daysLabel}
                    </span>
                    <span className={cn('rounded px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase', confidenceStyle)}>
                        {t(b.confidence)}
                    </span>
                </div>
            </div>

            {/* Battery bar */}
            <div className="mb-3">
                <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>{t('Battery')}</span>
                    <span>{b.current_pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-background">
                    <div className={cn('h-full rounded-full', urgencyStyle.bar)} style={{ width: `${Math.min(b.current_pct, 100)}%` }} />
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center">
                <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{t('Current')}</p>
                    <p className={cn('mt-0.5 font-mono text-sm font-semibold tabular-nums', urgencyStyle.text)}>{b.current_pct}%</p>
                </div>
                <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{t('Drain')}</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                        {b.drain_rate_per_day !== null ? `${b.drain_rate_per_day}%/d` : '—'}
                    </p>
                </div>
                <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{t('Replace by')}</p>
                    <p className={cn('mt-0.5 font-mono text-sm font-semibold tabular-nums', urgencyStyle.text)}>
                        {b.estimated_date
                            ? new Date(b.estimated_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                            : b.estimated_days === 0
                              ? t('Now')
                              : '—'}
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ── Insight row ────────────────────────────────────────────── */

function InsightRow({
    insight,
    t,
}: {
    insight: Insight;
    t: (k: string) => string;
}) {
    const iconStyle = insight.type === 'compressor_degradation'
        ? 'bg-amber-500/10 text-amber-500 border-amber-500/25'
        : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/25';

    const severityStyle = {
        high: 'bg-amber-500/15 text-amber-500',
        medium: 'bg-cyan-500/15 text-cyan-500',
        low: 'bg-muted text-muted-foreground',
    }[insight.severity];

    const isCompressor = insight.type === 'compressor_degradation';

    return (
        <div
            className={cn(
                'rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30',
                insight.severity === 'high' && 'border-l-[3px] border-l-amber-500',
            )}
        >
            <div className="flex items-start gap-3">
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', iconStyle)}>
                    {isCompressor ? <TrendingUp className="h-3.5 w-3.5" /> : <Thermometer className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold">{insight.title}</p>
                        <span className={cn('shrink-0 rounded px-2 py-0.5 font-mono text-[9px] font-semibold uppercase', severityStyle)}>
                            {t(insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1))}
                        </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {insight.site_name}
                        {insight.consecutive_weeks > 0 && ` · ${insight.consecutive_weeks} ${t('consecutive weeks')}`}
                        {insight.baseline !== null && insight.current !== null && (
                            <> · {t('Baseline')}: {insight.baseline}{isCompressor ? 'A' : '°C'} → {t('Current')}: {insight.current}{isCompressor ? 'A' : '°C'}</>
                        )}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        {insight.description}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                        href={`/devices/${insight.device_id}`}
                        className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1.5 font-mono text-[9px] text-muted-foreground transition-colors hover:border-cyan-500 hover:text-cyan-500"
                    >
                        <Wrench className="h-3 w-3" />
                        {isCompressor ? t('Create WO') : t('View device')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
