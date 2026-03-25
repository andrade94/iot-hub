import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, BreadcrumbItem } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import {
    AlertTriangle,
    ArrowUpDown,
    Bell,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    MoreHorizontal,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { useMemo } from 'react';

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
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Command Center', href: '/command-center' },
    { title: 'Alerts', href: '/command-center/alerts' },
];

export default function CommandCenterAlerts({ alerts }: Props) {
    const { t } = useLang();

    const criticalCount = alerts.data.filter((a) => a.severity === 'critical' && a.status === 'active').length;
    const highCount = alerts.data.filter((a) => a.severity === 'high' && a.status === 'active').length;
    const acknowledgedCount = alerts.data.filter((a) => a.status === 'acknowledged').length;

    const columns = useMemo<ColumnDef<Alert>[]>(
        () => [
            {
                accessorKey: 'severity',
                header: t('Severity'),
                cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
                meta: { className: 'w-[100px]' },
            },
            {
                id: 'alert',
                header: t('Alert'),
                cell: ({ row }) => (
                    <span className="text-sm font-medium">
                        {row.original.data?.rule_name ?? row.original.rule?.name ?? `Alert #${row.original.id}`}
                    </span>
                ),
            },
            {
                id: 'site',
                header: t('Site'),
                cell: ({ row }) => <span className="text-sm">{row.original.site?.name ?? '\u2014'}</span>,
            },
            {
                id: 'device',
                header: t('Device'),
                cell: ({ row }) => (
                    <div>
                        <p className="text-sm">{row.original.data?.device_name ?? row.original.device?.name ?? '\u2014'}</p>
                        {row.original.data?.zone && (
                            <p className="text-xs text-muted-foreground">{row.original.data.zone}</p>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'status',
                header: t('Status'),
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
            },
            {
                accessorKey: 'triggered_at',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        {t('Triggered')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => (
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatTimeAgo(row.original.triggered_at)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: t('Actions'),
                cell: ({ row }) => {
                    const alert = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon-sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    router.get(`/alerts/${alert.id}`);
                                }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    {t('View Details')}
                                </DropdownMenuItem>
                                {alert.status === 'active' && (
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        router.post(`/alerts/${alert.id}/acknowledge`, {}, { preserveScroll: true });
                                    }}>
                                        <Bell className="mr-2 h-4 w-4" />
                                        {t('Acknowledge')}
                                    </DropdownMenuItem>
                                )}
                                {alert.status !== 'resolved' && (
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        router.post(`/alerts/${alert.id}/resolve`, {}, { preserveScroll: true });
                                    }}>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        {t('Resolve')}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
                meta: { className: 'w-[70px]' },
            },
        ],
        [t],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Alert Queue')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header ------------------------------------------------ */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Alert Queue')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Alerts')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                        {alerts.total}
                                    </span>{' '}
                                    {t('unresolved alert(s) across all organizations')}
                                </p>
                            </div>

                            {/* Severity indicators */}
                            {(criticalCount > 0 || highCount > 0 || acknowledgedCount > 0) && (
                                <div className="flex flex-wrap gap-2">
                                    {criticalCount > 0 && (
                                        <SeverityPill color="red" count={criticalCount} label={t('critical')} pulse />
                                    )}
                                    {highCount > 0 && (
                                        <SeverityPill color="orange" count={highCount} label={t('high')} />
                                    )}
                                    {acknowledgedCount > 0 && (
                                        <SeverityPill color="amber" count={acknowledgedCount} label={t('acknowledged')} />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </FadeIn>

                {/* -- Alert Table ------------------------------------------- */}
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
                                data={alerts.data}
                                bordered={false}
                                getRowId={(row) => String(row.id)}
                                onRowClick={(alert) => router.get(`/alerts/${alert.id}`)}
                                rowClassName={(alert) =>
                                    alert.status === 'active' && alert.severity === 'critical'
                                        ? 'bg-red-50/50 hover:bg-red-50/80 dark:bg-red-950/10 dark:hover:bg-red-950/20'
                                        : 'hover:bg-muted/50'
                                }
                                emptyState={
                                    <div className="py-12 text-center">
                                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {t('No unresolved alerts')}
                                        </p>
                                    </div>
                                }
                            />

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
                                            onClick={() => alerts.prev_page_url && router.get(alerts.prev_page_url, {}, { preserveState: true })}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon-sm"
                                            disabled={!alerts.next_page_url}
                                            onClick={() => alerts.next_page_url && router.get(alerts.next_page_url, {}, { preserveState: true })}
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

/* -- Severity Pill (header indicator) ------------------------------------ */

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
        <div className={`flex items-center gap-2 rounded-full border ${c.border} ${c.bg} px-3 py-1.5`}>
            <span className={`h-2 w-2 rounded-full ${c.dot} ${pulse ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-medium ${c.text}`}>
                <span className="font-mono tabular-nums">{count}</span> {label}
            </span>
        </div>
    );
}

/* -- Severity Badge ------------------------------------------------------ */

function SeverityBadge({ severity }: { severity: string }) {
    const config: Record<string, { variant: 'destructive' | 'warning' | 'info' | 'outline'; icon: typeof ShieldAlert }> = {
        critical: { variant: 'destructive', icon: ShieldAlert },
        high: { variant: 'warning', icon: AlertTriangle },
        medium: { variant: 'info', icon: Bell },
        low: { variant: 'outline', icon: Bell },
    };
    const { variant, icon: Icon } = config[severity] ?? config.low;
    return (
        <Badge variant={variant} className="gap-1 text-xs">
            <Icon className="h-3 w-3" />
            {severity}
        </Badge>
    );
}

/* -- Status Badge -------------------------------------------------------- */

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'destructive' | 'warning' | 'success' | 'outline'> = {
        active: 'destructive',
        acknowledged: 'warning',
        resolved: 'success',
        dismissed: 'outline',
    };
    return <Badge variant={variants[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}
