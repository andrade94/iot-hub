import { Can } from '@/components/Can';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getEcho } from '@/lib/echo';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, BreadcrumbItem, SharedData, Site } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Bell,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CheckCheck,
    Clock,
    Download,
    Search,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface PaginatedAlerts {
    data: Alert[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface DeviceOption {
    id: number;
    name: string;
    site_id: number;
}

interface Props {
    alerts: PaginatedAlerts;
    sites: Pick<Site, 'id' | 'name'>[];
    devices: DeviceOption[];
    counts: { critical: number; high: number; resolved: number; active: number };
    filters: {
        severity?: string;
        status?: string;
        site_id?: string;
        device_id?: string;
        search?: string;
        range?: string;
        assigned?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Alerts', href: '/alerts' },
];

export default function AlertIndex({ alerts, sites, devices, counts, filters }: Props) {
    const { t } = useLang();
    const { accessible_sites } = usePage<SharedData>().props;
    const [search, setSearch] = useState(filters.search ?? '');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [confirmAction, setConfirmAction] = useState<null | 'resolve' | 'dismiss'>(null);
    const [liveConnected, setLiveConnected] = useState(false);

    // Real-time: subscribe to AlertTriggered on each accessible site channel.
    // On an incoming alert, refresh the alerts + counts props in place.
    useEffect(() => {
        const echo = getEcho();
        if (!echo || !accessible_sites?.length) return;

        const handler = () => {
            router.reload({ only: ['alerts', 'counts'] });
        };

        const channels = accessible_sites.map((s) => {
            const channel = echo.private(`site.${s.id}`);
            channel.listen('.alert.triggered', handler);
            channel.subscribed(() => setLiveConnected(true));
            return s.id;
        });

        return () => {
            channels.forEach((id) => echo.leave(`site.${id}`));
            setLiveConnected(false);
        };
    }, [accessible_sites]);

    function applyFilter(key: string, value: string | undefined) {
        const params: Record<string, string> = { ...filters };
        if (value && value !== 'all') params[key] = value;
        else delete params[key];
        router.get('/alerts', params, { preserveState: true, replace: true });
    }

    function submitSearch() {
        const params: Record<string, string> = { ...filters };
        if (search) params.search = search;
        else delete params.search;
        router.get('/alerts', params, { preserveState: true, replace: true });
    }

    function clearAll() {
        setSearch('');
        router.get('/alerts', {}, { preserveState: true, replace: true });
    }

    function toggleSelect(id: number) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function clearSelection() {
        setSelected(new Set());
    }

    function bulkAcknowledge() {
        router.post('/alerts/bulk-acknowledge', { ids: Array.from(selected) }, {
            preserveScroll: true,
            onSuccess: clearSelection,
        });
    }

    function bulkResolve() {
        router.post('/alerts/bulk-resolve', { ids: Array.from(selected) }, {
            preserveScroll: true,
            onSuccess: () => {
                clearSelection();
                setConfirmAction(null);
            },
        });
    }

    function bulkDismiss() {
        router.post('/alerts/bulk-dismiss', { ids: Array.from(selected) }, {
            preserveScroll: true,
            onSuccess: () => {
                clearSelection();
                setConfirmAction(null);
            },
        });
    }

    const hasFilters = !!(filters.severity || filters.status || filters.site_id || filters.device_id || filters.search || filters.assigned);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Alerts')} />
            <div className={cn('flex h-full flex-1 flex-col gap-6 p-4 md:p-6', selected.size > 0 && 'pb-20')}>
                {/* Header */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Alert Monitor')}
                                </p>
                                <div className="mt-1.5 flex items-center gap-3">
                                    <h1 className="font-display text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                        {t('Active Alerts')}
                                    </h1>
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[9px] font-semibold',
                                            liveConnected
                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                                                : 'border-border bg-muted/30 text-muted-foreground',
                                        )}
                                        title={liveConnected ? t('Real-time updates enabled') : t('Real-time disconnected — refresh for latest')}
                                    >
                                        <span className={cn('h-1.5 w-1.5 rounded-full', liveConnected ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground/50')} />
                                        {liveConnected ? t('LIVE') : t('OFFLINE')}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium text-foreground">{alerts.total}</span>{' '}
                                    {t('alerts')}
                                    {counts.active > 0 && (
                                        <span className="ml-2 text-rose-500">
                                            <span className="font-mono font-medium">{counts.active}</span> {t('active')}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {counts.critical > 0 && (
                                    <div className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                                        <span className="font-mono text-xs font-semibold text-rose-500">{counts.critical}</span>
                                        <span className="text-xs text-rose-400">{t('critical')}</span>
                                    </div>
                                )}
                                {counts.high > 0 && (
                                    <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                        <span className="font-mono text-xs font-semibold text-amber-500">{counts.high}</span>
                                        <span className="text-xs text-amber-400">{t('high')}</span>
                                    </div>
                                )}
                                {counts.resolved > 0 && (
                                    <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        <span className="font-mono text-xs font-semibold text-emerald-500">{counts.resolved}</span>
                                        <span className="text-xs text-emerald-400">{t('resolved')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* Toolbar: Search + Site + Range */}
                <FadeIn delay={75} duration={400}>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[240px] max-w-[340px]">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                                placeholder={t('Search rule, device, or zone...')}
                                className="pl-9"
                            />
                        </div>
                        {sites.length > 1 && (
                            <Select value={filters.site_id ?? 'all'} onValueChange={(v) => {
                                // Reset device filter when changing site
                                const params: Record<string, string> = { ...filters };
                                if (v && v !== 'all') params.site_id = v;
                                else delete params.site_id;
                                delete params.device_id;
                                router.get('/alerts', params, { preserveState: true, replace: true });
                            }}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder={t('All Sites')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Sites')}</SelectItem>
                                    {sites.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {devices.length > 0 && (
                            <Select value={filters.device_id ?? 'all'} onValueChange={(v) => applyFilter('device_id', v)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder={t('All Devices')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Devices')}</SelectItem>
                                    {devices.map((d) => (
                                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Select value={filters.range ?? '7d'} onValueChange={(v) => applyFilter('range', v)}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="24h">{t('Last 24 hours')}</SelectItem>
                                <SelectItem value="7d">{t('Last 7 days')}</SelectItem>
                                <SelectItem value="30d">{t('Last 30 days')}</SelectItem>
                                <SelectItem value="all">{t('All time')}</SelectItem>
                            </SelectContent>
                        </Select>
                        {hasFilters && (
                            <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">
                                <X className="mr-1 h-3 w-3" /> {t('Clear filters')}
                            </Button>
                        )}
                        <div className="ml-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    Object.entries(filters).forEach(([k, v]) => {
                                        if (v) params.set(k, String(v));
                                    });
                                    window.location.href = `/alerts/export?${params.toString()}`;
                                }}
                                title={t('Download filtered alerts as CSV')}
                            >
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                {t('Export CSV')}
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* Filter pills */}
                <FadeIn delay={100} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="flex flex-wrap items-center gap-2 p-3">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{t('Severity')}:</span>
                            <FilterPill active={!filters.severity} onClick={() => applyFilter('severity', undefined)}>{t('All')}</FilterPill>
                            <FilterPill active={filters.severity === 'critical'} onClick={() => applyFilter('severity', 'critical')}>{t('Critical')}</FilterPill>
                            <FilterPill active={filters.severity === 'high'} onClick={() => applyFilter('severity', 'high')}>{t('High')}</FilterPill>
                            <FilterPill active={filters.severity === 'medium'} onClick={() => applyFilter('severity', 'medium')}>{t('Medium')}</FilterPill>
                            <FilterPill active={filters.severity === 'low'} onClick={() => applyFilter('severity', 'low')}>{t('Low')}</FilterPill>
                            <div className="mx-2 h-4 w-px bg-border" />
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{t('Status')}:</span>
                            <FilterPill active={!filters.status} onClick={() => applyFilter('status', undefined)}>{t('Active + Ack')}</FilterPill>
                            <FilterPill active={filters.status === 'active'} onClick={() => applyFilter('status', 'active')}>{t('Active only')}</FilterPill>
                            <FilterPill active={filters.status === 'resolved'} onClick={() => applyFilter('status', 'resolved')}>{t('Resolved')}</FilterPill>
                            <FilterPill active={filters.status === 'dismissed'} onClick={() => applyFilter('status', 'dismissed')}>{t('Dismissed')}</FilterPill>
                            <div className="mx-2 h-4 w-px bg-border" />
                            <FilterPill
                                active={filters.assigned === 'me'}
                                onClick={() => applyFilter('assigned', filters.assigned === 'me' ? undefined : 'me')}
                            >
                                {t('Triaged by me')}
                            </FilterPill>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Alert rows */}
                <FadeIn delay={150} duration={500}>
                    <Card className="shadow-elevation-1 overflow-hidden">
                        {alerts.data.length === 0 ? (
                            <EmptyState
                                size="sm"
                                variant="muted"
                                icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                title={hasFilters ? t('No alerts match these filters') : t('All clear — no alerts')}
                                description={hasFilters ? t('Try adjusting your filters to see more results') : t('Your devices are operating within normal thresholds')}
                                action={hasFilters ? <Button variant="outline" size="sm" onClick={clearAll}>{t('Clear filters')}</Button> : undefined}
                            />
                        ) : (
                            <>
                                {/* Table header */}
                                <div className="grid grid-cols-[24px_90px_1fr_200px_160px_100px_70px_80px] items-center gap-3 border-b bg-muted/20 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                    <input
                                        type="checkbox"
                                        checked={selected.size === alerts.data.filter((a) => a.status === 'active' || a.status === 'acknowledged').length && selected.size > 0}
                                        onChange={() => {
                                            const actionable = alerts.data.filter((a) => a.status === 'active' || a.status === 'acknowledged');
                                            if (selected.size === actionable.length) setSelected(new Set());
                                            else setSelected(new Set(actionable.map((a) => a.id)));
                                        }}
                                    />
                                    <span>{t('Severity')}</span>
                                    <span>{t('Alert')}</span>
                                    <span>{t('Device / Zone')}</span>
                                    <span>{t('Reading')}</span>
                                    <span>{t('Status')}</span>
                                    <span>{t('Age')}</span>
                                    <span></span>
                                </div>

                                {alerts.data.map((alert) => (
                                    <AlertRow
                                        key={alert.id}
                                        alert={alert}
                                        selected={selected.has(alert.id)}
                                        onToggleSelect={() => toggleSelect(alert.id)}
                                        onClick={() => router.get(`/alerts/${alert.id}`)}
                                        t={t}
                                    />
                                ))}
                            </>
                        )}

                        {/* Pagination */}
                        {alerts.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="font-mono text-[11px] text-muted-foreground">
                                    {t('Showing')} {(alerts.current_page - 1) * 20 + 1}–{Math.min(alerts.current_page * 20, alerts.total)} {t('of')} {alerts.total}
                                </p>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon-sm" disabled={!alerts.prev_page_url} onClick={() => alerts.prev_page_url && router.get(alerts.prev_page_url, {}, { preserveState: true })}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon-sm" disabled={!alerts.next_page_url} onClick={() => alerts.next_page_url && router.get(alerts.next_page_url, {}, { preserveState: true })}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </FadeIn>
            </div>

            <Can permission="acknowledge alerts">
                <BulkActionBar selectedCount={selected.size} onClear={clearSelection}>
                    <Button variant="secondary" size="sm" onClick={bulkAcknowledge}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        {t('Acknowledge')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmAction('dismiss')}>
                        <XCircle className="mr-2 h-4 w-4" />
                        {t('Dismiss')}
                    </Button>
                    <Button size="sm" onClick={() => setConfirmAction('resolve')}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t('Resolve')}
                    </Button>
                </BulkActionBar>
            </Can>

            <ConfirmationDialog
                open={confirmAction === 'resolve'}
                onOpenChange={(o) => !o && setConfirmAction(null)}
                title={t('Resolve selected alerts?')}
                description={t('This marks the selected alerts as resolved. Use this when the underlying issue has been fixed.')}
                warningMessage={t('Resolved alerts move out of the active queue and can only be found via filters.')}
                actionLabel={`${t('Resolve')} ${selected.size}`}
                onConfirm={bulkResolve}
            />

            <ConfirmationDialog
                open={confirmAction === 'dismiss'}
                onOpenChange={(o) => !o && setConfirmAction(null)}
                title={t('Dismiss selected alerts?')}
                description={t('Dismiss the selected alerts without resolving the underlying issue. Use this for false positives or duplicates.')}
                warningMessage={t('Dismissed alerts are terminal and cannot be reopened.')}
                actionLabel={`${t('Dismiss')} ${selected.size}`}
                onConfirm={bulkDismiss}
            />
        </AppLayout>
    );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'rounded-md border px-2.5 py-1 text-[11px] transition-colors',
                active
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
            )}
        >
            {children}
        </button>
    );
}

function AlertRow({
    alert,
    selected,
    onToggleSelect,
    onClick,
    t,
}: {
    alert: Alert;
    selected: boolean;
    onToggleSelect: () => void;
    onClick: () => void;
    t: (key: string) => string;
}) {
    const isCriticalActive = alert.severity === 'critical' && alert.status === 'active';
    const isActionable = alert.status === 'active' || alert.status === 'acknowledged';
    const data = alert.data as Record<string, unknown> | null;

    return (
        <div
            className={cn(
                'grid grid-cols-[24px_90px_1fr_200px_160px_100px_70px_80px] items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50',
                isCriticalActive && 'border-l-[3px] border-l-rose-500 bg-gradient-to-r from-rose-500/[0.06] to-transparent pl-[13px]',
                selected && 'bg-accent/50',
            )}
        >
            <input
                type="checkbox"
                checked={selected}
                disabled={!isActionable}
                onClick={(e) => e.stopPropagation()}
                onChange={onToggleSelect}
                className="cursor-pointer"
            />
            <div className="flex items-center gap-1.5">
                <div
                    className={cn(
                        'h-6 w-[3px] rounded-sm',
                        alert.severity === 'critical' && 'animate-pulse bg-rose-500',
                        alert.severity === 'high' && 'bg-amber-500',
                        alert.severity === 'medium' && 'bg-blue-500',
                        alert.severity === 'low' && 'bg-muted-foreground/50',
                    )}
                />
                <Badge variant={severityVariant(alert.severity)} className="text-[9px]">
                    {t(alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1))}
                </Badge>
            </div>
            <div className="cursor-pointer" onClick={onClick}>
                <p className="text-[13px] font-medium">{(data?.rule_name as string) ?? alert.rule?.name ?? t('Unknown rule')}</p>
                {alert.corrective_actions && alert.corrective_actions.length > 0 && (
                    <p className="mt-0.5 flex items-center gap-1 text-[9px] text-emerald-500">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {t('Corrective action logged')}
                    </p>
                )}
            </div>
            <div className="cursor-pointer" onClick={onClick}>
                <p className="text-[11px] text-muted-foreground">{alert.device?.name ?? '—'}</p>
                <p className="font-mono text-[10px] text-muted-foreground/60">
                    {alert.site?.name}
                    {alert.device?.zone && ` · ${alert.device.zone}`}
                </p>
            </div>
            <div className="cursor-pointer font-mono text-[11px]" onClick={onClick}>
                {data?.metric ? (
                    <>
                        <span className="text-muted-foreground">{String(data.metric)}:</span>{' '}
                        <span className={cn('font-semibold', isCriticalActive ? 'text-rose-500' : 'text-amber-500')}>
                            {String(data.value ?? '—')}
                        </span>
                        {data.threshold != null && (
                            <div className="text-[10px] text-muted-foreground/50">
                                {t('threshold')}: {String(data.threshold)}
                            </div>
                        )}
                    </>
                ) : (
                    '—'
                )}
            </div>
            <div>
                <Badge variant={statusVariant(alert.status)} className="text-[9px]">
                    {t(alert.status.charAt(0).toUpperCase() + alert.status.slice(1))}
                </Badge>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
                {formatTimeAgo(alert.triggered_at)}
            </div>
            <div className="flex justify-end gap-1">
                {isActionable && (
                    <Can permission="acknowledge alerts">
                        {alert.status === 'active' && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                title={t('Acknowledge')}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.post(`/alerts/${alert.id}/acknowledge`, {}, { preserveScroll: true });
                                }}
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            title={t('Snooze')}
                            onClick={(e) => {
                                e.stopPropagation();
                                router.post(`/alerts/${alert.id}/snooze`, { minutes: 60 }, { preserveScroll: true });
                            }}
                        >
                            <Clock className="h-3.5 w-3.5" />
                        </Button>
                    </Can>
                )}
            </div>
        </div>
    );
}

function severityVariant(severity: string): 'destructive' | 'warning' | 'info' | 'outline' {
    switch (severity) {
        case 'critical': return 'destructive';
        case 'high': return 'warning';
        case 'medium': return 'info';
        default: return 'outline';
    }
}

function statusVariant(status: string): 'destructive' | 'warning' | 'success' | 'outline' {
    switch (status) {
        case 'active': return 'destructive';
        case 'acknowledged': return 'warning';
        case 'resolved': return 'success';
        default: return 'outline';
    }
}

/* -- Skeleton ---------------------------------------------------------- */

export function AlertIndexSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-40" />
                <Skeleton className="mt-2 h-4 w-48" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-9 w-[300px]" />
                <Skeleton className="h-9 w-[180px]" />
                <Skeleton className="h-9 w-[160px]" />
            </div>
            <Skeleton className="h-12 w-full" />
            <Card className="shadow-elevation-1">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                ))}
            </Card>
        </div>
    );
}

export { Bell };
