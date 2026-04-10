import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/fade-in';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    CheckCircle,
    ChevronRight,
    Clock,
    FileText,
    ShieldCheck,
    Wrench,
    X,
} from 'lucide-react';
import { useState } from 'react';

interface TimelineEvent {
    type: string;
    timestamp: string;
    title: string;
    description: string;
    severity: string | null;
    link: string | null;
    meta: Record<string, string>;
}

interface Props {
    site: { id: number; name: string };
    events: TimelineEvent[];
    totalEvents: number;
    zones: string[];
    filters: { from: string; to: string; type: string | null; zone: string | null };
}

const EVENT_ICONS: Record<string, { icon: typeof AlertTriangle; color: string }> = {
    alert_triggered: { icon: AlertTriangle, color: 'text-red-500' },
    alert_resolved: { icon: CheckCircle, color: 'text-emerald-500' },
    work_order: { icon: Wrench, color: 'text-violet-500' },
    corrective_action: { icon: ShieldCheck, color: 'text-teal-500' },
    activity: { icon: FileText, color: 'text-muted-foreground' },
};

export default function SiteTimeline({ site, events, totalEvents, zones, filters }: Props) {
    const { t } = useLang();
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/dashboard' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Timeline', href: '#' },
    ];

    const hasActiveFilters = !!(filters.type || filters.zone);

    function clearAllFilters() {
        router.get(`/sites/${site.id}/timeline`, { from, to }, { preserveState: true, replace: true });
    }

    function applyFilters(overrides: Record<string, string | null> = {}) {
        const params: Record<string, string> = { from, to };
        const type = overrides.type ?? filters.type;
        const zone = overrides.zone ?? filters.zone;
        if (type && type !== 'all') params.type = type;
        if (zone && zone !== 'all') params.zone = zone;
        router.get(`/sites/${site.id}/timeline`, params, { preserveState: true, replace: true });
    }

    // Group events by hour
    const grouped = events.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
        const hour = new Date(event.timestamp).toISOString().slice(0, 13) + ':00';
        if (!acc[hour]) acc[hour] = [];
        acc[hour].push(event);
        return acc;
    }, {});

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${site.name} — ${t('Timeline')}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative p-6 md:p-8">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Site Timeline')}
                            </p>
                            <h1 className="mt-1.5 font-display text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                {site.name}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                <span className="font-mono font-medium tabular-nums text-foreground">{totalEvents}</span>{' '}
                                {t('events from')}{' '}
                                <span className="font-mono tabular-nums">{filters.from}</span>{' '}
                                {t('to')}{' '}
                                <span className="font-mono tabular-nums">{filters.to}</span>
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Filters ─────────────────────────────────────── */}
                <FadeIn delay={80} duration={500}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="space-y-3 p-4">
                            {/* Date range row */}
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t('Period')}</span>
                                <DatePicker
                                    date={from ? new Date(from + 'T00:00:00') : undefined}
                                    onDateChange={(d) => setFrom(d ? format(d, 'yyyy-MM-dd') : '')}
                                    placeholder={t('From')}
                                    className="w-full sm:w-auto"
                                />
                                <span className="hidden text-xs text-muted-foreground/40 sm:inline">—</span>
                                <DatePicker
                                    date={to ? new Date(to + 'T00:00:00') : undefined}
                                    onDateChange={(d) => setTo(d ? format(d, 'yyyy-MM-dd') : '')}
                                    placeholder={t('To')}
                                    className="w-full sm:w-auto"
                                />
                                <Button variant="secondary" size="sm" onClick={() => applyFilters()}>
                                    {t('Apply')}
                                </Button>
                            </div>
                            {/* Category filters row */}
                            <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-3">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t('Filter')}</span>
                                <Select value={filters.type ?? 'all'} onValueChange={(v) => applyFilters({ type: v })}>
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue placeholder={t('Event type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All types')}</SelectItem>
                                        <SelectItem value="alert">{t('Alerts')}</SelectItem>
                                        <SelectItem value="work_order">{t('Work Orders')}</SelectItem>
                                        <SelectItem value="corrective_action">{t('Corrective Actions')}</SelectItem>
                                        <SelectItem value="activity">{t('Activity Log')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {zones.length > 0 && (
                                    <Select value={filters.zone ?? 'all'} onValueChange={(v) => applyFilters({ zone: v })}>
                                        <SelectTrigger className="w-[160px]">
                                            <SelectValue placeholder={t('Zone')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All zones')}</SelectItem>
                                            {zones.map((z) => (
                                                <SelectItem key={z} value={z}>{z}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                {hasActiveFilters && (
                                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={clearAllFilters}>
                                        <X className="mr-1 h-3 w-3" /> {t('Clear filters')}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* ── Timeline ────────────────────────────────────── */}
                <FadeIn delay={160} duration={500}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Events')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {events.length}
                            </span>
                        </div>

                        {events.length === 0 ? (
                            <Card className="shadow-elevation-1">
                                <CardContent className="py-12 text-center">
                                    <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                                    <p className="font-medium">{t('No events in this date range')}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{t('Try expanding the date range or clearing filters')}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(grouped).map(([hour, hourEvents]) => (
                                    <div key={hour}>
                                        <h3 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                            {new Date(hour).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            <span className="mx-2 text-border">—</span>
                                            {new Date(hour).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </h3>
                                        <div className="relative ml-3 space-y-3 border-l border-border/60 pl-7">
                                            {hourEvents.map((event, i) => {
                                                const config = EVENT_ICONS[event.type] ?? EVENT_ICONS.activity;
                                                const Icon = config.icon;

                                                return (
                                                    <div key={`${hour}-${i}`} className="group relative">
                                                        {/* Dot — centered on the border-l line */}
                                                        <div className="absolute -left-[29.5px] top-3.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-card">
                                                            <Icon className={cn('h-3.5 w-3.5', config.color)} />
                                                        </div>
                                                        <Card className={cn(
                                                            'border-border/50 shadow-none transition-all hover:border-border hover:shadow-elevation-1',
                                                            event.link && 'cursor-pointer',
                                                        )}
                                                        onClick={event.link ? () => router.get(event.link!) : undefined}>
                                                            <CardContent className="flex items-center gap-3 p-3.5">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-[13px] font-medium">{event.title}</p>
                                                                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">{event.description}</p>
                                                                </div>
                                                                <div className="flex shrink-0 items-center gap-2">
                                                                    {event.severity && (
                                                                        <Badge variant={
                                                                            event.severity === 'critical' ? 'destructive' :
                                                                            event.severity === 'high' || event.severity === 'urgent' ? 'warning' :
                                                                            'outline'
                                                                        } className="text-[9px]">
                                                                            {event.severity}
                                                                        </Badge>
                                                                    )}
                                                                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                                                                        {new Date(event.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    {event.link && (
                                                                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

/* ── Skeleton ─────────────────────────────────────────────────────── */

export function SiteTimelineSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header skeleton */}
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-elevation-1 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-9 w-56" />
                <Skeleton className="mt-2 h-4 w-40" />
            </div>
            {/* Filters skeleton */}
            <Card className="shadow-elevation-1">
                <CardContent className="p-3">
                    <div className="flex flex-wrap gap-3">
                        <Skeleton className="h-9 w-[150px]" />
                        <Skeleton className="h-9 w-[150px]" />
                        <Skeleton className="h-9 w-[80px]" />
                        <Skeleton className="h-9 w-[160px]" />
                    </div>
                </CardContent>
            </Card>
            {/* Timeline skeleton */}
            <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>
                        <Skeleton className="mb-3 h-4 w-48" />
                        <div className="ml-4 space-y-3 border-l-2 border-border pl-6">
                            {Array.from({ length: 3 }).map((_, j) => (
                                <Skeleton key={j} className="h-16 w-full rounded-xl" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
