import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, WorkOrder } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Wrench } from 'lucide-react';

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
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Command Center', href: '/command-center' },
    { title: 'Work Orders', href: '/command-center/work-orders' },
];

export default function CommandCenterWorkOrders({ workOrders }: Props) {
    const { t } = useLang();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Work Orders — Command Center')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Work Orders')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {workOrders.total} {t('work order(s) across all organizations')}
                    </p>
                </div>

                <Card className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Title')}</TableHead>
                                <TableHead>{t('Type')}</TableHead>
                                <TableHead>{t('Priority')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Site')}</TableHead>
                                <TableHead>{t('Assigned To')}</TableHead>
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
                                    <TableRow
                                        key={wo.id}
                                        className="cursor-pointer"
                                        onClick={() => router.get(`/work-orders/${wo.id}`)}
                                    >
                                        <TableCell className="font-medium">{wo.title}</TableCell>
                                        <TableCell><TypeBadge type={wo.type} /></TableCell>
                                        <TableCell><PriorityBadge priority={wo.priority} /></TableCell>
                                        <TableCell><StatusBadge status={wo.status} /></TableCell>
                                        <TableCell className="text-sm">{wo.site?.name ?? '—'}</TableCell>
                                        <TableCell className="text-sm">{wo.assigned_user?.name ?? '—'}</TableCell>
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
                            <p className="text-xs text-muted-foreground">
                                {t('Page')} {workOrders.current_page} {t('of')} {workOrders.last_page}
                            </p>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    disabled={!workOrders.prev_page_url}
                                    onClick={() => workOrders.prev_page_url && router.get(workOrders.prev_page_url, {}, { preserveState: true })}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    disabled={!workOrders.next_page_url}
                                    onClick={() => workOrders.next_page_url && router.get(workOrders.next_page_url, {}, { preserveState: true })}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

function TypeBadge({ type }: { type: string }) {
    const labels: Record<string, string> = {
        battery_replace: 'Battery',
        sensor_replace: 'Sensor',
        maintenance: 'Maint.',
        inspection: 'Inspect',
        install: 'Install',
    };
    return <Badge variant="outline" className="text-xs">{labels[type] ?? type}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
    const v: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
        urgent: 'destructive',
        high: 'warning',
        medium: 'info',
        low: 'outline',
    };
    return <Badge variant={v[priority] ?? 'outline'} className="text-xs">{priority}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
    const v: Record<string, 'destructive' | 'warning' | 'success' | 'info' | 'outline'> = {
        open: 'destructive',
        assigned: 'warning',
        in_progress: 'info',
        completed: 'success',
        cancelled: 'outline',
    };
    return <Badge variant={v[status] ?? 'outline'} className="text-xs">{status.replace('_', ' ')}</Badge>;
}
