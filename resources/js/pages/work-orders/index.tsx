import { Can } from '@/components/Can';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ContentWithSidebar } from '@/components/ui/content-with-sidebar';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import type { FilterPill } from '@/components/ui/filter-toolbar';
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
import { getWorkOrderColumns } from '@/components/work-orders/columns';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, WorkOrder } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    UserPlus,
    Users,
    Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface PaginatedWorkOrders {
    data: WorkOrder[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Technician {
    id: number;
    name: string;
}

interface TechnicianWorkload {
    id: number;
    name: string;
    open_count: number;
}

interface Props {
    workOrders: PaginatedWorkOrders;
    filters: {
        status?: string;
        priority?: string;
        type?: string;
        assigned?: string;
    };
    isTechnician?: boolean;
    technicians?: Technician[];
    technicianWorkload?: TechnicianWorkload[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Work Orders', href: '/work-orders' },
];

const STATUS_LABELS: Record<string, string> = {
    open: 'Open',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const PRIORITY_LABELS: Record<string, string> = {
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

const TYPE_LABELS: Record<string, string> = {
    battery_replace: 'Battery Replace',
    sensor_replace: 'Sensor Replace',
    maintenance: 'Maintenance',
    inspection: 'Inspection',
    install: 'Install',
};

export default function WorkOrderIndex({
    workOrders,
    filters,
    isTechnician,
    technicians = [],
    technicianWorkload = [],
}: Props) {
    const { t } = useLang();
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showFilters, setShowFilters] = useState(() => {
        try {
            const stored = localStorage.getItem('work-orders-show-filters');
            return stored !== null ? stored === 'true' : true;
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('work-orders-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    const assignableWOs = workOrders.data.filter((wo) =>
        ['open', 'assigned'].includes(wo.status),
    );
    const allSelected =
        assignableWOs.length > 0 &&
        assignableWOs.every((wo) => selectedIds.includes(wo.id));

    function toggleSelect(id: number) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );
    }

    function toggleSelectAll() {
        setSelectedIds(allSelected ? [] : assignableWOs.map((wo) => wo.id));
    }

    function bulkAssign(techId: number) {
        router.post(
            '/work-orders/bulk-assign',
            { ids: selectedIds, assigned_to: techId },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedIds([]),
            },
        );
    }

    function applyFilter(key: string, value: string | undefined) {
        const params: Record<string, string> = { ...filters };
        if (value && value !== 'all') params[key] = value;
        else delete params[key];
        router.get('/work-orders', params, {
            preserveState: true,
            replace: true,
        });
    }

    function clearAllFilters() {
        router.get('/work-orders', {}, { preserveState: true, replace: true });
    }

    // Stats from current page
    const openCount = workOrders.data.filter(
        (wo) => wo.status === 'open',
    ).length;
    const urgentCount = workOrders.data.filter(
        (wo) => wo.priority === 'urgent' && wo.status !== 'completed',
    ).length;

    const hasFilters = !!(filters.status || filters.priority || filters.type || filters.assigned);

    // Build filter pills
    const filterPills = useMemo<FilterPill[]>(() => {
        const pills: FilterPill[] = [];
        if (filters.assigned === 'me') {
            pills.push({
                key: 'assigned',
                label: 'My Work Orders',
                onRemove: () => applyFilter('assigned', undefined),
            });
        }
        if (filters.status) {
            pills.push({
                key: 'status',
                label: `Status: ${STATUS_LABELS[filters.status] ?? filters.status}`,
                onRemove: () => applyFilter('status', undefined),
            });
        }
        if (filters.priority) {
            pills.push({
                key: 'priority',
                label: `Priority: ${PRIORITY_LABELS[filters.priority] ?? filters.priority}`,
                onRemove: () => applyFilter('priority', undefined),
            });
        }
        if (filters.type) {
            pills.push({
                key: 'type',
                label: `Type: ${TYPE_LABELS[filters.type] ?? filters.type}`,
                onRemove: () => applyFilter('type', undefined),
            });
        }
        return pills;
    }, [filters]);

    const columns = useMemo(
        () =>
            getWorkOrderColumns({
                isTechnician,
                selectedIds,
                onToggleSelect: toggleSelect,
                onToggleSelectAll: toggleSelectAll,
                allSelected,
            }),
        [isTechnician, selectedIds, allSelected],
    );

    const emptyState = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<Wrench className="h-5 w-5 text-muted-foreground" />}
            title={
                hasFilters
                    ? t('No work orders match these filters')
                    : t('No work orders yet')
            }
            description={
                hasFilters
                    ? t('Try adjusting your filters')
                    : t('Work orders are created automatically from alerts or manually by managers')
            }
            action={
                hasFilters ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            router.get('/work-orders', {}, { preserveState: true, replace: true })
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
                <Button
                    variant={filters.assigned === 'me' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() =>
                        applyFilter(
                            'assigned',
                            filters.assigned === 'me' ? undefined : 'me',
                        )
                    }
                >
                    {t('My Work Orders')}
                </Button>

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
                            <SelectItem value="all">{t('All Status')}</SelectItem>
                            <SelectItem value="open">{t('Open')}</SelectItem>
                            <SelectItem value="assigned">{t('Assigned')}</SelectItem>
                            <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                            <SelectItem value="completed">{t('Completed')}</SelectItem>
                            <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Priority')}
                    </Label>
                    <Select
                        value={filters.priority ?? 'all'}
                        onValueChange={(v) => applyFilter('priority', v)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Priority')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Priority')}</SelectItem>
                            <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                            <SelectItem value="high">{t('High')}</SelectItem>
                            <SelectItem value="medium">{t('Medium')}</SelectItem>
                            <SelectItem value="low">{t('Low')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Type')}
                    </Label>
                    <Select
                        value={filters.type ?? 'all'}
                        onValueChange={(v) => applyFilter('type', v)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Type')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Types')}</SelectItem>
                            <SelectItem value="battery_replace">{t('Battery Replace')}</SelectItem>
                            <SelectItem value="sensor_replace">{t('Sensor Replace')}</SelectItem>
                            <SelectItem value="maintenance">{t('Maintenance')}</SelectItem>
                            <SelectItem value="inspection">{t('Inspection')}</SelectItem>
                            <SelectItem value="install">{t('Install')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Work Orders')} />
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
                                    {t('Operations')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Work Orders')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium text-foreground">
                                        {workOrders.total}
                                    </span>{' '}
                                    {t('total')}
                                    {openCount > 0 && (
                                        <span className="ml-2 font-medium text-destructive">
                                            <span className="font-mono">
                                                {openCount}
                                            </span>{' '}
                                            {t('open')}
                                        </span>
                                    )}
                                    {urgentCount > 0 && (
                                        <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                                            <span className="font-mono">
                                                {urgentCount}
                                            </span>{' '}
                                            {t('urgent')}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <Can permission="manage work orders">
                                <Button
                                    disabled
                                    size="sm"
                                    title={t(
                                        'Work orders are auto-created from device health checks',
                                    )}
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    {t('New Work Order')}
                                </Button>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* -- Team Workload ----------------------------------------- */}
                {!isTechnician && technicianWorkload.length > 0 && (
                    <FadeIn delay={50} duration={400}>
                        <div>
                            <div className="mb-2 flex items-center gap-3">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Team Workload')}
                                </p>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {technicianWorkload.map((tech) => {
                                    const count = tech.open_count;
                                    const colorClass =
                                        count >= 6
                                            ? 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20'
                                            : count >= 3
                                              ? 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20'
                                              : 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20';
                                    const countColor =
                                        count >= 6
                                            ? 'text-red-600 dark:text-red-400'
                                            : count >= 3
                                              ? 'text-amber-600 dark:text-amber-400'
                                              : 'text-emerald-600 dark:text-emerald-400';
                                    const dotColor =
                                        count >= 6
                                            ? 'bg-red-500'
                                            : count >= 3
                                              ? 'bg-amber-500'
                                              : 'bg-emerald-500';

                                    return (
                                        <Card
                                            key={tech.id}
                                            className={`min-w-[140px] shadow-elevation-1 ${colorClass}`}
                                        >
                                            <CardContent className="flex items-center gap-3 p-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60">
                                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-medium leading-none">
                                                        {tech.name}
                                                    </p>
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        <span
                                                            className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`}
                                                        />
                                                        <span
                                                            className={`font-mono text-sm font-bold tabular-nums ${countColor}`}
                                                        >
                                                            {count}
                                                        </span>
                                                        <span className="text-[0.625rem] text-muted-foreground">
                                                            {t('open')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    </FadeIn>
                )}

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
                                data={workOrders.data}
                                bordered={false}
                                onRowClick={(wo) => router.get(`/work-orders/${wo.id}`)}
                                rowClassName={(wo) =>
                                    [
                                        'transition-colors hover:bg-muted/50',
                                        selectedIds.includes(wo.id) ? 'bg-accent/50' : '',
                                        wo.priority === 'urgent' && wo.status !== 'completed'
                                            ? 'bg-red-50/30 hover:bg-red-50/50 dark:bg-red-950/10 dark:hover:bg-red-950/20'
                                            : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')
                                }
                                emptyState={emptyState}
                                noResultsMessage={t('No work orders found')}
                            />

                            {/* Pagination */}
                            {workOrders.last_page > 1 && (
                                <div className="flex items-center justify-between border-t px-4 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        {t('Page')}{' '}
                                        <span className="font-mono font-medium tabular-nums text-foreground">
                                            {workOrders.current_page}
                                        </span>{' '}
                                        {t('of')}{' '}
                                        <span className="font-mono tabular-nums">
                                            {workOrders.last_page}
                                        </span>
                                    </p>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            disabled={!workOrders.prev_page_url}
                                            onClick={() =>
                                                workOrders.prev_page_url &&
                                                router.get(
                                                    workOrders.prev_page_url,
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
                                            disabled={!workOrders.next_page_url}
                                            onClick={() =>
                                                workOrders.next_page_url &&
                                                router.get(
                                                    workOrders.next_page_url,
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

            {!isTechnician && technicians.length > 0 && (
                <BulkActionBar
                    selectedCount={selectedIds.length}
                    onClear={() => setSelectedIds([])}
                >
                    <Select onValueChange={(v) => bulkAssign(Number(v))}>
                        <SelectTrigger className="w-[200px] bg-primary-foreground text-foreground">
                            <UserPlus className="mr-2 h-4 w-4" />
                            <SelectValue placeholder={t('Assign to...')} />
                        </SelectTrigger>
                        <SelectContent>
                            {technicians.map((tech) => (
                                <SelectItem
                                    key={tech.id}
                                    value={String(tech.id)}
                                >
                                    {tech.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </BulkActionBar>
            )}
        </AppLayout>
    );
}

/* -- Skeleton ---------------------------------------------------------- */

export function WorkOrderIndexSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-8 w-40" />
                <Skeleton className="mt-2 h-4 w-32" />
            </div>
            {/* Filters */}
            <div>
                <div className="mb-2 flex items-center gap-3">
                    <Skeleton className="h-3 w-14" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <Card>
                    <CardContent className="flex gap-3 p-3">
                        <Skeleton className="h-9 w-32" />
                        <Skeleton className="h-9 w-[140px]" />
                        <Skeleton className="h-9 w-[130px]" />
                        <Skeleton className="h-9 w-[160px]" />
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
                            {Array.from({ length: 7 }).map((_, i) => (
                                <TableHead key={i}>
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
                                    <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-24" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-20" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-3 w-16" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
