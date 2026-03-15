import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, WorkOrder } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Filter, Wrench } from 'lucide-react';

interface PaginatedWorkOrders {
    data: WorkOrder[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    workOrders: PaginatedWorkOrders;
    filters: { status?: string; priority?: string; type?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Work Orders', href: '/work-orders' },
];

export default function WorkOrderIndex({ workOrders, filters }: Props) {
    const { t } = useLang();

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
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="flex flex-wrap items-center gap-3 p-3">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
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
                                    <TableCell colSpan={7} className="py-12 text-center">
                                        <Wrench className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                        <p className="mt-2 text-sm text-muted-foreground">{t('No work orders found')}</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                workOrders.data.map((wo) => (
                                    <TableRow key={wo.id} className="cursor-pointer" onClick={() => router.get(`/work-orders/${wo.id}`)}>
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
        </AppLayout>
    );
}

function TypeBadge({ type }: { type: string }) {
    const labels: Record<string, string> = { battery_replace: 'Battery', sensor_replace: 'Sensor', maintenance: 'Maint.', inspection: 'Inspect', install: 'Install' };
    return <Badge variant="outline" className="text-xs">{labels[type] ?? type}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
    const v: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = { urgent: 'destructive', high: 'warning', medium: 'info', low: 'outline' };
    return <Badge variant={v[priority] ?? 'outline'} className="text-xs">{priority}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
    const v: Record<string, 'destructive' | 'warning' | 'success' | 'info' | 'outline'> = { open: 'destructive', assigned: 'warning', in_progress: 'info', completed: 'success', cancelled: 'outline' };
    return <Badge variant={v[status] ?? 'outline'} className="text-xs">{status.replace('_', ' ')}</Badge>;
}
