import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, WorkOrder } from '@/types';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Wrench } from 'lucide-react';
import { useMemo } from 'react';

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

    const openCount = workOrders.data.filter((wo) => wo.status === 'open').length;
    const urgentCount = workOrders.data.filter((wo) => wo.priority === 'urgent' && wo.status !== 'completed').length;

    const columns = useMemo<ColumnDef<WorkOrder>[]>(
        () => [
            {
                accessorKey: 'title',
                header: t('Title'),
                cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
            },
            {
                accessorKey: 'type',
                header: t('Type'),
                cell: ({ row }) => <TypeBadge type={row.original.type} />,
            },
            {
                accessorKey: 'priority',
                header: t('Priority'),
                cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
            },
            {
                accessorKey: 'status',
                header: t('Status'),
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
            },
            {
                id: 'site',
                header: t('Site'),
                cell: ({ row }) => <span className="text-sm">{row.original.site?.name ?? '\u2014'}</span>,
            },
            {
                id: 'assigned_to',
                header: t('Assigned To'),
                cell: ({ row }) => <span className="text-sm">{row.original.assigned_user?.name ?? '\u2014'}</span>,
            },
            {
                accessorKey: 'created_at',
                header: t('Created'),
                cell: ({ row }) => (
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {new Date(row.original.created_at).toLocaleDateString()}
                    </span>
                ),
            },
        ],
        [t],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Work Orders \u2014 Command Center')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header ------------------------------------------------ */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Work Orders')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Work Orders')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                        {workOrders.total}
                                    </span>{' '}
                                    {t('work order(s) across all organizations')}
                                    {openCount > 0 && (
                                        <span className="ml-2 font-medium text-destructive">
                                            <span className="font-mono tabular-nums">{openCount}</span>{' '}
                                            {t('open')}
                                        </span>
                                    )}
                                    {urgentCount > 0 && (
                                        <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                                            <span className="font-mono tabular-nums">{urgentCount}</span>{' '}
                                            {t('urgent')}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* -- Work Orders Table ------------------------------------- */}
                <FadeIn delay={100} duration={500}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Queue')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card className="shadow-elevation-1">
                            <DataTable
                                columns={columns}
                                data={workOrders.data}
                                bordered={false}
                                getRowId={(row) => String(row.id)}
                                onRowClick={(wo) => router.get(`/work-orders/${wo.id}`)}
                                rowClassName={(wo) =>
                                    wo.priority === 'urgent' && wo.status !== 'completed'
                                        ? 'bg-red-50/30 hover:bg-red-50/50 dark:bg-red-950/10 dark:hover:bg-red-950/20'
                                        : 'hover:bg-muted/50'
                                }
                                emptyState={
                                    <div className="py-12 text-center">
                                        <Wrench className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                        <p className="mt-2 text-sm text-muted-foreground">{t('No work orders found')}</p>
                                    </div>
                                }
                            />

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
                </FadeIn>
            </div>
        </AppLayout>
    );
}

/* -- Badge Helpers ------------------------------------------------------- */

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
