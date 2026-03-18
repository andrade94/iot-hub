import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ShieldAlert,
} from 'lucide-react';

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Alert Queue')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Alert Queue')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {alerts.total} {t('unresolved alert(s) across all organizations')}
                    </p>
                </div>

                {criticalCount > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 dark:border-red-900 dark:bg-red-950/30">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-medium text-red-700 dark:text-red-400">
                                {criticalCount} {t('critical')}
                            </span>
                        </div>
                    </div>
                )}

                <Card className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">{t('Severity')}</TableHead>
                                <TableHead>{t('Alert')}</TableHead>
                                <TableHead>{t('Site')}</TableHead>
                                <TableHead>{t('Device')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Triggered')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {alerts.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center">
                                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {t('No unresolved alerts')}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                alerts.data.map((alert) => (
                                    <TableRow
                                        key={alert.id}
                                        className={`cursor-pointer ${
                                            alert.status === 'active' && alert.severity === 'critical'
                                                ? 'bg-red-50/50 dark:bg-red-950/10'
                                                : ''
                                        }`}
                                        onClick={() => router.get(`/alerts/${alert.id}`)}
                                    >
                                        <TableCell>
                                            <SeverityBadge severity={alert.severity} />
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium">
                                                {alert.data?.rule_name ?? alert.rule?.name ?? `Alert #${alert.id}`}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {alert.site?.name ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="text-sm">{alert.data?.device_name ?? alert.device?.name ?? '—'}</p>
                                                {alert.data?.zone && (
                                                    <p className="text-xs text-muted-foreground">{alert.data.zone}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={alert.status} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {formatTimeAgo(alert.triggered_at)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {alerts.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-xs text-muted-foreground">
                                {t('Page')} {alerts.current_page} {t('of')} {alerts.last_page}
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
        </AppLayout>
    );
}

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

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'destructive' | 'warning' | 'success' | 'outline'> = {
        active: 'destructive',
        acknowledged: 'warning',
        resolved: 'success',
        dismissed: 'outline',
    };
    return <Badge variant={variants[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}

function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
