import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
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
    Activity as ActivityIcon,
    AlertTriangle,
    ArrowRight,
    ChevronDown,
    Clock,
    Download,
    FilePlus,
    FileText,
    Flame,
    Grid3x3,
    Layers,
    MapPin,
    Pencil,
    Search,
    Trash2,
    UserCircle2,
    Users,
    X,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

/* ── Types ──────────────────────────────────────────────────── */

interface ActivityRow {
    id: number;
    log_name: string | null;
    description: string;
    event: 'created' | 'updated' | 'deleted' | string | null;
    subject_type: string | null;
    subject_id: number | null;
    subject_label: string | null;
    causer_id: number | null;
    causer_name: string | null;
    causer_email: string | null;
    causer_initials: string;
    properties: Record<string, unknown>;
    batch_uuid: string | null;
    created_at: string | null;
    is_flagged: boolean;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface ActivitiesPage {
    data: ActivityRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface Filters {
    causer: string | null;
    subject_type: string | null;
    subject_id: string | null;
    event: string | null;
    search: string | null;
    flagged: boolean | null;
    range: '24h' | '7d' | '30d' | 'all';
}

interface Stats {
    total: number;
    total_delta_pct: number | null;
    unique_actors: number;
    total_users: number;
    most_active_type: string | null;
    most_active_count: number;
    deletions: number;
    sparkline: number[];
}

interface CauserOption {
    id: number;
    name: string;
    count: number;
}

interface SubjectTypeOption {
    value: string;
    label: string;
    count: number;
}

interface Options {
    causers: CauserOption[];
    subject_types: SubjectTypeOption[];
}

interface Props {
    activities: ActivitiesPage;
    filters: Filters;
    event_counts: Record<string, number>;
    flagged_count: number;
    stats: Stats;
    options: Options;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics', href: '#' },
    { title: 'Activity', href: '/activity-log' },
];

const EVENT_TYPES = ['created', 'updated', 'deleted'] as const;

/* ── Helpers ────────────────────────────────────────────────── */

function classBasename(fqcn: string | null): string {
    if (!fqcn) return '—';
    const parts = fqcn.split('\\');
    return parts[parts.length - 1] || fqcn;
}

function humanizeType(fqcn: string | null): string {
    const base = classBasename(fqcn);
    return base.replace(/([A-Z])/g, ' $1').trim();
}

function formatTimeOnly(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

function formatDayLabel(
    iso: string,
    t: (k: string) => string,
): { label: string; meta: string; isToday: boolean; isYesterday: boolean } {
    const date = new Date(iso);
    date.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.getTime() === today.getTime();
    const isYesterday = date.getTime() === yesterday.getTime();

    let label: string;
    if (isToday) label = t('Today');
    else if (isYesterday) label = t('Yesterday');
    else
        label = date.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });

    const meta = new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });

    return { label, meta, isToday, isYesterday };
}

function groupByDay(rows: ActivityRow[]): Array<{ key: string; iso: string; items: ActivityRow[] }> {
    const groups = new Map<string, { iso: string; items: ActivityRow[] }>();
    for (const row of rows) {
        if (!row.created_at) continue;
        const date = new Date(row.created_at);
        const key = date.toISOString().split('T')[0];
        if (!groups.has(key)) {
            groups.set(key, { iso: row.created_at, items: [] });
        }
        groups.get(key)!.items.push(row);
    }
    return Array.from(groups.entries()).map(([key, { iso, items }]) => ({ key, iso, items }));
}

function extractFieldChanges(
    properties: Record<string, unknown>,
): Array<{ field: string; old: unknown; new: unknown }> {
    const changes: Array<{ field: string; old: unknown; new: unknown }> = [];

    const attributes = properties.attributes as Record<string, unknown> | undefined;
    const old = properties.old as Record<string, unknown> | undefined;

    if (attributes && old) {
        for (const key of Object.keys(attributes)) {
            if (JSON.stringify(attributes[key]) !== JSON.stringify(old[key])) {
                changes.push({ field: key, old: old[key], new: attributes[key] });
            }
        }
    } else if (attributes) {
        for (const [field, value] of Object.entries(attributes)) {
            changes.push({ field, old: null, new: value });
        }
    }

    return changes;
}

function formatFieldName(field: string): string {
    return field
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value);
    const str = String(value);
    return str.length > 72 ? str.slice(0, 72) + '…' : str;
}

function cleanPaginatorLabel(label: string): string {
    // Laravel's paginator returns HTML entities; map to simple arrows and decode text.
    return label
        .replace(/&laquo;/g, '‹')
        .replace(/&raquo;/g, '›')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/Previous/i, '‹')
        .replace(/Next/i, '›');
}

const SUBJECT_ICONS: Record<string, { icon: typeof MapPin; tone: string }> = {
    Site: { icon: MapPin, tone: 'text-emerald-500' },
    Device: { icon: Grid3x3, tone: 'text-cyan-500' },
    User: { icon: UserCircle2, tone: 'text-violet-500' },
    WorkOrder: { icon: FileText, tone: 'text-amber-500' },
    Alert: { icon: Flame, tone: 'text-rose-500' },
    AlertRule: { icon: AlertTriangle, tone: 'text-amber-500' },
    Organization: { icon: Layers, tone: 'text-muted-foreground' },
    Gateway: { icon: ActivityIcon, tone: 'text-cyan-500' },
    MaintenanceWindow: { icon: Clock, tone: 'text-cyan-500' },
    CorrectiveAction: { icon: FileText, tone: 'text-amber-500' },
    Module: { icon: Layers, tone: 'text-muted-foreground' },
};

/* ── Main Component ─────────────────────────────────────────── */

export default function ActivityLogPage({
    activities,
    filters,
    event_counts,
    flagged_count,
    stats,
    options,
}: Props) {
    const { t } = useLang();
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [searchDraft, setSearchDraft] = useState<string>(filters.search ?? '');

    const groups = useMemo(() => groupByDay(activities.data), [activities.data]);
    const hasFilters =
        !!filters.causer ||
        !!filters.subject_type ||
        !!filters.subject_id ||
        !!filters.event ||
        !!filters.search ||
        !!filters.flagged;

    const updateFilter = (key: keyof Filters, value: string | boolean | null) => {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(filters)) {
            if (v !== null && v !== undefined && v !== '' && v !== false) next[k] = String(v);
        }
        if (value === true) next[key] = '1';
        else if (value && value !== '') next[key] = String(value);
        else delete next[key];
        delete next.page;
        router.get('/activity-log', next, { preserveState: true, replace: true });
    };

    const clearAllFilters = () => {
        router.get(
            '/activity-log',
            { range: filters.range },
            { preserveState: true, replace: true },
        );
        setSearchDraft('');
    };

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilter('search', searchDraft.trim() || null);
    };

    const exportCsv = () => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(filters)) {
            if (v === null || v === undefined || v === '' || v === false) continue;
            params.set(k, v === true ? '1' : String(v));
        }
        window.location.href = `/activity-log/export?${params.toString()}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Activity')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Hero ───────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
                            <div className="max-w-2xl">
                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Audit Chronicle')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Activity')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t(
                                        'Every change, every login, every delete — recorded with actor, subject, and full diff. The source of truth for compliance audits and forensic review.',
                                    )}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <ButtonGroup>
                                    {(['24h', '7d', '30d', 'all'] as const).map((r) => (
                                        <Button
                                            key={r}
                                            variant={filters.range === r ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => updateFilter('range', r)}
                                        >
                                            <span className="font-mono tabular-nums uppercase">{r}</span>
                                        </Button>
                                    ))}
                                </ButtonGroup>
                                <Button variant="outline" size="sm" onClick={exportCsv}>
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Export CSV')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Stat strip ────────────────────────────────── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FadeIn delay={50} duration={400}>
                        <StatCell
                            icon={<ActivityIcon className="h-3 w-3" />}
                            label={t('Events')}
                            value={stats.total.toLocaleString()}
                            tone="cyan"
                            subtitle={
                                stats.total_delta_pct !== null
                                    ? `${stats.total_delta_pct > 0 ? '+' : ''}${stats.total_delta_pct}% ${t('vs previous')}`
                                    : `${t('range')}: ${filters.range.toUpperCase()}`
                            }
                            sparkline={stats.sparkline}
                        />
                    </FadeIn>
                    <FadeIn delay={100} duration={400}>
                        <StatCell
                            icon={<Users className="h-3 w-3" />}
                            label={t('Unique actors')}
                            value={stats.unique_actors.toString()}
                            tone="emerald"
                            subtitle={`${t('of')} ${stats.total_users} ${t('users total')}`}
                        />
                    </FadeIn>
                    <FadeIn delay={150} duration={400}>
                        <StatCell
                            icon={<Layers className="h-3 w-3" />}
                            label={t('Most active entity')}
                            value={classBasename(stats.most_active_type)}
                            tone="amber"
                            smallValue
                            subtitle={
                                stats.most_active_count > 0
                                    ? `${stats.most_active_count} ${t('events')}`
                                    : t('no activity')
                            }
                        />
                    </FadeIn>
                    <FadeIn delay={200} duration={400}>
                        <StatCell
                            icon={<Trash2 className="h-3 w-3" />}
                            label={t('Deletions')}
                            value={stats.deletions.toString()}
                            tone={stats.deletions > 0 ? 'coral' : 'default'}
                            subtitle={
                                stats.deletions > 0
                                    ? t('review for compliance')
                                    : t('none in this window')
                            }
                        />
                    </FadeIn>
                </div>

                {/* ── Filter bar ────────────────────────────────── */}
                <FadeIn delay={250} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="flex flex-col gap-3 p-4 md:p-5">
                            {/* Event pills */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
                                    {t('Event')}
                                </span>
                                <EventPill
                                    active={!filters.event}
                                    label={t('All')}
                                    count={event_counts.all ?? 0}
                                    onClick={() => updateFilter('event', null)}
                                />
                                {EVENT_TYPES.map((ev) => (
                                    <EventPill
                                        key={ev}
                                        active={filters.event === ev}
                                        event={ev}
                                        label={t(ev.charAt(0).toUpperCase() + ev.slice(1))}
                                        count={event_counts[ev] ?? 0}
                                        onClick={() => updateFilter('event', filters.event === ev ? null : ev)}
                                    />
                                ))}
                                <div className="mx-1 h-5 w-px bg-border" />
                                <button
                                    type="button"
                                    onClick={() => updateFilter('flagged', filters.flagged ? null : true)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] capitalize transition-colors',
                                        filters.flagged
                                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-500'
                                            : 'border-border text-muted-foreground hover:border-rose-500/40 hover:text-rose-500',
                                    )}
                                    title={t('Show only hard-deletes of User / Organization / Site')}
                                >
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>{t('Flagged only')}</span>
                                    <span className="rounded bg-background/50 px-1 py-0.5 text-[9px] font-semibold">
                                        {flagged_count.toLocaleString()}
                                    </span>
                                </button>
                            </div>

                            {/* Refine row */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
                                    {t('Refine')}
                                </span>

                                <Select
                                    value={filters.causer ?? 'all'}
                                    onValueChange={(v) => updateFilter('causer', v === 'all' ? null : v)}
                                >
                                    <SelectTrigger className="h-8 w-44 text-xs">
                                        <SelectValue placeholder={t('All actors')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All actors')}</SelectItem>
                                        {options.causers.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name} ({c.count})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.subject_type ?? 'all'}
                                    onValueChange={(v) =>
                                        updateFilter('subject_type', v === 'all' ? null : v)
                                    }
                                >
                                    <SelectTrigger className="h-8 w-44 text-xs">
                                        <SelectValue placeholder={t('All entities')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All entities')}</SelectItem>
                                        {options.subject_types.map((st) => (
                                            <SelectItem key={st.value} value={st.value}>
                                                {st.label} ({st.count})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <form onSubmit={submitSearch} className="relative flex min-w-[220px] flex-1">
                                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={searchDraft}
                                        onChange={(e) => setSearchDraft(e.target.value)}
                                        placeholder={t('Search description or entity type…')}
                                        className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none"
                                    />
                                </form>

                                {hasFilters && (
                                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 text-xs">
                                        {t('Clear')}
                                    </Button>
                                )}
                            </div>

                            {/* Active chips */}
                            {hasFilters && (
                                <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
                                        {t('Active')}
                                    </span>
                                    {filters.event && (
                                        <FilterChip
                                            label={`${t('event')}: ${filters.event}`}
                                            onRemove={() => updateFilter('event', null)}
                                        />
                                    )}
                                    {filters.causer && (
                                        <FilterChip
                                            label={`${t('actor')}: ${
                                                options.causers.find((c) => String(c.id) === filters.causer)?.name ??
                                                filters.causer
                                            }`}
                                            onRemove={() => updateFilter('causer', null)}
                                        />
                                    )}
                                    {filters.subject_type && (
                                        <FilterChip
                                            label={`${t('entity')}: ${classBasename(filters.subject_type)}`}
                                            onRemove={() => updateFilter('subject_type', null)}
                                        />
                                    )}
                                    {filters.subject_id && (
                                        <FilterChip
                                            label={`${t('id')}: #${filters.subject_id}`}
                                            onRemove={() => updateFilter('subject_id', null)}
                                        />
                                    )}
                                    {filters.search && (
                                        <FilterChip
                                            label={`${t('search')}: "${filters.search}"`}
                                            onRemove={() => {
                                                setSearchDraft('');
                                                updateFilter('search', null);
                                            }}
                                        />
                                    )}
                                    {filters.flagged && (
                                        <FilterChip
                                            label={t('flagged only')}
                                            onRemove={() => updateFilter('flagged', null)}
                                        />
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* ── Activity stream ───────────────────────────── */}
                <FadeIn delay={300} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-6">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {activities.total.toLocaleString()} {t('matching events')}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t(
                                            'Grouped by day. Click a row to see full context and diff. Click the subject pill to jump to that entity.',
                                        )}
                                    </p>
                                </div>
                            </div>

                            {activities.data.length === 0 ? (
                                <EmptyState
                                    icon={<ActivityIcon className="h-5 w-5 text-muted-foreground" />}
                                    title={t('No activity found')}
                                    description={t(
                                        'No events match the current filters. Try clearing filters or expanding the date range.',
                                    )}
                                />
                            ) : (
                                <div className="space-y-6">
                                    {groups.map((group) => (
                                        <div key={group.key}>
                                            <DayHeader iso={group.iso} count={group.items.length} t={t} />
                                            <div className="space-y-1">
                                                {group.items.map((row) => (
                                                    <ActivityRowView
                                                        key={row.id}
                                                        row={row}
                                                        expanded={expandedId === row.id}
                                                        onToggle={() =>
                                                            setExpandedId(expandedId === row.id ? null : row.id)
                                                        }
                                                        t={t}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {activities.last_page > 1 && (
                                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                                    <p className="font-mono text-[10px] text-muted-foreground">
                                        {t('Showing')}{' '}
                                        <strong className="text-foreground">
                                            {activities.from ?? 0}–{activities.to ?? 0}
                                        </strong>{' '}
                                        {t('of')}{' '}
                                        <strong className="text-foreground">{activities.total.toLocaleString()}</strong>
                                        {' · '}
                                        {t('page')}{' '}
                                        <strong className="text-foreground">{activities.current_page}</strong>{' '}
                                        {t('of')}{' '}
                                        <strong className="text-foreground">{activities.last_page}</strong>
                                    </p>
                                    <Paginator links={activities.links} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>
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
    sparkline,
    smallValue = false,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    tone?: 'cyan' | 'emerald' | 'amber' | 'coral' | 'default';
    subtitle?: string;
    sparkline?: number[];
    smallValue?: boolean;
}) {
    const barClass = {
        cyan: 'before:bg-cyan-500',
        emerald: 'before:bg-emerald-500',
        amber: 'before:bg-amber-500',
        coral: 'before:bg-rose-500',
        default: 'before:bg-muted-foreground/40',
    }[tone];

    const valueClass = {
        cyan: 'text-foreground',
        emerald: 'text-foreground',
        amber: 'text-foreground',
        coral: 'text-rose-500',
        default: 'text-foreground',
    }[tone];

    const sparkColor = {
        cyan: 'bg-cyan-500',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        coral: 'bg-rose-500',
        default: 'bg-muted-foreground/50',
    }[tone];

    const max = sparkline ? Math.max(...sparkline, 1) : 1;

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
                {subtitle && <p className="mt-2 font-mono text-[10px] text-muted-foreground">{subtitle}</p>}
                {sparkline && sparkline.length > 0 && (
                    <div className="mt-3 flex h-5 items-end gap-0.5">
                        {sparkline.map((v, i) => (
                            <div
                                key={i}
                                className={cn('flex-1 rounded-sm opacity-60 transition-opacity hover:opacity-100', sparkColor)}
                                style={{ height: `${Math.max((v / max) * 100, 8)}%` }}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ── Event pill ─────────────────────────────────────────────── */

function EventPill({
    active,
    event,
    label,
    count,
    onClick,
}: {
    active: boolean;
    event?: 'created' | 'updated' | 'deleted';
    label: string;
    count: number;
    onClick: () => void;
}) {
    const eventStyle = {
        created: active
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
            : 'border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500',
        updated: active
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
            : 'border-border text-muted-foreground hover:border-amber-500/40 hover:text-amber-500',
        deleted: active
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-500'
            : 'border-border text-muted-foreground hover:border-rose-500/40 hover:text-rose-500',
    };

    const allStyle = active
        ? 'border-primary/40 bg-primary/10 text-primary'
        : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground';

    const icon = event === 'created' ? (
        <FilePlus className="h-3 w-3" />
    ) : event === 'updated' ? (
        <Pencil className="h-3 w-3" />
    ) : event === 'deleted' ? (
        <Trash2 className="h-3 w-3" />
    ) : null;

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] capitalize transition-colors',
                event ? eventStyle[event] : allStyle,
            )}
        >
            {icon}
            <span>{label}</span>
            <span className="rounded bg-background/50 px-1 py-0.5 text-[9px] font-semibold">
                {count.toLocaleString()}
            </span>
        </button>
    );
}

/* ── Filter chip ────────────────────────────────────────────── */

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 font-mono text-[10px] text-foreground">
            {label}
            <button
                type="button"
                onClick={onRemove}
                className="text-muted-foreground hover:text-rose-500"
                aria-label="Remove filter"
            >
                <X className="h-3 w-3" />
            </button>
        </span>
    );
}

/* ── Day header ─────────────────────────────────────────────── */

function DayHeader({
    iso,
    count,
    t,
}: {
    iso: string;
    count: number;
    t: (k: string) => string;
}) {
    const { label, meta, isToday } = formatDayLabel(iso, t);

    return (
        <div className="sticky top-0 z-10 mb-3 flex items-center gap-3 bg-card py-2">
            <div className="flex items-center gap-2">
                {isToday && (
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                )}
                <span className={cn('font-display text-sm font-semibold', isToday ? 'text-foreground' : 'text-muted-foreground')}>
                    {label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                    {meta} · {count} {count === 1 ? t('event') : t('events')}
                </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>
    );
}

/* ── Activity row ───────────────────────────────────────────── */

function ActivityRowView({
    row,
    expanded,
    onToggle,
    t,
}: {
    row: ActivityRow;
    expanded: boolean;
    onToggle: () => void;
    t: (k: string) => string;
}) {
    const changes = useMemo(() => extractFieldChanges(row.properties), [row.properties]);

    const eventStyle = {
        created: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
        updated: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
        deleted: 'border-rose-500/30 bg-rose-500/10 text-rose-500',
    }[row.event as 'created' | 'updated' | 'deleted'] ?? 'border-border bg-muted text-muted-foreground';

    const eventIcon = row.event === 'created' ? (
        <FilePlus className="h-3.5 w-3.5" />
    ) : row.event === 'updated' ? (
        <Pencil className="h-3.5 w-3.5" />
    ) : row.event === 'deleted' ? (
        <Trash2 className="h-3.5 w-3.5" />
    ) : (
        <ActivityIcon className="h-3.5 w-3.5" />
    );

    const actor = row.causer_name ?? t('System');
    const verb = {
        created: t('created'),
        updated: t('updated'),
        deleted: t('deleted'),
    }[row.event as 'created' | 'updated' | 'deleted'] ?? t('changed');

    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    'group grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    row.is_flagged
                        ? 'border-l-[3px] border-l-rose-500 border-border/60 bg-rose-500/[0.02]'
                        : expanded
                          ? 'border-border bg-muted/30'
                          : 'border-border/60 bg-muted/20 hover:bg-muted/30',
                )}
            >
                {/* Event icon */}
                <div
                    className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded border',
                        eventStyle,
                    )}
                >
                    {eventIcon}
                </div>

                {/* Body */}
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <ActorBadge name={actor} initials={row.causer_initials} isSystem={!row.causer_name} />
                        <span className="text-muted-foreground">{verb}</span>
                        {row.subject_type && <SubjectPill row={row} />}
                        {row.is_flagged && (
                            <span className="inline-flex items-center rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-rose-500">
                                {t('Flagged')}
                            </span>
                        )}
                    </div>
                    {row.description && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{row.description}</p>
                    )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    {changes.length > 0 && row.event === 'updated' && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-semibold text-amber-500">
                            {changes.length} {changes.length === 1 ? t('field') : t('fields')}
                        </span>
                    )}
                    <span>{formatTimeOnly(row.created_at)}</span>
                </div>

                {/* Chevron */}
                <ChevronDown
                    className={cn(
                        'h-3.5 w-3.5 text-muted-foreground transition-transform',
                        expanded && 'rotate-180 text-cyan-500',
                    )}
                />
            </button>

            {expanded && (
                <div className="ml-[42px] mr-0 -mt-px rounded-b-lg border border-t-0 border-border bg-background/40 p-4">
                    {/* Metadata grid */}
                    <div className="mb-4 grid gap-4 border-b border-border/60 pb-4 sm:grid-cols-3">
                        <DetailBlock
                            label={t('Actor')}
                            primary={actor}
                            secondary={
                                row.causer_email ??
                                (row.causer_id ? `${t('user id')} ${row.causer_id}` : t('non-user event'))
                            }
                        />
                        <DetailBlock
                            label={t('Subject')}
                            primary={
                                row.subject_type
                                    ? `${classBasename(row.subject_type)}${row.subject_id ? ` #${row.subject_id}` : ''}`
                                    : '—'
                            }
                            secondary={row.subject_label ?? t('no label')}
                        />
                        <DetailBlock
                            label={t('Context')}
                            primary={row.log_name ?? 'default'}
                            secondary={
                                row.batch_uuid
                                    ? `${t('batch')} ${row.batch_uuid.slice(0, 8)}`
                                    : t('single event')
                            }
                        />
                    </div>

                    {/* Diff table */}
                    {changes.length > 0 ? (
                        <>
                            <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {row.event === 'created' ? t('Initial values') : t('Field changes')}
                            </p>
                            <div className="space-y-1">
                                {changes.map((change, idx) => (
                                    <div
                                        key={`${change.field}-${idx}`}
                                        className="grid grid-cols-[minmax(120px,160px)_1fr_20px_1fr] items-center gap-2 rounded border border-border/60 bg-muted/20 px-3 py-2 font-mono text-[10.5px]"
                                    >
                                        <span className="text-muted-foreground">{formatFieldName(change.field)}</span>
                                        {row.event === 'updated' ? (
                                            <>
                                                <span className="truncate rounded bg-rose-500/10 px-2 py-1 text-rose-500 line-through opacity-80">
                                                    {formatValue(change.old)}
                                                </span>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                <span className="truncate rounded bg-emerald-500/10 px-2 py-1 text-emerald-500">
                                                    {formatValue(change.new)}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="col-span-3 truncate rounded bg-muted/40 px-2 py-1 text-foreground">
                                                    {formatValue(change.new)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-[11px] italic text-muted-foreground">{t('No field changes recorded for this event.')}</p>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                        {row.subject_type && row.subject_id && (
                            <Link
                                href={`/activity-log?subject_type=${encodeURIComponent(row.subject_type)}&subject_id=${row.subject_id}`}
                                className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-cyan-500 hover:text-cyan-500"
                            >
                                <Layers className="h-3 w-3" />
                                {t('Entity history')}
                            </Link>
                        )}
                        {row.causer_id && (
                            <Link
                                href={`/activity-log?causer=${row.causer_id}`}
                                className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-cyan-500 hover:text-cyan-500"
                            >
                                <UserCircle2 className="h-3 w-3" />
                                {t('Actor history')}
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

/* ── Actor badge ────────────────────────────────────────────── */

function ActorBadge({
    name,
    initials,
    isSystem,
}: {
    name: string;
    initials: string;
    isSystem: boolean;
}) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span
                className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-display text-[9px] font-bold',
                    isSystem
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-gradient-to-br from-cyan-500 to-violet-500 text-background',
                )}
            >
                {isSystem ? '⚙' : initials}
            </span>
            <span className="font-semibold text-foreground">{name}</span>
        </span>
    );
}

/* ── Subject pill ───────────────────────────────────────────── */

function SubjectPill({ row }: { row: ActivityRow }) {
    const base = classBasename(row.subject_type);
    const { icon: Icon, tone } = SUBJECT_ICONS[base] ?? {
        icon: Layers,
        tone: 'text-muted-foreground',
    };

    return (
        <Link
            href={
                row.subject_type && row.subject_id
                    ? `/activity-log?subject_type=${encodeURIComponent(row.subject_type)}&subject_id=${row.subject_id}`
                    : '#'
            }
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded border border-border bg-background/60 px-2 py-0.5 font-mono text-[10px] text-foreground hover:border-cyan-500"
        >
            <Icon className={cn('h-3 w-3', tone)} />
            <span>{humanizeType(row.subject_type)}</span>
            {row.subject_id && <span className="text-muted-foreground">#{row.subject_id}</span>}
        </Link>
    );
}

/* ── Detail block ───────────────────────────────────────────── */

function DetailBlock({
    label,
    primary,
    secondary,
}: {
    label: string;
    primary: string;
    secondary?: string;
}) {
    return (
        <div>
            <p className="font-mono text-[8px] font-semibold uppercase tracking-widest text-muted-foreground">
                {label}
            </p>
            <p className="mt-1 font-mono text-[11px] text-foreground">{primary}</p>
            {secondary && <p className="font-mono text-[10px] text-muted-foreground">{secondary}</p>}
        </div>
    );
}

/* ── Paginator ──────────────────────────────────────────────── */

function Paginator({ links }: { links: PaginationLink[] }) {
    if (!links || links.length === 0) return null;

    const goto = (url: string | null) => {
        if (url) router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <div className="flex items-center gap-1">
            {links.map((link, i) => (
                <button
                    key={`${link.label}-${i}`}
                    type="button"
                    disabled={!link.url}
                    onClick={() => goto(link.url)}
                    className={cn(
                        'min-w-[28px] rounded border px-2 py-1 font-mono text-[10px] transition-colors',
                        link.active
                            ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-500'
                            : link.url
                              ? 'border-border bg-muted/40 text-foreground hover:bg-muted/60'
                              : 'cursor-not-allowed border-border/40 text-muted-foreground/40',
                    )}
                >
                    {cleanPaginatorLabel(link.label)}
                </button>
            ))}
        </div>
    );
}
