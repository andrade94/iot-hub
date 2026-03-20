import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
    Eye,
    Filter,
    ShieldAlert,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

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

export default function AlertIndex({ alerts, filters }: Props) {
    const { t } = useLang();
    const [dateFrom, setDateFrom] = useState(filters.from ?? '');
    const [dateTo, setDateTo] = useState(filters.to ?? '');

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

    // Stats from current page
    const activeCount = alerts.data.filter((a) => a.status === 'active').length;
    const criticalCount = alerts.data.filter((a) => a.severity === 'critical' && a.status === 'active').length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Alerts')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Alerts')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {alerts.total} {t('alert(s)')}
                            {activeCount > 0 && (
                                <span className="ml-2 text-destructive font-medium">
                                    {activeCount} {t('active')}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Severity summary pills */}
                {activeCount > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {criticalCount > 0 && (
                            <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 dark:border-red-900 dark:bg-red-950/30">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs font-medium text-red-700 dark:text-red-400">
                                    {criticalCount} {t('critical')}
                                </span>
                            </div>
                        )}
                        {alerts.data.filter((a) => a.severity === 'high' && a.status === 'active').length > 0 && (
                            <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 dark:border-orange-900 dark:bg-orange-950/30">
                                <span className="h-2 w-2 rounded-full bg-orange-500" />
                                <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                                    {alerts.data.filter((a) => a.severity === 'high' && a.status === 'active').length} {t('high')}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Filters */}
                <Card>
                    <CardContent className="p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Filter className="h-3.5 w-3.5" />
                                {t('Filter')}
                            </div>
                            <Select
                                value={filters.severity ?? 'all'}
                                onValueChange={(v) => applyFilter('severity', v)}
                            >
                                <SelectTrigger className="w-[130px]">
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
                            <Select
                                value={filters.status ?? 'all'}
                                onValueChange={(v) => applyFilter('status', v)}
                            >
                                <SelectTrigger className="w-[150px]">
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
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    className="w-[140px]"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    placeholder={t('From')}
                                />
                                <span className="text-xs text-muted-foreground">—</span>
                                <Input
                                    type="date"
                                    className="w-[140px]"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    placeholder={t('To')}
                                />
                                <Button variant="secondary" size="sm" onClick={applyDateFilter}>
                                    {t('Apply')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Alert Table */}
                <Card className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">{t('Severity')}</TableHead>
                                <TableHead>{t('Alert')}</TableHead>
                                <TableHead>{t('Device')}</TableHead>
                                <TableHead>{t('Reading')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Time')}</TableHead>
                                <TableHead className="text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {alerts.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="p-0">
                                        <EmptyState
                                            size="sm"
                                            variant="muted"
                                            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                            title={filters.severity || filters.status || filters.from
                                                ? t('No alerts match these filters')
                                                : t('All clear — no alerts')}
                                            description={filters.severity || filters.status || filters.from
                                                ? t('Try adjusting your filters to see more results')
                                                : t('Your devices are operating within normal thresholds')}
                                            action={filters.severity || filters.status || filters.from ? (
                                                <Button variant="outline" size="sm" onClick={() => router.get('/alerts', {}, { preserveState: true, replace: true })}>
                                                    {t('Clear filters')}
                                                </Button>
                                            ) : undefined}
                                        />
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
                                                {alert.data?.rule_name ?? `Alert #${alert.id}`}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="text-sm">{alert.data?.device_name ?? '—'}</p>
                                                {alert.data?.zone && (
                                                    <p className="text-xs text-muted-foreground">{alert.data.zone}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {alert.data?.metric && (
                                                <span className="font-mono text-sm">
                                                    {alert.data.metric}: {alert.data.value}
                                                    {alert.data.threshold !== null && (
                                                        <span className="text-muted-foreground">
                                                            {' '}/ {alert.data.threshold}
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={alert.status} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {formatTimeAgo(alert.triggered_at)}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1">
                                                {alert.status === 'active' && (
                                                    <Can permission="acknowledge alerts">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title={t('Acknowledge')}
                                                            onClick={() =>
                                                                router.post(`/alerts/${alert.id}/acknowledge`, {}, { preserveScroll: true })
                                                            }
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title={t('Resolve')}
                                                            onClick={() =>
                                                                router.post(`/alerts/${alert.id}/resolve`, {}, { preserveScroll: true })
                                                            }
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                        </Button>
                                                    </Can>
                                                )}
                                                {alert.status === 'acknowledged' && (
                                                    <Can permission="acknowledge alerts">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title={t('Resolve')}
                                                            onClick={() =>
                                                                router.post(`/alerts/${alert.id}/resolve`, {}, { preserveScroll: true })
                                                            }
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                        </Button>
                                                    </Can>
                                                )}
                                                {(alert.status === 'active' || alert.status === 'acknowledged') && (
                                                    <Can permission="manage alert rules">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title={t('Dismiss')}
                                                            onClick={() =>
                                                                router.post(`/alerts/${alert.id}/dismiss`, {}, { preserveScroll: true })
                                                            }
                                                        >
                                                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </Button>
                                                    </Can>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
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
                                    onClick={() =>
                                        alerts.prev_page_url &&
                                        router.get(alerts.prev_page_url, {}, { preserveState: true })
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
                                        router.get(alerts.next_page_url, {}, { preserveState: true })
                                    }
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

/* ── Sub-components ───────────────────────────────── */

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

    return (
        <Badge variant={variants[status] ?? 'outline'} className="text-xs">
            {status}
        </Badge>
    );
}

function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

export function AlertIndexSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <Skeleton className="h-7 w-32" />
            <Card><CardContent className="p-3"><div className="flex gap-3"><Skeleton className="h-9 w-[130px]" /><Skeleton className="h-9 w-[150px]" /><Skeleton className="h-9 w-[140px]" /></div></CardContent></Card>
            <Card>
                <Table>
                    <TableHeader><TableRow>
                        {['w-[100px]','','','','','','text-right'].map((c, i) => <TableHead key={i} className={c}><Skeleton className="h-3 w-16" /></TableHead>)}
                    </TableRow></TableHeader>
                    <TableBody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /><Skeleton className="mt-1 h-3 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20 font-mono" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-3 w-12" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="ml-auto h-7 w-16" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
