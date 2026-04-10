import { Can } from '@/components/Can';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { CreateWorkOrderDialog } from '@/components/work-orders/create-work-order-dialog';
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
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Site, WorkOrder } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    ChevronLeft,
    ChevronRight,
    Download,
    Pencil,
    Play,
    Plus,
    Search,
    Trash2,
    Wrench,
    X,
} from 'lucide-react';
import { useState } from 'react';

type WorkOrderWithAge = WorkOrder & {
    status_duration?: string;
    is_overdue?: boolean;
};

interface PaginatedWorkOrders {
    data: WorkOrderWithAge[];
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

interface DeviceOption {
    id: number;
    name: string;
    site_id: number;
}

interface Props {
    workOrders: PaginatedWorkOrders;
    sites: Pick<Site, 'id' | 'name'>[];
    devices: DeviceOption[];
    counts: { total: number; open: number; urgent: number; overdue: number };
    filters: {
        status?: string;
        priority?: string;
        type?: string;
        assigned?: string;
        site_id?: string;
        device_id?: string;
        search?: string;
        range?: string;
        overdue?: string;
    };
    isTechnician?: boolean;
    technicians?: Technician[];
    technicianWorkload?: TechnicianWorkload[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Work Orders', href: '/work-orders' },
];

export default function WorkOrderIndex({ workOrders, sites, devices, counts, filters, isTechnician, technicians = [], technicianWorkload = [] }: Props) {
    const { t } = useLang();
    const [search, setSearch] = useState(filters.search ?? '');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [bulkTechId, setBulkTechId] = useState<string>('');
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<WorkOrderWithAge | null>(null);

    function deleteWO() {
        if (!deleteTarget) return;
        router.delete(`/work-orders/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    }

    function applyFilter(key: string, value: string | undefined) {
        const params: Record<string, string> = { ...filters };
        if (value && value !== 'all') params[key] = value;
        else delete params[key];
        router.get('/work-orders', params, { preserveState: true, replace: true });
    }

    function submitSearch() {
        const params: Record<string, string> = { ...filters };
        if (search) params.search = search;
        else delete params.search;
        router.get('/work-orders', params, { preserveState: true, replace: true });
    }

    function clearAll() {
        setSearch('');
        router.get('/work-orders', {}, { preserveState: true, replace: true });
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
        setBulkTechId('');
    }

    function bulkAssign() {
        if (!bulkTechId) return;
        router.post('/work-orders/bulk-assign', {
            ids: Array.from(selected),
            assigned_to: Number(bulkTechId),
        }, {
            preserveScroll: true,
            onSuccess: clearSelection,
        });
    }

    const hasFilters = !!(filters.status || filters.priority || filters.type || filters.assigned || filters.site_id || filters.device_id || filters.search || filters.overdue);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Work Orders')} />
            <div className={cn('flex h-full flex-1 flex-col gap-6 p-4 md:p-6', selected.size > 0 && 'pb-20')}>
                {/* Header */}
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
                                    <span className="font-mono font-medium text-foreground">{counts.total}</span> {t('total')}
                                    {counts.open > 0 && (
                                        <>
                                            {' · '}
                                            <span className="text-rose-500">
                                                <span className="font-mono font-medium">{counts.open}</span> {t('open')}
                                            </span>
                                        </>
                                    )}
                                    {counts.overdue > 0 && (
                                        <>
                                            {' · '}
                                            <span className="font-semibold text-rose-500">
                                                <span className="font-mono">{counts.overdue}</span> {t('overdue')}
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>
                            <Can permission="manage work orders">
                                <Button onClick={() => setShowCreate(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('New Work Order')}
                                </Button>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* Team workload (managers only) */}
                {!isTechnician && technicianWorkload.length > 0 && (
                    <FadeIn delay={50} duration={400}>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Team Workload')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {technicianWorkload.map((tech) => {
                                    const pct = Math.min(tech.open_count * 15, 100);
                                    const color = tech.open_count >= 6 ? 'bg-rose-500' : tech.open_count >= 3 ? 'bg-amber-500' : 'bg-emerald-500';
                                    const textColor = tech.open_count >= 6 ? 'text-rose-500' : tech.open_count >= 3 ? 'text-amber-500' : 'text-emerald-500';
                                    const initials = tech.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
                                    return (
                                        <Card key={tech.id} className="shadow-elevation-1">
                                            <CardContent className="flex items-center gap-3 p-4">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted font-mono text-xs font-semibold">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-medium">{tech.name}</p>
                                                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/50">
                                                        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                                <div className={cn('font-mono text-[11px] font-semibold', textColor)}>
                                                    {tech.open_count} {t('open')}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    </FadeIn>
                )}

                {/* Toolbar */}
                <FadeIn delay={100} duration={400}>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[240px] max-w-[340px]">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                                placeholder={t('Search by title or device...')}
                                className="pl-9"
                            />
                        </div>
                        {sites.length > 1 && (
                            <Select value={filters.site_id ?? 'all'} onValueChange={(v) => {
                                const params: Record<string, string> = { ...filters };
                                if (v && v !== 'all') params.site_id = v;
                                else delete params.site_id;
                                delete params.device_id;
                                router.get('/work-orders', params, { preserveState: true, replace: true });
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
                        <Select value={filters.range ?? '30d'} onValueChange={(v) => applyFilter('range', v)}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
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
                                    window.location.href = `/work-orders/export?${params.toString()}`;
                                }}
                                title={t('Download filtered work orders as CSV')}
                            >
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                {t('Export CSV')}
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* Filter pills */}
                <FadeIn delay={125} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="flex flex-wrap items-center gap-2 p-3">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{t('Status')}:</span>
                            <FilterPill active={!filters.status} onClick={() => applyFilter('status', undefined)}>{t('All')}</FilterPill>
                            <FilterPill active={filters.status === 'open'} onClick={() => applyFilter('status', 'open')}>{t('Open')}</FilterPill>
                            <FilterPill active={filters.status === 'in_progress'} onClick={() => applyFilter('status', 'in_progress')}>{t('In Progress')}</FilterPill>
                            <FilterPill active={filters.status === 'completed'} onClick={() => applyFilter('status', 'completed')}>{t('Completed')}</FilterPill>
                            <div className="mx-2 h-4 w-px bg-border" />
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{t('Priority')}:</span>
                            <FilterPill active={!filters.priority} onClick={() => applyFilter('priority', undefined)}>{t('All')}</FilterPill>
                            <FilterPill active={filters.priority === 'urgent'} onClick={() => applyFilter('priority', 'urgent')}>{t('Urgent')}</FilterPill>
                            <FilterPill active={filters.priority === 'high'} onClick={() => applyFilter('priority', 'high')}>{t('High')}</FilterPill>
                            <div className="mx-2 h-4 w-px bg-border" />
                            <FilterPill active={filters.assigned === 'me'} onClick={() => applyFilter('assigned', filters.assigned === 'me' ? undefined : 'me')}>
                                {t('My work orders')}
                            </FilterPill>
                            <FilterPill active={filters.assigned === 'unassigned'} onClick={() => applyFilter('assigned', filters.assigned === 'unassigned' ? undefined : 'unassigned')}>
                                {t('Unassigned')}
                            </FilterPill>
                            {counts.overdue > 0 && (
                                <button
                                    type="button"
                                    onClick={() => applyFilter('overdue', filters.overdue === '1' ? undefined : '1')}
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] transition-colors',
                                        filters.overdue === '1'
                                            ? 'border-rose-500/50 bg-rose-500/10 text-rose-500'
                                            : 'border-rose-500/25 text-rose-500/80 hover:border-rose-500/40',
                                    )}
                                >
                                    <AlertTriangle className="h-3 w-3" />
                                    {t('Overdue')} ({counts.overdue})
                                </button>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Table */}
                <FadeIn delay={150} duration={500}>
                    <Card className="shadow-elevation-1 overflow-hidden">
                        {workOrders.data.length === 0 ? (
                            <EmptyState
                                size="sm"
                                variant="muted"
                                icon={<Wrench className="h-5 w-5 text-muted-foreground" />}
                                title={hasFilters ? t('No work orders match these filters') : t('No work orders yet')}
                                description={hasFilters ? t('Try adjusting your filters') : t('Create work orders to track site maintenance')}
                                action={hasFilters ? <Button variant="outline" size="sm" onClick={clearAll}>{t('Clear filters')}</Button> : undefined}
                            />
                        ) : (
                            <>
                                <div className="grid grid-cols-[24px_4px_1fr_110px_80px_120px_140px_100px_80px] items-center gap-3 border-b bg-muted/20 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                    {!isTechnician ? (
                                        <input
                                            type="checkbox"
                                            checked={selected.size === workOrders.data.length && selected.size > 0}
                                            onChange={() => {
                                                if (selected.size === workOrders.data.length) setSelected(new Set());
                                                else setSelected(new Set(workOrders.data.map((w) => w.id)));
                                            }}
                                        />
                                    ) : <span></span>}
                                    <span></span>
                                    <span>{t('Title')}</span>
                                    <span>{t('Type')}</span>
                                    <span>{t('Priority')}</span>
                                    <span>{t('Status')}</span>
                                    <span>{t('Assigned')}</span>
                                    <span>{t('Age')}</span>
                                    <span></span>
                                </div>

                                {workOrders.data.map((wo) => (
                                    <WorkOrderRow
                                        key={wo.id}
                                        wo={wo}
                                        selected={selected.has(wo.id)}
                                        onToggleSelect={() => toggleSelect(wo.id)}
                                        onClick={() => router.get(`/work-orders/${wo.id}`)}
                                        onDelete={() => setDeleteTarget(wo)}
                                        isTechnician={!!isTechnician}
                                        t={t}
                                    />
                                ))}
                            </>
                        )}

                        {/* Pagination */}
                        {workOrders.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="font-mono text-[11px] text-muted-foreground">
                                    {t('Showing')} {(workOrders.current_page - 1) * 20 + 1}–{Math.min(workOrders.current_page * 20, workOrders.total)} {t('of')} {workOrders.total}
                                </p>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon-sm" disabled={!workOrders.prev_page_url} onClick={() => workOrders.prev_page_url && router.get(workOrders.prev_page_url, {}, { preserveState: true })}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon-sm" disabled={!workOrders.next_page_url} onClick={() => workOrders.next_page_url && router.get(workOrders.next_page_url, {}, { preserveState: true })}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </FadeIn>
            </div>

            {/* Bulk assign bar */}
            {!isTechnician && (
                <BulkActionBar selectedCount={selected.size} onClear={clearSelection}>
                    <Select value={bulkTechId} onValueChange={setBulkTechId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder={t('Select technician...')} />
                        </SelectTrigger>
                        <SelectContent>
                            {technicians.map((tech) => (
                                <SelectItem key={tech.id} value={String(tech.id)}>{tech.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button size="sm" onClick={bulkAssign} disabled={!bulkTechId}>
                        {t('Assign')} ({selected.size})
                    </Button>
                </BulkActionBar>
            )}

            {/* Create Work Order Dialog */}
            <CreateWorkOrderDialog
                open={showCreate}
                onOpenChange={setShowCreate}
                sites={sites}
                devices={devices}
                technicians={technicians}
            />

            {/* Delete confirmation */}
            <ConfirmationDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title={t('Delete this work order?')}
                description={
                    deleteTarget
                        ? `${t('This will permanently delete')} "${deleteTarget.title}" (#${deleteTarget.id}).`
                        : ''
                }
                warningMessage={t('Notes, photos, and history will be lost. This cannot be undone.')}
                actionLabel={t('Delete Permanently')}
                onConfirm={deleteWO}
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

function WorkOrderRow({
    wo,
    selected,
    onToggleSelect,
    onClick,
    onDelete,
    isTechnician,
    t,
}: {
    wo: WorkOrderWithAge;
    selected: boolean;
    onToggleSelect: () => void;
    onClick: () => void;
    onDelete: () => void;
    isTechnician: boolean;
    t: (key: string) => string;
}) {
    const isUrgentOpen = wo.priority === 'urgent' && (wo.status === 'open' || wo.status === 'assigned');
    const isCompleted = wo.status === 'completed' || wo.status === 'cancelled';

    const nextAction = (() => {
        if (wo.status === 'open') return { label: t('Assign'), icon: Pencil, action: () => router.get(`/work-orders/${wo.id}`) };
        if (wo.status === 'assigned') return { label: t('Start'), icon: Play, action: () => router.put(`/work-orders/${wo.id}/status`, { status: 'in_progress' }, { preserveScroll: true }) };
        if (wo.status === 'in_progress') return { label: t('Complete'), icon: Check, action: () => router.put(`/work-orders/${wo.id}/status`, { status: 'completed' }, { preserveScroll: true }) };
        return null;
    })();

    const initials = wo.assigned_user?.name
        ? wo.assigned_user.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()
        : '—';

    return (
        <div
            className={cn(
                'grid grid-cols-[24px_4px_1fr_110px_80px_120px_140px_100px_80px] items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50',
                isUrgentOpen && 'border-l-[3px] border-l-rose-500 bg-gradient-to-r from-rose-500/[0.06] to-transparent pl-[13px]',
                selected && 'bg-accent/50',
                isCompleted && 'opacity-50',
            )}
        >
            {!isTechnician ? (
                <input
                    type="checkbox"
                    checked={selected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={onToggleSelect}
                    className="cursor-pointer"
                />
            ) : <span></span>}
            <div
                className={cn(
                    'h-6 w-[3px] rounded-sm',
                    wo.priority === 'urgent' && 'animate-pulse bg-rose-500',
                    wo.priority === 'high' && 'bg-amber-500',
                    wo.priority === 'medium' && 'bg-blue-500',
                    wo.priority === 'low' && 'bg-muted-foreground/50',
                )}
            />
            <div className="cursor-pointer" onClick={onClick}>
                <p className="text-[13px] font-medium">{wo.title}</p>
                <p className="font-mono text-[10px] text-muted-foreground/60">
                    #{wo.id} · {wo.site?.name ?? '—'}
                    {wo.alert_id && <> · <span className="text-rose-500">linked to Alert #{wo.alert_id}</span></>}
                </p>
            </div>
            <Badge variant="outline" className="text-[9px]">{wo.type?.replace('_', ' ')}</Badge>
            <Badge variant={priorityVariant(wo.priority)} className="text-[9px]">
                {wo.priority}
            </Badge>
            <div className="flex items-center gap-1.5">
                <Badge variant={statusVariant(wo.status)} className="text-[9px]">
                    {wo.status?.replace('_', ' ')}
                </Badge>
                {wo.is_overdue && (
                    <Badge variant="destructive" className="text-[8px] font-semibold">SLA</Badge>
                )}
            </div>
            <div className="flex items-center gap-2 text-[12px]">
                {wo.assigned_user ? (
                    <>
                        <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-blue-500/20 font-mono text-[9px] font-semibold text-blue-500">
                            {initials}
                        </span>
                        <span className="truncate">{wo.assigned_user.name}</span>
                    </>
                ) : (
                    <span className="text-muted-foreground/50">—</span>
                )}
            </div>
            <div className={cn('flex flex-col gap-0.5 font-mono text-[10px]', wo.is_overdue ? 'text-rose-500' : 'text-muted-foreground')}>
                <span className={wo.is_overdue ? 'font-semibold' : ''}>{wo.status_duration ?? '—'}</span>
                <span className="text-muted-foreground/50">
                    {new Date(wo.created_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                </span>
            </div>
            <div className="flex justify-end gap-1">
                {!isCompleted && nextAction && (
                    <Can permission="manage work orders">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            title={nextAction.label}
                            onClick={(e) => {
                                e.stopPropagation();
                                nextAction.action();
                            }}
                        >
                            <nextAction.icon className="h-3.5 w-3.5" />
                        </Button>
                    </Can>
                )}
                <Can permission="manage work orders">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        title={t('Delete')}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="text-muted-foreground/60 hover:text-rose-500"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </Can>
            </div>
        </div>
    );
}

function priorityVariant(priority: string): 'destructive' | 'warning' | 'info' | 'outline' {
    switch (priority) {
        case 'urgent': return 'destructive';
        case 'high': return 'warning';
        case 'medium': return 'info';
        default: return 'outline';
    }
}

function statusVariant(status: string): 'destructive' | 'warning' | 'info' | 'success' | 'outline' {
    switch (status) {
        case 'open': return 'destructive';
        case 'assigned': return 'warning';
        case 'in_progress': return 'info';
        case 'completed': return 'success';
        default: return 'outline';
    }
}

export function WorkOrderIndexSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-40" />
                <Skeleton className="mt-2 h-4 w-48" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-9 w-full max-w-md" />
            <Card className="shadow-elevation-1">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                ))}
            </Card>
        </div>
    );
}
