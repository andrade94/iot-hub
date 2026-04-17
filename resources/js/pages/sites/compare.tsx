import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDown,
    BarChart3,
    Check,
    Clock,
    Cpu,
    Download,
    FileText,
    Flame,
    MapPin,
    Scale,
    ShieldCheck,
    TrendingUp,
    Trophy,
    X,
} from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

/* ── Types ──────────────────────────────────────────────────── */

interface SiteRanking {
    site_id: number;
    site_name: string;
    segment: string | null;
    device_count: number;
    uptime_pct: number;
    sla_pct: number;
    mttr_minutes: number | null;
    alert_count: number;
    resolved_pct: number;
    wo_completed: number;
    compliance_ytd_pct: number;
    sparkline: number[];
    composite: number;
}

interface Stats {
    total_sites: number;
    top_performer: { site_name: string; composite: number; uptime: number } | null;
    fleet_composite: number;
    fleet_composite_delta: number | null;
    biggest_drop: { site_name: string; composite: number; alert_count: number } | null;
}

interface Weights {
    uptime: number;
    sla: number;
    alert_rate: number;
    mttr: number;
    compliance: number;
}

interface Props {
    rankings: SiteRanking[];
    stats: Stats;
    days: number;
    weights: Weights;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Overview', href: '#' },
    { title: 'Compare Sites', href: '/sites/compare' },
];

/* ── Helpers ────────────────────────────────────────────────── */

function formatMinutes(minutes: number | null): string {
    if (minutes === null) return '—';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    const d = Math.floor(minutes / 1440);
    return `${d}d`;
}

function compositeColor(v: number): 'good' | 'ok' | 'warn' | 'bad' {
    if (v >= 85) return 'good';
    if (v >= 70) return 'ok';
    if (v >= 50) return 'warn';
    return 'bad';
}

const COLOR_MAP = {
    good: 'text-emerald-500',
    ok: 'text-cyan-500',
    warn: 'text-amber-500',
    bad: 'text-rose-500',
};

const STROKE_MAP = {
    good: '#10b981',
    ok: '#06b6d4',
    warn: '#f59e0b',
    bad: '#f43f5e',
};

function siteMonogram(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '??';
    const first = parts[0].charAt(0).toUpperCase();
    const numMatch = name.match(/#(\d+)/);
    if (numMatch) return first + numMatch[1];
    const second = parts.length > 1 ? parts[1].charAt(0).toUpperCase() : '';
    return first + second;
}

function metricTone(value: number, thresholds: { good: number; warn: number }, higherIsBetter: boolean): string {
    if (higherIsBetter) {
        if (value >= thresholds.good) return 'text-emerald-500';
        if (value >= thresholds.warn) return 'text-amber-500';
        return 'text-rose-500';
    }
    if (value <= thresholds.good) return 'text-emerald-500';
    if (value <= thresholds.warn) return 'text-amber-500';
    return 'text-rose-500';
}

/* ── Main Component ─────────────────────────────────────────── */

export default function SiteComparison({ rankings, stats, days, weights }: Props) {
    const { t } = useLang();
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [mode, setMode] = useState<'ranking' | 'headToHead'>('ranking');
    const [sortKey, setSortKey] = useState<string>('composite');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const changeDays = (d: number) => {
        router.get('/sites/compare', { days: d }, { preserveState: true, replace: true });
    };

    const toggleSite = useCallback((id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else if (next.size < 4) next.add(id);
            return next;
        });
    }, []);

    const clearSelection = () => setSelectedIds(new Set());

    const goHeadToHead = () => {
        if (selectedIds.size >= 2) setMode('headToHead');
    };

    const selectedSites = useMemo(
        () => rankings.filter((r) => selectedIds.has(r.site_id)),
        [rankings, selectedIds],
    );

    const sorted = useMemo(() => {
        const arr = [...rankings];
        arr.sort((a, b) => {
            const aVal = (a as unknown as Record<string, unknown>)[sortKey];
            const bVal = (b as unknown as Record<string, unknown>)[sortKey];
            const av = typeof aVal === 'number' ? aVal : 0;
            const bv = typeof bVal === 'number' ? bVal : 0;
            return sortDir === 'desc' ? bv - av : av - bv;
        });
        return arr;
    }, [rankings, sortKey, sortDir]);

    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
        else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const weightsLabel = Object.entries(weights)
        .map(([k, v]) => `${k.replace('_', ' ')} ${Math.round(v * 100)}%`)
        .join(' · ');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Compare Sites')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Hero ───────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
                            <div className="max-w-2xl">
                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Fleet benchmarking')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Compare Sites')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t(
                                        'See how every site stacks up across the metrics that matter. Pick 2–4 sites to go head-to-head, or scan the full ranking.',
                                    )}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <ButtonGroup>
                                    {[7, 30, 90].map((d) => (
                                        <Button
                                            key={d}
                                            variant={days === d ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => changeDays(d)}
                                        >
                                            <span className="font-mono tabular-nums">{d}</span>d
                                        </Button>
                                    ))}
                                </ButtonGroup>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`/sites/compare/export?days=${days}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Download className="mr-1.5 h-3.5 w-3.5" />
                                        {t('PDF Report')}
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {rankings.length < 2 ? (
                    <FadeIn delay={100}>
                        <EmptyState
                            icon={<Scale className="h-5 w-5 text-muted-foreground" />}
                            title={t('Not enough sites')}
                            description={t('Site comparison requires at least 2 active sites.')}
                        />
                    </FadeIn>
                ) : (
                    <>
                        {/* ── Stat strip ────────────────────────────── */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <FadeIn delay={50}>
                                <StatCell
                                    icon={<MapPin className="h-3 w-3" />}
                                    label={t('Sites compared')}
                                    value={stats.total_sites.toString()}
                                    tone="cyan"
                                />
                            </FadeIn>
                            <FadeIn delay={100}>
                                <StatCell
                                    icon={<Trophy className="h-3 w-3" />}
                                    label={t('Top performer')}
                                    value={stats.top_performer?.site_name ?? '—'}
                                    tone="emerald"
                                    smallValue
                                    subtitle={
                                        stats.top_performer
                                            ? `${t('composite')} ${stats.top_performer.composite} · ${stats.top_performer.uptime}% ${t('uptime')}`
                                            : undefined
                                    }
                                />
                            </FadeIn>
                            <FadeIn delay={150}>
                                <StatCell
                                    icon={<BarChart3 className="h-3 w-3" />}
                                    label={t('Fleet composite')}
                                    value={`${stats.fleet_composite}`}
                                    tone="amber"
                                    subtitle={`/100${stats.fleet_composite_delta !== null ? ` · ${stats.fleet_composite_delta > 0 ? '+' : ''}${stats.fleet_composite_delta}` : ''}`}
                                />
                            </FadeIn>
                            <FadeIn delay={200}>
                                <StatCell
                                    icon={<ArrowDown className="h-3 w-3" />}
                                    label={t('Needs attention')}
                                    value={stats.biggest_drop?.site_name ?? '—'}
                                    tone={stats.biggest_drop ? 'coral' : 'default'}
                                    smallValue
                                    subtitle={
                                        stats.biggest_drop
                                            ? `${t('composite')} ${stats.biggest_drop.composite} · ${stats.biggest_drop.alert_count} ${t('alerts')}`
                                            : undefined
                                    }
                                />
                            </FadeIn>
                        </div>

                        {/* ── Selection bar ─────────────────────────── */}
                        {selectedIds.size >= 1 && (
                            <FadeIn delay={0} duration={200}>
                                <div className="sticky top-[44px] z-20 flex flex-wrap items-center gap-4 rounded-xl border border-l-[3px] border-l-cyan-500 border-border bg-card p-4 shadow-elevation-1">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/15 font-display text-sm font-bold text-cyan-500">
                                        {selectedIds.size}
                                    </span>
                                    <div>
                                        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                                            {t('Sites selected')}
                                        </p>
                                        <p className="mt-0.5 text-xs font-semibold">
                                            {selectedSites.map((s) => s.site_name).join(' · ')}
                                        </p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-2">
                                        <Button variant="ghost" size="sm" onClick={clearSelection}>
                                            <X className="mr-1.5 h-3 w-3" />
                                            {t('Clear')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={selectedIds.size < 2}
                                            onClick={goHeadToHead}
                                        >
                                            <Scale className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Head-to-head')}
                                        </Button>
                                    </div>
                                </div>
                            </FadeIn>
                        )}

                        {/* ── Mode toggle ──────────────────────────── */}
                        <FadeIn delay={250}>
                            <div className="inline-flex gap-0.5 rounded-lg border border-border bg-muted/30 p-1">
                                <button
                                    type="button"
                                    onClick={() => setMode('ranking')}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-colors',
                                        mode === 'ranking'
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    {t('Ranking')}
                                    <span
                                        className={cn(
                                            'rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold',
                                            mode === 'ranking'
                                                ? 'bg-cyan-500/15 text-cyan-500'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {rankings.length}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => selectedIds.size >= 2 && setMode('headToHead')}
                                    disabled={selectedIds.size < 2}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-colors',
                                        mode === 'headToHead'
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                        selectedIds.size < 2 && 'cursor-not-allowed opacity-40',
                                    )}
                                >
                                    <Scale className="h-3.5 w-3.5" />
                                    {t('Head-to-head')}
                                    <span
                                        className={cn(
                                            'rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold',
                                            mode === 'headToHead'
                                                ? 'bg-cyan-500/15 text-cyan-500'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {selectedIds.size}
                                    </span>
                                </button>
                            </div>
                        </FadeIn>

                        {/* ── Head-to-head ─────────────────────────── */}
                        {mode === 'headToHead' && selectedSites.length >= 2 && (
                            <FadeIn delay={300} duration={400}>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-5 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-display text-base font-semibold tracking-tight">
                                                    {t('Head-to-head')} · {t('last :days days', { days })}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {t('Best value per metric is flagged. Add up to 4 sites from the ranking table below.')}
                                                </p>
                                            </div>
                                            <span
                                                className="shrink-0 rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-[9px] text-muted-foreground"
                                                title={weightsLabel}
                                            >
                                                {t('Composite weights')} ⓘ
                                            </span>
                                        </div>

                                        <HeadToHeadGrid sites={selectedSites} onRemove={toggleSite} t={t} />
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}

                        {/* ── Ranking table ────────────────────────── */}
                        <FadeIn delay={mode === 'headToHead' ? 400 : 300} duration={400}>
                            <Card className="shadow-elevation-1">
                                <CardContent className="p-6">
                                    <div className="mb-5">
                                        <p className="font-display text-base font-semibold tracking-tight">
                                            {t('Full ranking')} · {rankings.length} {t('sites')}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t('Sorted by composite score. Check any site to compare head-to-head.')}
                                        </p>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="w-10 px-2 py-2" />
                                                    <th className="w-12 px-2 py-2 text-left font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                                                        #
                                                    </th>
                                                    <th className="px-2 py-2 text-left font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                                                        {t('Site')}
                                                    </th>
                                                    {[
                                                        { key: 'composite', label: t('Composite') },
                                                        { key: 'uptime_pct', label: t('Uptime') },
                                                        { key: 'sla_pct', label: t('SLA') },
                                                        { key: 'mttr_minutes', label: t('MTTR') },
                                                        { key: 'alert_count', label: t('Alerts') },
                                                        { key: 'wo_completed', label: t('WOs') },
                                                    ].map((col) => (
                                                        <th
                                                            key={col.key}
                                                            className={cn(
                                                                'cursor-pointer px-2 py-2 text-right font-mono text-[9px] uppercase tracking-widest transition-colors hover:text-foreground',
                                                                sortKey === col.key
                                                                    ? 'text-cyan-500'
                                                                    : 'text-muted-foreground',
                                                            )}
                                                            onClick={() => handleSort(col.key)}
                                                        >
                                                            {col.label}
                                                            {sortKey === col.key && (
                                                                <span className="ml-0.5 text-[8px]">
                                                                    {sortDir === 'desc' ? '▼' : '▲'}
                                                                </span>
                                                            )}
                                                        </th>
                                                    ))}
                                                    <th className="w-16 px-2 py-2 text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                                                        {t('Trend')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sorted.map((site, idx) => {
                                                    const rank = idx + 1;
                                                    const isSelected = selectedIds.has(site.site_id);
                                                    const canSelect = isSelected || selectedIds.size < 4;
                                                    const cc = compositeColor(site.composite);
                                                    const mono = siteMonogram(site.site_name);

                                                    return (
                                                        <tr
                                                            key={site.site_id}
                                                            className={cn(
                                                                'cursor-pointer border-b border-border/40 transition-colors',
                                                                isSelected
                                                                    ? 'bg-cyan-500/[0.06]'
                                                                    : 'hover:bg-muted/30',
                                                            )}
                                                            onClick={() => canSelect && toggleSite(site.site_id)}
                                                        >
                                                            <td className="px-2 py-3 text-center">
                                                                <span
                                                                    className={cn(
                                                                        'inline-flex h-[18px] w-[18px] items-center justify-center rounded border transition-colors',
                                                                        isSelected
                                                                            ? 'border-cyan-500 bg-cyan-500'
                                                                            : canSelect
                                                                              ? 'border-border bg-background'
                                                                              : 'border-border/40 bg-background opacity-30',
                                                                    )}
                                                                >
                                                                    {isSelected && <Check className="h-3 w-3 text-background" />}
                                                                </span>
                                                            </td>
                                                            <td className="px-2 py-3">
                                                                <RankBadge rank={rank} total={sorted.length} />
                                                            </td>
                                                            <td className="px-2 py-3">
                                                                <div className="flex items-center gap-2.5">
                                                                    <span
                                                                        className={cn(
                                                                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-display text-[10px] font-bold',
                                                                            cc === 'good' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
                                                                            cc === 'ok' && 'border-cyan-500/25 bg-cyan-500/10 text-cyan-500',
                                                                            cc === 'warn' && 'border-amber-500/25 bg-amber-500/10 text-amber-500',
                                                                            cc === 'bad' && 'border-rose-500/25 bg-rose-500/10 text-rose-500',
                                                                        )}
                                                                    >
                                                                        {mono}
                                                                    </span>
                                                                    <div>
                                                                        <p className="text-[13px] font-semibold">{site.site_name}</p>
                                                                        <p className="font-mono text-[9px] text-muted-foreground">
                                                                            {site.segment ?? '—'} · {site.device_count} {t('devices')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-3 text-right">
                                                                <span className={cn('font-display text-base font-bold tabular-nums', COLOR_MAP[cc])}>
                                                                    {site.composite}
                                                                </span>
                                                            </td>
                                                            <td className={cn('px-2 py-3 text-right font-mono tabular-nums', metricTone(site.uptime_pct, { good: 99, warn: 95 }, true))}>
                                                                {site.uptime_pct}%
                                                            </td>
                                                            <td className={cn('px-2 py-3 text-right font-mono tabular-nums', metricTone(site.sla_pct, { good: 90, warn: 70 }, true))}>
                                                                {site.sla_pct}%
                                                            </td>
                                                            <td className={cn('px-2 py-3 text-right font-mono tabular-nums', site.mttr_minutes !== null ? metricTone(site.mttr_minutes, { good: 60, warn: 240 }, false) : 'text-muted-foreground')}>
                                                                {formatMinutes(site.mttr_minutes)}
                                                            </td>
                                                            <td className="px-2 py-3 text-right font-mono tabular-nums">
                                                                {site.alert_count}
                                                            </td>
                                                            <td className="px-2 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                                                {site.wo_completed}
                                                            </td>
                                                            <td className="px-2 py-3 text-center">
                                                                <MiniSparkline data={site.sparkline} color={STROKE_MAP[cc]} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </FadeIn>
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
    smallValue = false,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    tone?: 'cyan' | 'emerald' | 'amber' | 'coral' | 'default';
    subtitle?: string;
    smallValue?: boolean;
}) {
    const barClass = {
        cyan: 'before:bg-cyan-500',
        emerald: 'before:bg-emerald-500',
        amber: 'before:bg-amber-500',
        coral: 'before:bg-rose-500',
        default: 'before:bg-muted-foreground/40',
    }[tone];

    const valueClass = tone === 'coral' ? 'text-rose-500' : 'text-foreground';

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
                <p
                    className={cn(
                        'font-display mt-3 font-bold leading-none tracking-tight tabular-nums',
                        smallValue ? 'text-lg' : 'text-3xl',
                        valueClass,
                    )}
                >
                    {value}
                </p>
                {subtitle && <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">{subtitle}</p>}
            </CardContent>
        </Card>
    );
}

/* ── Rank badge ─────────────────────────────────────────────── */

function RankBadge({ rank, total }: { rank: number; total: number }) {
    const cls =
        rank === 1
            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950'
            : rank === 2
              ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800'
              : rank === 3
                ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                : rank === total
                  ? 'bg-rose-500/15 text-rose-500'
                  : 'bg-muted text-muted-foreground';

    return (
        <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full font-display text-[11px] font-bold tabular-nums', cls)}>
            {rank}
        </span>
    );
}

/* ── Mini sparkline ─────────────────────────────────────────── */

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
    const max = Math.max(...data, 1);
    const points = data
        .map((v, i) => {
            const x = (i / Math.max(data.length - 1, 1)) * 56;
            const y = 14 - (v / max) * 12;
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <svg viewBox="0 0 56 16" className="inline-block h-4 w-14" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" />
        </svg>
    );
}

/* ── Head-to-head grid ──────────────────────────────────────── */

interface MetricDef {
    key: string;
    label: string;
    icon: ReactNode;
    getValue: (s: SiteRanking) => number | null;
    format: (v: number | null) => string;
    unit?: string;
    higherIsBetter: boolean;
    showWinnerLoser: boolean;
}

function HeadToHeadGrid({
    sites,
    onRemove,
    t,
}: {
    sites: SiteRanking[];
    onRemove: (id: number) => void;
    t: (k: string, replacements?: Record<string, string | number>) => string;
}) {
    const metrics: MetricDef[] = [
        { key: 'uptime', label: t('Device uptime'), icon: <Cpu className="h-3 w-3" />, getValue: (s) => s.uptime_pct, format: (v) => v !== null ? `${v}%` : '—', higherIsBetter: true, showWinnerLoser: true },
        { key: 'sla', label: t('SLA compliance'), icon: <ShieldCheck className="h-3 w-3" />, getValue: (s) => s.sla_pct, format: (v) => v !== null ? `${v}%` : '—', higherIsBetter: true, showWinnerLoser: true },
        { key: 'mttr', label: t('MTTR'), icon: <Clock className="h-3 w-3" />, getValue: (s) => s.mttr_minutes, format: (v) => formatMinutes(v), higherIsBetter: false, showWinnerLoser: true },
        { key: 'alerts', label: t('Alerts'), icon: <AlertTriangle className="h-3 w-3" />, getValue: (s) => s.alert_count, format: (v) => v !== null ? String(v) : '—', higherIsBetter: false, showWinnerLoser: true },
        { key: 'wo', label: t('WOs completed'), icon: <FileText className="h-3 w-3" />, getValue: (s) => s.wo_completed, format: (v) => v !== null ? String(v) : '—', higherIsBetter: true, showWinnerLoser: false },
        { key: 'compliance', label: t('Compliance YTD'), icon: <ShieldCheck className="h-3 w-3" />, getValue: (s) => s.compliance_ytd_pct, format: (v) => v !== null ? `${v}%` : '—', higherIsBetter: true, showWinnerLoser: true },
        { key: 'devices', label: t('Devices'), icon: <Cpu className="h-3 w-3" />, getValue: (s) => s.device_count, format: (v) => v !== null ? String(v) : '—', higherIsBetter: true, showWinnerLoser: false },
    ];

    const colCount = sites.length;

    return (
        <div
            className="overflow-hidden rounded-lg border border-border"
            style={{ display: 'grid', gridTemplateColumns: `140px repeat(${colCount}, 1fr)` }}
        >
            {/* Header row */}
            <div className="flex items-center border-b border-border border-r border-r-border/40 bg-background px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {t('Site')}
            </div>
            {sites.map((site) => {
                const cc = compositeColor(site.composite);
                const circumference = Math.PI * 2 * 20;
                const offset = circumference * (1 - site.composite / 100);

                return (
                    <div
                        key={site.site_id}
                        className="relative border-b border-border border-r border-r-border/40 bg-background p-4 last:border-r-0"
                    >
                        <button
                            type="button"
                            onClick={() => onRemove(site.site_id)}
                            className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded border border-border text-muted-foreground hover:border-rose-500 hover:text-rose-500"
                        >
                            <X className="h-3 w-3" />
                        </button>
                        <p className="font-display text-base font-semibold">{site.site_name}</p>
                        {site.segment && (
                            <span className="mt-1 inline-block rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                                {site.segment}
                            </span>
                        )}
                        <div className="mt-3 flex items-center gap-3">
                            <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="4" />
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    fill="none"
                                    stroke={STROKE_MAP[cc]}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                />
                            </svg>
                            <div>
                                <p className={cn('font-display text-2xl font-bold tabular-nums', COLOR_MAP[cc])}>
                                    {site.composite}
                                </p>
                                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                                    {t('Composite')}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Metric rows */}
            {metrics.map((metric, mIdx) => {
                const values = sites.map((s) => metric.getValue(s));
                const numericValues = values.filter((v): v is number => v !== null);
                const best = metric.higherIsBetter ? Math.max(...numericValues) : Math.min(...numericValues);
                const worst = metric.higherIsBetter ? Math.min(...numericValues) : Math.max(...numericValues);
                const isLast = mIdx === metrics.length - 1;

                return [
                    <div
                        key={`label-${metric.key}`}
                        className={cn(
                            'flex items-center gap-2 border-r border-r-border/40 bg-muted/20 px-4 py-3 font-mono text-[10px] font-medium text-muted-foreground',
                            !isLast && 'border-b border-b-border/40',
                        )}
                    >
                        {metric.icon}
                        {metric.label}
                    </div>,
                    ...sites.map((site, sIdx) => {
                        const val = metric.getValue(site);
                        const isBest = metric.showWinnerLoser && val !== null && val === best && numericValues.length >= 2;
                        const isWorst = metric.showWinnerLoser && val !== null && val === worst && val !== best && numericValues.length >= 2;

                        return (
                            <div
                                key={`${metric.key}-${site.site_id}`}
                                className={cn(
                                    'flex items-center justify-between gap-2 border-r border-r-border/40 px-4 py-3 last:border-r-0',
                                    !isLast && 'border-b border-b-border/40',
                                )}
                            >
                                <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                                    {metric.format(val)}
                                </span>
                                {isBest && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                                        <Check className="h-2.5 w-2.5" />
                                        {t('Wins')}
                                    </span>
                                )}
                                {isWorst && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-rose-500">
                                        {t('Behind')}
                                    </span>
                                )}
                            </div>
                        );
                    }),
                ];
            })}
        </div>
    );
}
