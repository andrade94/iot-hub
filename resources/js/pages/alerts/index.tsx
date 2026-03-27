import { Can } from '@/components/Can';
import { getAlertColumns } from '@/components/alerts/columns';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ContentWithSidebar } from '@/components/ui/content-with-sidebar';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import type { FilterPill } from '@/components/ui/filter-toolbar';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
import type { Alert, BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import type { RowSelectionState } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface PaginatedAlerts {
    data: Alert[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    alerts: PaginatedAlerts;
    filters: {
        severity?: string;
        status?: string;
        site_id?: string;
        from?: string;
        to?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Alerts', href: '/alerts' },
];

const SEVERITY_LABELS: Record<string, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    acknowledged: 'Acknowledged',
    resolved: 'Resolved',
    dismissed: 'Dismissed',
};

export default function AlertIndex({ alerts, filters }: Props) {
    const { t } = useLang();
    const [dateFrom, setDateFrom] = useState(filters.from ?? '');
    const [dateTo, setDateTo] = useState(filters.to ?? '');
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [showFilters, setShowFilters] = useState(() => {
        try {
            const stored = localStorage.getItem('alerts-show-filters');
            return stored === 'true';
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('alerts-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    // Derive selectedIds from RowSelectionState
    const selectedIds = useMemo(
        () =>
            Object.keys(rowSelection)
                .filter((key) => rowSelection[key])
                .map(Number),
        [rowSelection],
    );

    function clearSelection() {
        setRowSelection({});
    }

    function bulkAcknowledge() {
        router.post(
            '/alerts/bulk-acknowledge',
            { ids: selectedIds },
            {
                preserveScroll: true,
                onSuccess: clearSelection,
            },
        );
    }

    function bulkResolve() {
        router.post(
            '/alerts/bulk-resolve',
            { ids: selectedIds },
            {
                preserveScroll: true,
                onSuccess: clearSelection,
            },
        );
    }

    function applyFilter(key: string, value: string | undefined) {
        const params: Record<string, string> = { ...filters };
        if (value && value !== 'all') {
            params[key] = value;
        } else {
            delete params[key];
        }
        router.get('/alerts', params, { preserveState: true, replace: true });
    }

    function applyDateFilter() {
        const params: Record<string, string> = { ...filters };
        if (dateFrom) params.from = dateFrom;
        else delete params.from;
        if (dateTo) params.to = dateTo;
        else delete params.to;
        router.get('/alerts', params, { preserveState: true, replace: true });
    }

    function clearAllFilters() {
        setDateFrom('');
        setDateTo('');
        router.get('/alerts', {}, { preserveState: true, replace: true });
    }

    // Stats from current page
    const activeCount = alerts.data.filter((a) => a.status === 'active').length;
    const criticalCount = alerts.data.filter(
        (a) => a.severity === 'critical' && a.status === 'active',
    ).length;
    const highCount = alerts.data.filter(
        (a) => a.severity === 'high' && a.status === 'active',
    ).length;
    const acknowledgedCount = alerts.data.filter(
        (a) => a.status === 'acknowledged',
    ).length;

    const hasFilters = !!(filters.severity || filters.status || filters.from || filters.to);

    // Build filter pills
    const filterPills = useMemo<FilterPill[]>(() => {
        const pills: FilterPill[] = [];
        if (filters.severity) {
            pills.push({
                key: 'severity',
                label: `Severity: ${SEVERITY_LABELS[filters.severity] ?? filters.severity}`,
                onRemove: () => applyFilter('severity', undefined),
            });
        }
        if (filters.status) {
            pills.push({
                key: 'status',
                label: `Status: ${STATUS_LABELS[filters.status] ?? filters.status}`,
                onRemove: () => applyFilter('status', undefined),
            });
        }
        if (filters.from) {
            pills.push({
                key: 'from',
                label: `From: ${filters.from}`,
                onRemove: () => {
                    setDateFrom('');
                    const params: Record<string, string> = { ...filters };
                    delete params.from;
                    router.get('/alerts', params, { preserveState: true, replace: true });
                },
            });
        }
        if (filters.to) {
            pills.push({
                key: 'to',
                label: `To: ${filters.to}`,
                onRemove: () => {
                    setDateTo('');
                    const params: Record<string, string> = { ...filters };
                    delete params.to;
                    router.get('/alerts', params, { preserveState: true, replace: true });
                },
            });
        }
        return pills;
    }, [filters]);

    // Column definitions (memoized to avoid re-creating on every render)
    const columns = useMemo(
        () =>
            getAlertColumns({
                t,
                onAcknowledge: (alert) =>
                    router.post(
                        `/alerts/${alert.id}/acknowledge`,
                        {},
                        { preserveScroll: true },
                    ),
                onResolve: (alert) =>
                    router.post(
                        `/alerts/${alert.id}/resolve`,
                        {},
                        { preserveScroll: true },
                    ),
                onDismiss: (alert) =>
                    router.post(
                        `/alerts/${alert.id}/dismiss`,
                        {},
                        { preserveScroll: true },
                    ),
            }),
        [t],
    );

    // Row click handler
    const handleRowClick = useCallback((alert: Alert) => {
        router.get(`/alerts/${alert.id}`);
    }, []);

    // Row className for critical alert highlighting
    const getRowClassName = useCallback(
        (alert: Alert) => {
            const classes: string[] = ['transition-colors'];
            if (alert.status === 'active' && alert.severity === 'critical') {
                classes.push(
                    'bg-red-50/50 hover:bg-red-50/80 dark:bg-red-950/10 dark:hover:bg-red-950/20',
                );
            } else {
                classes.push('hover:bg-muted/50');
            }
            if (rowSelection[String(alert.id)]) {
                classes.push('bg-accent/50');
            }
            return classes.join(' ');
        },
        [rowSelection],
    );

    // Empty state for the DataTable
    const emptyStateNode = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            title={
                hasFilters
                    ? t('No alerts match these filters')
                    : t('All clear \u2014 no alerts')
            }
            description={
                hasFilters
                    ? t('Try adjusting your filters to see more results')
                    : t('Your devices are operating within normal thresholds')
            }
            action={
                hasFilters ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            router.get(
                                '/alerts',
                                {},
                                { preserveState: true, replace: true },
                            )
                        }
                    >
                        {t('Clear filters')}
                    </Button>
                ) : undefined
            }
        />
    );

    // Sidebar filter panel
    const filterSidebar = (
        <Card className="shadow-elevation-1">
            <CardContent className="flex flex-col gap-4 p-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Severity')}
                    </Label>
                    <Select
                        value={filters.severity ?? 'all'}
                        onValueChange={(v) => applyFilter('severity', v)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Severity')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Severity')}</SelectItem>
                            <SelectItem value="critical">{t('Critical')}</SelectItem>
                            <SelectItem value="high">{t('High')}</SelectItem>
                            <SelectItem value="medium">{t('Medium')}</SelectItem>
                            <SelectItem value="low">{t('Low')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Status')}
                    </Label>
                    <Select
                        value={filters.status ?? 'all'}
                        onValueChange={(v) => applyFilter('status', v)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('Active + Ack')}</SelectItem>
                            <SelectItem value="active">{t('Active')}</SelectItem>
                            <SelectItem value="acknowledged">{t('Acknowledged')}</SelectItem>
                            <SelectItem value="resolved">{t('Resolved')}</SelectItem>
                            <SelectItem value="dismissed">{t('Dismissed')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Date Range')}
                    </Label>
                    <div className="flex flex-col gap-2">
                        <DatePicker
                            date={dateFrom ? new Date(dateFrom + 'T00:00:00') : undefined}
                            onDateChange={(d) => setDateFrom(d ? format(d, 'yyyy-MM-dd') : '')}
                            placeholder={t('From')}
                            className="w-full"
                        />
                        <DatePicker
                            date={dateTo ? new Date(dateTo + 'T00:00:00') : undefined}
                            onDateChange={(d) => setDateTo(d ? format(d, 'yyyy-MM-dd') : '')}
                            placeholder={t('To')}
                            className="w-full"
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={applyDateFilter}
                        >
                            {t('Apply')}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Alerts')} />
            <div
                className={`flex h-full flex-1 flex-col gap-6 p-4 md:p-6 ${selectedIds.length > 0 ? 'pb-20' : ''}`}
            >
                {/* -- Header ------------------------------------------------ */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Alert Monitor')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Alerts')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium text-foreground">
                                        {alerts.total}
                                    </span>{' '}
                                    {t('alert(s)')}
                                    {activeCount > 0 && (
                                        <span className="ml-2 font-medium text-destructive">
                                            <span className="font-mono">{activeCount}</span>{' '}
                                            {t('active')}
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Severity indicators */}
                            {activeCount > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {criticalCount > 0 && (
                                        <SeverityPill
                                            color="red"
                                            count={criticalCount}
                                            label={t('critical')}
                                            pulse
                                        />
                                    )}
                                    {highCount > 0 && (
                                        <SeverityPill
                                            color="orange"
                                            count={highCount}
                                            label={t('high')}
                                        />
                                    )}
                                    {acknowledgedCount > 0 && (
                                        <SeverityPill
                                            color="amber"
                                            count={acknowledgedCount}
                                            label={t('acknowledged')}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </FadeIn>

                {/* -- FilterToolbar + ContentWithSidebar ------------------ */}
                <FadeIn delay={75} duration={400}>
                    <FilterToolbar
                        showSidebar={showFilters}
                        onToggleSidebar={toggleFilters}
                        pills={filterPills}
                        onClearAll={hasFilters ? clearAllFilters : undefined}
                    />
                </FadeIn>

                <FadeIn delay={150} duration={500}>
                    <ContentWithSidebar
                        showSidebar={showFilters}
                        sidebar={filterSidebar}
                    >
                        <Card className="flex-1 shadow-elevation-1">
                            <DataTable
                                columns={columns}
                                data={alerts.data}
                                getRowId={(row) => String(row.id)}
                                enableRowSelection={(alert) =>
                                    alert.status === 'active' || alert.status === 'acknowledged'
                                }
                                rowSelection={rowSelection}
                                onRowSelectionStateChange={setRowSelection}
                                onRowClick={handleRowClick}
                                rowClassName={getRowClassName}
                                bordered={false}
                                emptyState={emptyStateNode}
                            />

                            {/* Pagination */}
                            {alerts.last_page > 1 && (
                                <div className="flex items-center justify-between border-t px-4 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        {t('Page')}{' '}
                                        <span className="font-mono font-medium tabular-nums text-foreground">
                                            {alerts.current_page}
                                        </span>{' '}
                                        {t('of')}{' '}
                                        <span className="font-mono tabular-nums">
                                            {alerts.last_page}
                                        </span>
                                    </p>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            disabled={!alerts.prev_page_url}
                                            onClick={() =>
                                                alerts.prev_page_url &&
                                                router.get(
                                                    alerts.prev_page_url,
                                                    {},
                                                    { preserveState: true },
                                                )
                                            }
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            disabled={!alerts.next_page_url}
                                            onClick={() =>
                                                alerts.next_page_url &&
                                                router.get(
                                                    alerts.next_page_url,
                                                    {},
                                                    { preserveState: true },
                                                )
                                            }
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </ContentWithSidebar>
                </FadeIn>
            </div>

            <Can permission="acknowledge alerts">
                <BulkActionBar
                    selectedCount={selectedIds.length}
                    onClear={clearSelection}
                >
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={bulkAcknowledge}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        {t('Acknowledge')}
                    </Button>
                    <Button size="sm" onClick={bulkResolve}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t('Resolve')}
                    </Button>
                </BulkActionBar>
            </Can>
        </AppLayout>
    );
}

/* -- Severity Pill (header indicator) ---------------------------------- */

const severityPillColors = {
    red: {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-900',
        text: 'text-red-700 dark:text-red-400',
        dot: 'bg-red-500',
    },
    orange: {
        bg: 'bg-orange-50 dark:bg-orange-950/30',
        border: 'border-orange-200 dark:border-orange-900',
        text: 'text-orange-700 dark:text-orange-400',
        dot: 'bg-orange-500',
    },
    amber: {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-900',
        text: 'text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
};

function SeverityPill({
    color,
    count,
    label,
    pulse,
}: {
    color: 'red' | 'orange' | 'amber';
    count: number;
    label: string;
    pulse?: boolean;
}) {
    const c = severityPillColors[color];
    return (
        <div
            className={`flex items-center gap-2 rounded-full border ${c.border} ${c.bg} px-3 py-1.5`}
        >
            <span
                className={`h-2 w-2 rounded-full ${c.dot} ${pulse ? 'animate-pulse' : ''}`}
            />
            <span className={`text-xs font-medium ${c.text}`}>
                <span className="font-mono tabular-nums">{count}</span> {label}
            </span>
        </div>
    );
}

/* -- Skeleton ---------------------------------------------------------- */

export function AlertIndexSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-32" />
                <Skeleton className="mt-2 h-4 w-40" />
            </div>
            {/* Filters */}
            <div>
                <div className="mb-2 flex items-center gap-3">
                    <Skeleton className="h-3 w-14" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <Card>
                    <CardContent className="p-3">
                        <div className="flex gap-3">
                            <Skeleton className="h-9 w-[130px]" />
                            <Skeleton className="h-9 w-[150px]" />
                            <Skeleton className="h-9 w-[140px]" />
                            <Skeleton className="h-9 w-[140px]" />
                            <Skeleton className="h-9 w-16" />
                        </div>
                    </CardContent>
                </Card>
            </div>
            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">
                                <Skeleton className="h-4 w-4" />
                            </TableHead>
                            {[
                                'w-[100px]',
                                '',
                                '',
                                '',
                                '',
                                '',
                                'text-right',
                            ].map((c, i) => (
                                <TableHead key={i} className={c}>
                                    <Skeleton className="h-3 w-16" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Skeleton className="h-4 w-4" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-28" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="mt-1 h-3 w-16" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-20" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-3 w-8" />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Skeleton className="ml-auto h-7 w-16" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
