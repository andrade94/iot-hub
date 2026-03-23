import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, WorkOrder } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Filter, Plus, UserPlus, Wrench } from 'lucide-react';
import { useState } from 'react';

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

interface Props {
    workOrders: PaginatedWorkOrders;
    filters: { status?: string; priority?: string; type?: string; assigned?: string };
    isTechnician?: boolean;
    technicians?: Technician[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Work Orders', href: '/work-orders' },
];

export default function WorkOrderIndex({ workOrders, filters, isTechnician, technicians = [] }: Props) {
    const { t } = useLang();
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const assignableWOs = workOrders.data.filter((wo) => ['open', 'assigned'].includes(wo.status));
    const allSelected = assignableWOs.length > 0 && assignableWOs.every((wo) => selectedIds.includes(wo.id));

    function toggleSelect(id: number) {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    }

    function toggleSelectAll() {
        setSelectedIds(allSelected ? [] : assignableWOs.map((wo) => wo.id));
    }

    function bulkAssign(techId: number) {
        router.post('/work-orders/bulk-assign', { ids: selectedIds, assigned_to: techId }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    }

    function applyFilter(key: string, value: string | undefined) {
        const params: Record<string, string> = { ...filters };
        if (value && value !== 'all') params[key] = value;
        else delete params[key];
        router.get('/work-orders', params, { preserveState: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Work Orders')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Work Orders')}</h1>
                        <p className="text-sm text-muted-foreground">{workOrders.total} {t('total')}</p>
                    </div>
                    <Can permission="manage work orders">
                        <Button disabled title={t('Work orders are auto-created from device health checks')}>
                            <Plus className="mr-2 h-4 w-4" />{t('New Work Order')}
                        </Button>
                    </Can>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="flex flex-wrap items-center gap-3 p-3">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <Button
                            variant={filters.assigned === 'me' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => applyFilter('assigned', filters.assigned === 'me' ? undefined : 'me')}
                        >
                            {t('My Work Orders')}
                        </Button>
                        <Select value={filters.status ?? 'all'} onValueChange={(v) => applyFilter('status', v)}>
                            <SelectTrigger className="w-[140px]"><SelectValue placeholder={t('Status')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Status')}</SelectItem>
                                <SelectItem value="open">{t('Open')}</SelectItem>
                                <SelectItem value="assigned">{t('Assigned')}</SelectItem>
                                <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                                <SelectItem value="completed">{t('Completed')}</SelectItem>
                                <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filters.priority ?? 'all'} onValueChange={(v) => applyFilter('priority', v)}>
                            <SelectTrigger className="w-[130px]"><SelectValue placeholder={t('Priority')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Priority')}</SelectItem>
                                <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                                <SelectItem value="high">{t('High')}</SelectItem>
                                <SelectItem value="medium">{t('Medium')}</SelectItem>
                                <SelectItem value="low">{t('Low')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filters.type ?? 'all'} onValueChange={(v) => applyFilter('type', v)}>
                            <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('Type')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Types')}</SelectItem>
                                <SelectItem value="battery_replace">{t('Battery Replace')}</SelectItem>
                                <SelectItem value="sensor_replace">{t('Sensor Replace')}</SelectItem>
                                <SelectItem value="maintenance">{t('Maintenance')}</SelectItem>
                                <SelectItem value="inspection">{t('Inspection')}</SelectItem>
                                <SelectItem value="install">{t('Install')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {!isTechnician && (
                                    <TableHead className="w-[40px]">
                                        <Checkbox
                                            checked={allSelected && assignableWOs.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                )}
                                <TableHead>{t('Title')}</TableHead>
                                <TableHead>{t('Type')}</TableHead>
                                <TableHead>{t('Priority')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Assigned To')}</TableHead>
                                <TableHead>{t('Site')}</TableHead>
                                <TableHead>{t('Created')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workOrders.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isTechnician ? 7 : 8} className="p-0">
                                        <EmptyState
                                            size="sm"
                                            variant="muted"
                                            icon={<Wrench className="h-5 w-5 text-muted-foreground" />}
                                            title={filters.status || filters.priority || filters.type || filters.assigned
                                                ? t('No work orders match these filters')
                                                : t('No work orders yet')}
                                            description={filters.status || filters.priority || filters.type || filters.assigned
                                                ? t('Try adjusting your filters')
                                                : t('Work orders are created automatically from alerts or manually by managers')}
                                            action={filters.status || filters.priority || filters.type || filters.assigned ? (
                                                <Button variant="outline" size="sm" onClick={() => router.get('/work-orders', {}, { preserveState: true, replace: true })}>
                                                    {t('Clear filters')}
                                                </Button>
                                            ) : undefined}
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                workOrders.data.map((wo) => (
                                    <TableRow key={wo.id} className={`cursor-pointer ${selectedIds.includes(wo.id) ? 'bg-accent/50' : ''}`} onClick={() => router.get(`/work-orders/${wo.id}`)}>
                                        {!isTechnician && (
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                {['open', 'assigned'].includes(wo.status) && (
                                                    <Checkbox
                                                        checked={selectedIds.includes(wo.id)}
                                                        onCheckedChange={() => toggleSelect(wo.id)}
                                                        aria-label={`Select WO ${wo.id}`}
                                                    />
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell className="font-medium">{wo.title}</TableCell>
                                        <TableCell><TypeBadge type={wo.type} /></TableCell>
                                        <TableCell><PriorityBadge priority={wo.priority} /></TableCell>
                                        <TableCell><StatusBadge status={wo.status} /></TableCell>
                                        <TableCell className="text-sm">{wo.assigned_user?.name ?? '—'}</TableCell>
                                        <TableCell className="text-sm">{wo.site?.name ?? '—'}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(wo.created_at).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {workOrders.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-xs text-muted-foreground">{t('Page')} {workOrders.current_page} {t('of')} {workOrders.last_page}</p>
                            <div className="flex gap-1">
                                <Button variant="outline" size="icon-sm" disabled={!workOrders.prev_page_url} onClick={() => workOrders.prev_page_url && router.get(workOrders.prev_page_url, {}, { preserveState: true })}><ChevronLeft className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon-sm" disabled={!workOrders.next_page_url} onClick={() => workOrders.next_page_url && router.get(workOrders.next_page_url, {}, { preserveState: true })}><ChevronRight className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {!isTechnician && technicians.length > 0 && (
                <BulkActionBar selectedCount={selectedIds.length} onClear={() => setSelectedIds([])}>
                    <Select onValueChange={(v) => bulkAssign(Number(v))}>
                        <SelectTrigger className="bg-primary-foreground text-foreground w-[200px]">
                            <UserPlus className="mr-2 h-4 w-4" />
                            <SelectValue placeholder={t('Assign to...')} />
                        </SelectTrigger>
                        <SelectContent>
                            {technicians.map((tech) => (
                                <SelectItem key={tech.id} value={String(tech.id)}>
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

function TypeBadge({ type }: { type: string }) {
    return <Badge variant="outline" className="text-xs">{type.replace('_', ' ')}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
    const v: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = { urgent: 'destructive', high: 'warning', medium: 'info', low: 'outline' };
    return <Badge variant={v[priority] ?? 'outline'} className="text-xs">{priority}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
    const v: Record<string, 'destructive' | 'warning' | 'success' | 'info' | 'outline'> = { open: 'destructive', assigned: 'warning', in_progress: 'info', completed: 'success', cancelled: 'outline' };
    return <Badge variant={v[status] ?? 'outline'} className="text-xs">{status.replace('_', ' ')}</Badge>;
}

export function WorkOrderIndexSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <div className="flex items-center justify-between"><Skeleton className="h-7 w-36" /><Skeleton className="h-9 w-40" /></div>
            <Card><CardContent className="flex gap-3 p-3"><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-[140px]" /><Skeleton className="h-9 w-[130px]" /></CardContent></Card>
            <Card>
                <Table>
                    <TableHeader><TableRow>
                        {Array.from({ length: 7 }).map((_, i) => <TableHead key={i}><Skeleton className="h-3 w-16" /></TableHead>)}
                    </TableRow></TableHeader>
                    <TableBody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-3 w-16" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
