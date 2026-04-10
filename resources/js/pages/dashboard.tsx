import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowRight,
    ArrowUp,
    BatteryLow,
    CheckCircle2,
    ChevronRight,
    Clock,
    Cpu,
    Download,
    FileText,
    LayoutGrid,
    Map,
    MapPin,
    Radio,
    Signal,
    Thermometer,
    Wrench,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        L: any;
    }
}

/* ── Types ─────────────────────────────────────────────────── */

interface SiteStat {
    id: number;
    name: string;
    slug?: string | null;
    status: 'active' | 'inactive' | 'onboarding';
    timezone?: string | null;
    device_count: number;
    online_count: number;
    active_alerts: number;
    critical_alerts: number;
    open_work_orders: number;
    latitude?: number | null;
    longitude?: number | null;
}

interface DashboardKPIs {
    total_devices: number;
    online_devices: number;
    active_alerts: number;
    open_work_orders: number;
    critical_alerts: number;
    high_alerts: number;
    overdue_work_orders: number;
    alerts_delta: number;
    wos_delta: number;
    devices_spark: number[];
    online_spark: number[];
    alerts_spark: number[];
    wos_spark: number[];
}

interface FleetBreakdown {
    online: number;
    low_battery: number;
    offline: number;
    idle: number;
}

interface ActionCards {
    unacknowledged_alerts: number;
    overdue_work_orders: number;
    critical_battery: number;
}

interface GatewayRecord {
    id: number;
    serial: string;
    model: string;
    site_name: string;
    device_count: number;
    status: 'online' | 'offline';
    last_seen_at: string | null;
    last_seen_ago: string;
}

interface RecentAlert {
    id: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: string;
    rule_name: string;
    device_name: string | null;
    device_model: string | null;
    zone: string | null;
    site_name: string | null;
    triggered_at: string;
    triggered_ago: string;
}

interface MaintenanceUpcoming {
    id: number;
    site_name: string;
    zone: string | null;
    title: string;
    start_time: string;
    duration_minutes: number;
    suppress_alerts: boolean;
    minutes_until: number;
}

interface ExcursionRecord {
    id: number;
    zone: string;
    device_name: string | null;
    site_name: string | null;
    delta_c: number | null;
    peak_value: number | null;
    duration_minutes: number;
    status: 'active' | 'recovered';
}

interface ComplianceData {
    percentage: number;
    compliant_zones: number;
    total_zones: number;
    excursion_free_minutes: number;
    total_month_minutes: number;
    total_excursions: number;
}

interface ActivityRecord {
    id: number;
    description: string;
    causer_name: string;
    subject_type: string;
    created_at: string;
    created_ago: string;
}

interface RecentReport {
    title: string;
    type: string;
    generated_at: string | null;
    generated_ago: string;
    source: 'schedule' | 'export';
}

interface Freshness {
    as_of: string;
    last_broadcast: string | null;
    last_broadcast_ago: string;
}

interface Props {
    kpis: DashboardKPIs;
    fleet: FleetBreakdown;
    siteStats: SiteStat[];
    actionCards: ActionCards;
    gateways: GatewayRecord[];
    gatewayStats: { total: number; online: number };
    recentAlerts: RecentAlert[];
    maintenanceUpcoming: MaintenanceUpcoming[];
    excursions: ExcursionRecord[];
    compliance: ComplianceData | null;
    recentActivity: ActivityRecord[];
    recentReports: RecentReport[];
    freshness: Freshness;
    range: number;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

const statusBadgeVariant: Record<string, 'outline-success' | 'outline-warning' | 'outline'> = {
    active: 'outline-success',
    onboarding: 'outline-warning',
    inactive: 'outline',
};

/**
 * Compact duration formatter.
 * 8 → "8m", 75 → "1h 15m", 60 → "1h", 2880 → "2d"
 */
function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m === 0 ? `${h}h` : `${h}h ${m}m`;
    }
    const d = Math.floor(minutes / 1440);
    const remainder = minutes % 1440;
    const h = Math.floor(remainder / 60);
    return h === 0 ? `${d}d` : `${d}d ${h}h`;
}

/* ── Main Component ─────────────────────────────────────────── */

export default function Dashboard({
    kpis,
    fleet,
    siteStats,
    actionCards,
    gateways,
    gatewayStats,
    recentAlerts,
    maintenanceUpcoming,
    excursions,
    compliance,
    recentActivity,
    recentReports,
    freshness,
    range,
}: Props) {
    const { t } = useLang();
    const { current_organization, auth, active_outage } = usePage<SharedData>().props;
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const roles = auth?.roles ?? [];
    const isViewerOnly = roles.includes('client_site_viewer') && roles.length === 1;
    const isTechnician =
        roles.includes('technician') &&
        !roles.includes('client_site_manager') &&
        !roles.includes('client_org_admin') &&
        !roles.includes('super_admin');

    const healthPct =
        kpis.total_devices > 0 ? Math.round((kpis.online_devices / kpis.total_devices) * 100) : 0;

    const hasActions =
        actionCards.unacknowledged_alerts > 0 ||
        (!isViewerOnly && actionCards.overdue_work_orders > 0) ||
        (!isViewerOnly && !isTechnician && actionCards.critical_battery > 0);

    const setRange = (days: number) => {
        router.get('/dashboard', { range: days }, { preserveScroll: true, preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Dashboard')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Outage Banner */}
                {active_outage && (
                    <FadeIn direction="down" duration={300}>
                        <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                <div>
                                    <p className="font-medium text-red-800 dark:text-red-200">{t('Platform outage declared')}</p>
                                    <p className="text-sm text-red-700 dark:text-red-300">{active_outage.reason}</p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                )}

                {/* Maintenance window strip */}
                {maintenanceUpcoming.length > 0 && (
                    <FadeIn direction="down" duration={300}>
                        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 border-l-4 border-l-amber-500 bg-amber-500/5 p-3">
                            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div className="flex-1 space-y-1">
                                <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                    {maintenanceUpcoming.length === 1
                                        ? t('1 maintenance window starting soon')
                                        : t(':count maintenance windows starting soon').replace(':count', String(maintenanceUpcoming.length))}
                                </p>
                                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                                    {maintenanceUpcoming.map((m) => (
                                        <span key={m.id}>
                                            <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                                                {m.start_time.slice(0, 5)}
                                            </span>{' '}
                                            <span className="font-mono text-amber-600/80 dark:text-amber-400/80">
                                                ({t('in')} {m.minutes_until} {t('min')})
                                            </span>{' '}
                                            · <strong className="text-foreground">{m.site_name}</strong>
                                            {m.zone && ` · ${m.zone}`} · {formatDuration(m.duration_minutes)}
                                            {m.suppress_alerts && ` · ${t('suppresses alerts')}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                )}

                {/* Hero Header */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
                            <div>
                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Command Center')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {current_organization?.name ?? t('Dashboard')}
                                </h1>
                                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    {siteStats.length > 0 ? (
                                        <>
                                            <span>
                                                <span className="font-mono font-medium text-foreground">{siteStats.length}</span>{' '}
                                                {t('sites accessible')}
                                            </span>
                                            <span className="text-muted-foreground/50">·</span>
                                            <span>
                                                <span className="font-mono font-medium text-foreground">{kpis.total_devices}</span>{' '}
                                                {t('devices tracked')}
                                            </span>
                                            <span className="text-muted-foreground/50">·</span>
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-500">
                                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                                {t('LIVE')}
                                            </span>
                                        </>
                                    ) : (
                                        t('No sites configured yet')
                                    )}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <ButtonGroup>
                                    <Button
                                        variant={range === 1 ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 font-mono text-[11px]"
                                        onClick={() => setRange(1)}
                                    >
                                        24H
                                    </Button>
                                    <Button
                                        variant={range === 7 ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 font-mono text-[11px]"
                                        onClick={() => setRange(7)}
                                    >
                                        7D
                                    </Button>
                                    <Button
                                        variant={range === 30 ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 font-mono text-[11px]"
                                        onClick={() => setRange(30)}
                                    >
                                        30D
                                    </Button>
                                </ButtonGroup>
                                {siteStats.length > 0 && (
                                    <ButtonGroup>
                                        <Button
                                            variant={viewMode === 'grid' ? 'default' : 'outline'}
                                            size="sm"
                                            className="h-8 gap-1.5 px-3 text-xs"
                                            onClick={() => setViewMode('grid')}
                                        >
                                            <LayoutGrid className="h-3.5 w-3.5" />
                                            {t('Grid')}
                                        </Button>
                                        <Button
                                            variant={viewMode === 'map' ? 'default' : 'outline'}
                                            size="sm"
                                            className="h-8 gap-1.5 px-3 text-xs"
                                            onClick={() => setViewMode('map')}
                                        >
                                            <Map className="h-3.5 w-3.5" />
                                            {t('Map')}
                                        </Button>
                                    </ButtonGroup>
                                )}
                                <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs" title={t('Snapshot as PDF')}>
                                    <Download className="h-3.5 w-3.5" />
                                    {t('Snapshot')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* KPI Strip with sparklines + trend */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label={t('Total Devices')}
                        value={kpis.total_devices}
                        icon={<Cpu className="h-4 w-4" />}
                        tone="info"
                        spark={kpis.devices_spark}
                        subtitle={
                            kpis.total_devices > 0
                                ? `${kpis.online_devices}/${kpis.total_devices} ${t('online')}`
                                : t('no devices yet')
                        }
                    />
                    <KpiCard
                        label={t('Fleet Health')}
                        value={`${healthPct}%`}
                        icon={<Signal className="h-4 w-4" />}
                        tone="good"
                        spark={kpis.online_spark}
                        subtitle={
                            kpis.total_devices > 0
                                ? `${kpis.online_devices} ${t('online')} · ${fleet.offline} ${t('offline')}`
                                : '—'
                        }
                    />
                    <KpiCard
                        label={t('Active Alerts')}
                        value={kpis.active_alerts}
                        icon={<AlertTriangle className="h-4 w-4" />}
                        tone={kpis.critical_alerts > 0 ? 'danger' : kpis.active_alerts > 0 ? 'warning' : 'neutral'}
                        spark={kpis.alerts_spark}
                        trend={kpis.alerts_delta}
                        trendGood="down"
                        subtitle={
                            kpis.active_alerts > 0
                                ? `${kpis.critical_alerts} ${t('critical')} · ${kpis.high_alerts} ${t('high')}`
                                : t('all clear')
                        }
                    />
                    <KpiCard
                        label={t('Open Work Orders')}
                        value={kpis.open_work_orders}
                        icon={<Wrench className="h-4 w-4" />}
                        tone={kpis.overdue_work_orders > 0 ? 'warning' : 'neutral'}
                        spark={kpis.wos_spark}
                        trend={kpis.wos_delta}
                        trendGood="down"
                        subtitle={
                            kpis.overdue_work_orders > 0
                                ? `${kpis.overdue_work_orders} ${t('overdue SLA')}`
                                : t('on schedule')
                        }
                    />
                </div>

                {/* Gateway Status Card */}
                {gateways.length > 0 && (
                    <FadeIn delay={100} duration={400}>
                        <Card className="shadow-elevation-1">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        <Radio className="mr-1.5 inline-block h-3 w-3 align-[-0.125em]" />
                                        {t('Gateways')} ·{' '}
                                        <span
                                            className={cn(
                                                'font-semibold',
                                                gatewayStats.online === gatewayStats.total
                                                    ? 'text-emerald-500'
                                                    : 'text-amber-500',
                                            )}
                                        >
                                            {gatewayStats.online}/{gatewayStats.total} {t('reporting')}
                                        </span>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => router.get('/settings/gateways')}
                                        className="font-mono text-[10px] text-primary hover:text-primary/80"
                                    >
                                        {t('GATEWAY CATALOG')} →
                                    </button>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {gateways.map((gw) => (
                                        <div
                                            key={gw.id}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                                                gw.status === 'online'
                                                    ? 'border-border/50 bg-muted/20 hover:bg-muted/40'
                                                    : 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'h-2 w-2 shrink-0 rounded-full',
                                                    gw.status === 'online'
                                                        ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                                                        : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]',
                                                )}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-baseline gap-1.5 text-xs">
                                                    <span className="truncate font-medium">{gw.serial}</span>
                                                    <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60">
                                                        {gw.site_name}
                                                    </span>
                                                </p>
                                                <p
                                                    className={cn(
                                                        'mt-0.5 truncate font-mono text-[10px]',
                                                        gw.status === 'online' ? 'text-muted-foreground' : 'text-rose-500',
                                                    )}
                                                >
                                                    {gw.device_count} {t('devices')} ·{' '}
                                                    {gw.status === 'online'
                                                        ? `${t('last packet')} ${gw.last_seen_ago} ${t('ago')}`
                                                        : `${t('OFFLINE')} · ${gw.last_seen_ago} ${t('ago')}`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* Fleet Health donut + Live alert feed */}
                {(kpis.total_devices > 0 || recentAlerts.length > 0) && (
                    <div className="grid gap-4 lg:grid-cols-5">
                        {kpis.total_devices > 0 && (
                            <FadeIn delay={120} duration={500} className="lg:col-span-2">
                                <Card className="h-full shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4 flex items-center justify-between">
                                            <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {t('Fleet Health')}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => router.get('/devices')}
                                                className="font-mono text-[10px] text-primary hover:text-primary/80"
                                            >
                                                {t('ALL DEVICES')} →
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <HealthDonut pct={healthPct} />
                                            <div className="flex-1 space-y-2.5">
                                                <FleetRow dot="emerald" label={t('Online')} count={fleet.online} />
                                                <FleetRow dot="amber" label={`${t('Low battery')} (< 20%)`} count={fleet.low_battery} />
                                                <FleetRow dot="rose" label={`${t('Offline')} (> 15 min)`} count={fleet.offline} />
                                                <FleetRow dot="muted" label={t('Idle / maintenance')} count={fleet.idle} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}

                        {recentAlerts.length > 0 && (
                            <FadeIn delay={170} duration={500} className="lg:col-span-3">
                                <Card className="h-full shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4 flex items-center justify-between">
                                            <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {t('Recent alerts')} · {t('last 5')}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => router.get('/alerts')}
                                                className="font-mono text-[10px] text-primary hover:text-primary/80"
                                            >
                                                {t('VIEW ALL')} →
                                            </button>
                                        </div>
                                        <div className="-mx-2 space-y-0.5">
                                            {recentAlerts.map((a) => (
                                                <button
                                                    key={a.id}
                                                    type="button"
                                                    onClick={() => router.get(`/alerts/${a.id}`)}
                                                    className="group flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted/50"
                                                >
                                                    <span
                                                        className={cn(
                                                            'h-8 w-[3px] shrink-0 rounded-sm',
                                                            a.severity === 'critical' && 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]',
                                                            a.severity === 'high' && 'bg-amber-500',
                                                            a.severity === 'medium' && 'bg-cyan-500',
                                                            a.severity === 'low' && 'bg-muted-foreground/50',
                                                        )}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-medium">{a.rule_name}</p>
                                                        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                                                            {a.device_name && (
                                                                <span className="text-muted-foreground">{a.device_model ?? 'device'}</span>
                                                            )}
                                                            {a.zone && ` · zone: ${a.zone}`}
                                                            {a.site_name && <> · {a.site_name}</>}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">
                                                        {a.triggered_ago}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}
                    </div>
                )}

                {/* Needs Attention */}
                {hasActions && (
                    <div className="grid gap-3 sm:grid-cols-3">
                        {actionCards.unacknowledged_alerts > 0 && (
                            <ActionItem
                                icon={<AlertTriangle className="h-4 w-4" />}
                                tone="critical"
                                count={actionCards.unacknowledged_alerts}
                                label={t('critical alerts unacknowledged')}
                                onClick={() => router.get('/alerts?status=active')}
                            />
                        )}
                        {!isViewerOnly && actionCards.overdue_work_orders > 0 && (
                            <ActionItem
                                icon={<Clock className="h-4 w-4" />}
                                tone="warning"
                                count={actionCards.overdue_work_orders}
                                label={t('work orders past SLA')}
                                onClick={() => router.get('/work-orders?overdue=1')}
                            />
                        )}
                        {!isViewerOnly && !isTechnician && actionCards.critical_battery > 0 && (
                            <ActionItem
                                icon={<BatteryLow className="h-4 w-4" />}
                                tone="info"
                                count={actionCards.critical_battery}
                                label={t('sensors with battery < 20%')}
                                onClick={() => router.get('/devices?battery=critical')}
                            />
                        )}
                    </div>
                )}

                {/* HACCP Compliance (cold chain only) */}
                {compliance && (
                    <FadeIn delay={150} duration={400}>
                        <Card className="shadow-elevation-1 border-l-4 border-l-emerald-500">
                            <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
                                <div>
                                    <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('HACCP')} · {t('This month')}
                                    </p>
                                    <p className="font-display mt-1 text-3xl font-bold tabular-nums text-emerald-500">
                                        {compliance.percentage}
                                        <span className="text-lg text-muted-foreground">%</span>
                                    </p>
                                </div>
                                <div className="grid flex-1 min-w-[280px] grid-cols-3 gap-6">
                                    <ComplianceStat
                                        label={t('Excursion-free')}
                                        value={`${Math.floor(compliance.excursion_free_minutes / 60)}h ${compliance.excursion_free_minutes % 60}m`}
                                        sub={`/ ${Math.floor(compliance.total_month_minutes / 60)}h`}
                                    />
                                    <ComplianceStat
                                        label={t('Zones in compliance')}
                                        value={String(compliance.compliant_zones)}
                                        sub={`/ ${compliance.total_zones} ${t('zones')}`}
                                    />
                                    <ComplianceStat
                                        label={t('Total excursions')}
                                        value={String(compliance.total_excursions)}
                                        sub={compliance.total_excursions === 0 ? t('all clear') : t('this month')}
                                    />
                                </div>
                                <Button variant="outline" size="sm" onClick={() => router.get('/reports')}>
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Compliance log')}
                                </Button>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* Temperature Excursions */}
                {excursions.length > 0 && (
                    <FadeIn delay={180} duration={400}>
                        <Card className="shadow-elevation-1">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        <Thermometer className="mr-1.5 inline-block h-3 w-3 align-[-0.125em]" />
                                        {t('Temperature excursions')} · {t('last 24h')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => router.get('/alerts?range=24h&severity=critical')}
                                        className="font-mono text-[10px] text-primary hover:text-primary/80"
                                    >
                                        {t('VIEW ALL')} →
                                    </button>
                                </div>
                                <div className="divide-y divide-border/50">
                                    {excursions.map((e) => (
                                        <div key={e.id} className="grid grid-cols-[1fr_90px_90px_90px_90px] items-center gap-4 py-2.5 text-sm">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">{e.zone}</p>
                                                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                                                        {e.site_name}
                                                        {e.device_name && ` · ${e.device_name}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-rose-500">
                                                {e.delta_c !== null
                                                    ? `${e.delta_c > 0 ? '+' : ''}${e.delta_c}°C`
                                                    : '—'}
                                            </span>
                                            <span className="font-mono text-xs text-amber-500">
                                                {formatDuration(e.duration_minutes)}
                                            </span>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {e.peak_value !== null ? `${t('peak')} ${e.peak_value}°C` : '—'}
                                            </span>
                                            <span
                                                className={cn(
                                                    'justify-self-end rounded px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider',
                                                    e.status === 'active'
                                                        ? 'bg-rose-500/10 text-rose-500'
                                                        : 'bg-emerald-500/10 text-emerald-500',
                                                )}
                                            >
                                                {e.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* Sites */}
                {siteStats.length > 0 ? (
                    <>
                        <div className="flex items-center gap-3">
                            <h2 className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Sites')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                {siteStats.length}
                            </span>
                        </div>
                        {viewMode === 'grid' ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {siteStats.map((site, i) => (
                                    <FadeIn key={site.id} delay={i * 50} duration={400}>
                                        <SiteCard site={site} t={t} />
                                    </FadeIn>
                                ))}
                            </div>
                        ) : (
                            <FadeIn duration={400}>
                                <SiteMap sites={siteStats} onSiteClick={(id) => router.get(`/sites/${id}`)} />
                            </FadeIn>
                        )}
                    </>
                ) : (
                    <FadeIn delay={200} duration={500}>
                        <EmptyState
                            icon={<MapPin className="h-5 w-5 text-muted-foreground" />}
                            title={t('No sites yet')}
                            description={t(
                                'Create your first site to start monitoring devices and receiving alerts',
                            )}
                            action={
                                <Button variant="outline" onClick={() => router.get('/sites')}>
                                    {t('Go to Sites')}
                                </Button>
                            }
                        />
                    </FadeIn>
                )}

                {/* Activity + Quick Actions */}
                {(recentActivity.length > 0 || recentReports.length > 0) && (
                    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                        {recentActivity.length > 0 && (
                            <FadeIn delay={240} duration={400}>
                                <Card className="h-full shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4 flex items-center justify-between">
                                            <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                <Activity className="mr-1.5 inline-block h-3 w-3 align-[-0.125em]" />
                                                {t('Recent activity')}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => router.get('/activity-log')}
                                                className="font-mono text-[10px] text-primary hover:text-primary/80"
                                            >
                                                {t('ACTIVITY LOG')} →
                                            </button>
                                        </div>
                                        <div className="space-y-0 divide-y divide-border/40">
                                            {recentActivity.map((a) => (
                                                <div key={a.id} className="flex gap-3 py-2.5 text-xs">
                                                    <ActivityDot activity={a} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="leading-relaxed">
                                                            <span className="font-medium text-foreground">{a.causer_name}</span>{' '}
                                                            <span className="text-muted-foreground">{a.description}</span>
                                                        </p>
                                                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">
                                                            {a.created_ago} {t('ago')}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}

                        <FadeIn delay={290} duration={400}>
                            <Card className="h-full shadow-elevation-1">
                                <CardContent className="p-6">
                                    <p className="mb-4 font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Quick actions')}
                                    </p>
                                    <div className="space-y-2">
                                        <QuickLink
                                            icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
                                            title={t('Alert center')}
                                            sub={`${kpis.active_alerts} ${t('active alerts')}`}
                                            onClick={() => router.get('/alerts')}
                                        />
                                        <QuickLink
                                            icon={<Wrench className="h-4 w-4 text-violet-500" />}
                                            title={t('Work orders')}
                                            sub={`${kpis.open_work_orders} ${t('open')}`}
                                            onClick={() => router.get('/work-orders')}
                                        />
                                        <QuickLink
                                            icon={<FileText className="h-4 w-4 text-cyan-500" />}
                                            title={t('Generate report')}
                                            sub={t('temperature · energy')}
                                            onClick={() => router.get('/reports')}
                                        />
                                    </div>
                                    {recentReports.length > 0 && (
                                        <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
                                            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
                                                {t('Recent reports')}
                                            </p>
                                            {recentReports.map((r, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => router.get('/reports')}
                                                    className="flex w-full items-center gap-3 rounded-md border border-border/50 bg-muted/30 p-2 text-left transition-colors hover:bg-muted/50"
                                                >
                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-cyan-500/10 text-cyan-500">
                                                        <FileText className="h-3 w-3" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-medium">{r.title}</p>
                                                        <p className="font-mono text-[9px] text-muted-foreground">
                                                            PDF · {r.generated_ago} {t('ago')}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </FadeIn>
                    </div>
                )}

                {/* Freshness footer */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-emerald-500">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                            {t('LIVE')}
                        </span>
                        <span>
                            {t('Data as of')}{' '}
                            <span className="font-semibold text-foreground">
                                {new Date(freshness.as_of).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{t('auto-refresh: off')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {freshness.last_broadcast && (
                            <span>
                                {t('last alert')}: <span>{freshness.last_broadcast_ago} {t('ago')}</span>
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => router.reload()}
                            className="text-primary hover:text-primary/80"
                        >
                            {t('refresh now')}
                        </button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/* ── KPI Card ───────────────────────────────────────────────── */

function KpiCard({
    label,
    value,
    icon,
    tone,
    spark,
    trend,
    trendGood,
    subtitle,
}: {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    tone: 'good' | 'warning' | 'danger' | 'info' | 'neutral';
    spark: number[];
    trend?: number;
    trendGood?: 'up' | 'down';
    subtitle?: string;
}) {
    const toneClasses: Record<typeof tone, string> = {
        good: 'border-emerald-500/20',
        warning: 'border-amber-500/25',
        danger: 'border-rose-500/30 bg-gradient-to-br from-card to-rose-500/[0.03]',
        info: 'border-border/50',
        neutral: 'border-border/50',
    };
    const iconBg: Record<typeof tone, string> = {
        good: 'bg-emerald-500/10 text-emerald-500',
        warning: 'bg-amber-500/10 text-amber-500',
        danger: 'bg-rose-500/10 text-rose-500',
        info: 'bg-cyan-500/10 text-cyan-500',
        neutral: 'bg-muted/50 text-muted-foreground',
    };

    const trendDisplay = (() => {
        if (trend === undefined || trend === 0) return null;
        const isUp = trend > 0;
        const isGood = trendGood === 'up' ? isUp : !isUp;
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium',
                    isGood ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500',
                )}
            >
                {isUp ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                {Math.abs(trend)}
            </span>
        );
    })();

    return (
        <Card className={cn('shadow-elevation-1 transition-all hover:-translate-y-0.5', toneClasses[tone])}>
            <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {label}
                    </p>
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBg[tone])}>
                        {icon}
                    </div>
                </div>
                <p className="font-display text-3xl font-bold leading-none tracking-tight tabular-nums">{value}</p>
                {(trendDisplay || subtitle) && (
                    <div className="mt-2 flex items-baseline gap-2 text-[11px]">
                        {trendDisplay}
                        {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
                    </div>
                )}
                {spark.length > 0 && (
                    <div className="mt-2">
                        <Sparkline values={spark} tone={tone} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ── Sparkline ───────────────────────────────────────────────── */

function Sparkline({ values, tone }: { values: number[]; tone: 'good' | 'warning' | 'danger' | 'info' | 'neutral' }) {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const w = 100;
    const h = 24;
    const step = values.length > 1 ? w / (values.length - 1) : w;
    const points = values
        .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
        .join(' ');
    const color = {
        good: '#10b981',
        warning: '#f59e0b',
        danger: '#f43f5e',
        info: '#06b6d4',
        neutral: '#6b7280',
    }[tone];
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-6 w-full">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}

/* ── Fleet Health Donut ──────────────────────────────────────── */

function HealthDonut({ pct }: { pct: number }) {
    const r = 52;
    const circumference = 2 * Math.PI * r;
    const dash = (pct / 100) * circumference;
    const color = pct > 80 ? '#10b981' : pct > 50 ? '#f59e0b' : '#f43f5e';
    return (
        <div className="relative" style={{ filter: `drop-shadow(0 0 18px ${color}22)` }}>
            <svg width="124" height="124" viewBox="0 0 124 124" style={{ transform: 'rotate(-90deg)' }}>
                <defs>
                    <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={color} />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
                <circle cx="62" cy="62" r={r} fill="none" stroke="#1e2228" strokeWidth="6" />
                <circle
                    cx="62"
                    cy="62"
                    r={r}
                    fill="none"
                    stroke="url(#donutGrad)"
                    strokeWidth="6"
                    strokeDasharray={`${dash.toFixed(1)} ${circumference.toFixed(1)}`}
                    strokeLinecap="round"
                />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="font-display text-[26px] font-bold leading-none tabular-nums tracking-tight">
                    {pct}
                    <span className="text-base text-muted-foreground">%</span>
                </p>
            </div>
        </div>
    );
}

/* ── Fleet Row ───────────────────────────────────────────────── */

function FleetRow({ dot, label, count }: { dot: 'emerald' | 'amber' | 'rose' | 'muted'; label: string; count: number }) {
    const dotColors = {
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
        muted: 'bg-muted-foreground/50',
    };
    const countColors = {
        emerald: 'text-foreground',
        amber: 'text-amber-500',
        rose: 'text-rose-500',
        muted: 'text-muted-foreground',
    };
    return (
        <div className="flex items-center gap-3 text-xs">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotColors[dot])} />
            <span className="flex-1 text-muted-foreground">{label}</span>
            <span className={cn('font-mono font-medium tabular-nums', countColors[dot])}>{count}</span>
        </div>
    );
}

/* ── Compliance Stat ─────────────────────────────────────────── */

function ComplianceStat({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="mt-1 font-mono text-sm font-medium tabular-nums">
                {value} <span className="text-muted-foreground">{sub}</span>
            </p>
        </div>
    );
}

/* ── Activity Dot ────────────────────────────────────────────── */

function ActivityDot({ activity }: { activity: ActivityRecord }) {
    const desc = activity.description.toLowerCase();
    const subject = activity.subject_type.toLowerCase();

    // Infer event type from subject + description
    let tone: 'alert' | 'wo' | 'resolve' | 'user' | 'device' = 'user';
    let glyph: React.ReactNode = activity.subject_type.slice(0, 1).toUpperCase();

    if (subject.includes('alert')) {
        if (desc.includes('resolv') || desc.includes('ack')) {
            tone = 'resolve';
            glyph = '✓';
        } else {
            tone = 'alert';
            glyph = '!';
        }
    } else if (subject.includes('workorder')) {
        tone = 'wo';
        glyph = 'WO';
    } else if (subject.includes('device')) {
        tone = 'device';
        glyph = <Cpu className="h-3 w-3" />;
    } else if (subject.includes('site')) {
        tone = 'user';
        glyph = <MapPin className="h-3 w-3" />;
    }

    const toneClasses = {
        alert: 'bg-rose-500/15 text-rose-500',
        wo: 'bg-violet-500/15 text-violet-500',
        resolve: 'bg-emerald-500/15 text-emerald-500',
        user: 'bg-cyan-500/15 text-cyan-500',
        device: 'bg-amber-500/15 text-amber-500',
    } as const;

    return (
        <div
            className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-semibold',
                toneClasses[tone],
            )}
        >
            {glyph}
        </div>
    );
}

/* ── Action Item ─────────────────────────────────────────────── */

function ActionItem({
    icon,
    tone,
    count,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    tone: 'critical' | 'warning' | 'info';
    count: number;
    label: string;
    onClick: () => void;
}) {
    const borderColors = {
        critical: 'border-l-rose-500 hover:bg-rose-500/[0.03]',
        warning: 'border-l-amber-500 hover:bg-amber-500/[0.03]',
        info: 'border-l-cyan-500 hover:bg-cyan-500/[0.03]',
    };
    const iconBg = {
        critical: 'bg-rose-500/10 text-rose-500',
        warning: 'bg-amber-500/10 text-amber-500',
        info: 'bg-cyan-500/10 text-cyan-500',
    };
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'group flex items-center gap-4 rounded-lg border border-border/50 border-l-4 bg-card p-4 text-left transition-all hover:-translate-y-0.5',
                borderColors[tone],
            )}
        >
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBg[tone])}>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-display text-2xl font-bold leading-none tabular-nums">{count}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all group-hover:translate-x-1 group-hover:text-foreground" />
        </button>
    );
}

/* ── Quick Link ─────────────────────────────────────────────── */

function QuickLink({
    icon,
    title,
    sub,
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    sub: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-muted/40"
        >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card">{icon}</div>
            <div className="flex-1">
                <p className="text-xs font-medium">{title}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{sub}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </button>
    );
}

/* ── Site Card with Mini Donut Ring ─────────────────────────── */

/**
 * Build a 2-character monogram from a site name.
 * "FreshCo Monterrey #04" → "M4"
 * "FreshCo CDMX #01"      → "C1"
 * "Cold Storage"          → "CS"
 */
function siteMonogram(name: string): string {
    if (!name) return '—';
    // Look for a trailing number suffix ("#04", "-01")
    const numMatch = name.match(/[#-]?\s*(\d{1,3})\s*$/);
    if (numMatch) {
        const prefix = name.replace(numMatch[0], '').trim();
        const lastWord = prefix.split(/\s+/).filter(Boolean).pop() ?? '';
        if (lastWord) {
            return (lastWord[0] + numMatch[1]).toUpperCase().slice(0, 3);
        }
        return numMatch[1];
    }
    // Otherwise, first 2 initials of the first two words
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

function SiteCard({ site, t }: { site: SiteStat; t: (key: string) => string }) {
    const sitePct =
        site.device_count > 0 ? Math.round((site.online_count / site.device_count) * 100) : 0;
    const hasAlerts = site.active_alerts > 0;
    const ringColor =
        sitePct >= 95 ? '#10b981' : sitePct >= 80 ? '#f59e0b' : sitePct > 0 ? '#f43f5e' : '#6b7280';
    const r = 17;
    const circumference = 2 * Math.PI * r;
    const dash = (sitePct / 100) * circumference;

    return (
        <div
            className={cn(
                'group relative cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-card p-5 shadow-elevation-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2',
                hasAlerts && 'after:absolute after:right-0 after:top-0 after:h-full after:w-[3px] after:bg-rose-500',
            )}
            onClick={() => router.get(`/sites/${site.id}`)}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div
                        className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-display text-[13px] font-bold',
                            site.critical_alerts > 0 &&
                                'border-rose-500/30 bg-rose-500/10 text-rose-500',
                            site.critical_alerts === 0 &&
                                site.active_alerts > 0 &&
                                'border-amber-500/30 bg-amber-500/10 text-amber-500',
                            site.critical_alerts === 0 &&
                                site.active_alerts === 0 &&
                                site.status === 'onboarding' &&
                                'border-amber-500/30 bg-amber-500/10 text-amber-500',
                            site.critical_alerts === 0 &&
                                site.active_alerts === 0 &&
                                site.status !== 'onboarding' &&
                                'border-border/60 bg-muted text-text-secondary',
                        )}
                    >
                        {siteMonogram(site.name)}
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold leading-tight">{site.name}</h3>
                        {site.slug && <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{site.slug}</p>}
                    </div>
                </div>
                <Badge variant={statusBadgeVariant[site.status] ?? 'outline'}>{site.status}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniKpi value={site.device_count} label={t('Devices')} />
                <MiniKpi
                    value={site.active_alerts}
                    label={t('Alerts')}
                    tone={site.critical_alerts > 0 ? 'danger' : site.active_alerts > 0 ? 'warning' : undefined}
                />
                <MiniKpi
                    value={site.open_work_orders}
                    label={t('WOs')}
                    tone={site.open_work_orders > 0 ? 'warning' : undefined}
                />
            </div>

            {site.device_count > 0 && (
                <div className="mt-4 flex items-center gap-3 border-t border-border/40 pt-4">
                    <div className="relative" style={{ width: 44, height: 44 }}>
                        <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="22" cy="22" r={r} fill="none" stroke="#1e2228" strokeWidth="4" />
                            <circle
                                cx="22"
                                cy="22"
                                r={r}
                                fill="none"
                                stroke={ringColor}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${dash.toFixed(1)} ${circumference.toFixed(1)}`}
                            />
                        </svg>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span
                                className="font-mono text-[10px] font-semibold tabular-nums"
                                style={{ color: ringColor }}
                            >
                                {sitePct}
                            </span>
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">
                            <span className="font-mono tabular-nums">
                                {site.online_count}/{site.device_count}
                            </span>{' '}
                            {t('devices online')}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                            {site.critical_alerts > 0 && (
                                <span className="text-rose-500">
                                    {site.critical_alerts} {t('critical')} ·{' '}
                                </span>
                            )}
                            {site.open_work_orders > 0 && (
                                <span className="text-amber-500">
                                    {site.open_work_orders} {t('open WOs')}
                                </span>
                            )}
                            {site.critical_alerts === 0 && site.open_work_orders === 0 && <span>{t('all healthy')}</span>}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniKpi({
    value,
    label,
    tone,
}: {
    value: number | string;
    label: string;
    tone?: 'danger' | 'warning';
}) {
    return (
        <div className="rounded-md border border-border/30 bg-muted/20 p-2">
            <p
                className={cn(
                    'font-mono text-sm font-semibold leading-none tabular-nums',
                    tone === 'danger' && 'text-rose-500',
                    tone === 'warning' && 'text-amber-500',
                    !tone && 'text-foreground',
                )}
            >
                {value}
            </p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-widest text-muted-foreground/70">{label}</p>
        </div>
    );
}

/* ── Dashboard Skeleton ─────────────────────────────────────── */

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Hero */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-64" />
                <Skeleton className="mt-2 h-4 w-56" />
            </div>
            {/* KPI strip */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-5">
                        <div className="flex items-start justify-between">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                        <Skeleton className="mt-3 h-8 w-24" />
                        <Skeleton className="mt-2 h-3 w-32" />
                        <Skeleton className="mt-3 h-6 w-full" />
                    </div>
                ))}
            </div>
            {/* Gateway card */}
            <div className="rounded-xl border p-6">
                <Skeleton className="h-3 w-32" />
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 rounded-lg" />
                    ))}
                </div>
            </div>
            {/* Fleet donut + feed */}
            <div className="grid gap-4 lg:grid-cols-5">
                <div className="rounded-xl border p-6 lg:col-span-2">
                    <Skeleton className="h-3 w-20" />
                    <div className="mt-4 flex items-center gap-6">
                        <Skeleton className="h-[124px] w-[124px] rounded-full" />
                        <div className="flex-1 space-y-2.5">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-3 w-full" />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border p-6 lg:col-span-3">
                    <Skeleton className="h-3 w-28" />
                    <div className="mt-4 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-8 w-[3px] rounded-sm" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3 w-3/4" />
                                    <Skeleton className="h-2.5 w-1/2" />
                                </div>
                                <Skeleton className="h-3 w-12" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Sites grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                                <Skeleton className="h-9 w-9 rounded-lg" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                            <Skeleton className="h-5 w-14 rounded-md" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            {Array.from({ length: 3 }).map((_, j) => (
                                <Skeleton key={j} className="h-12 rounded-md" />
                            ))}
                        </div>
                        <div className="mt-4 flex items-center gap-3 border-t border-border/40 pt-4">
                            <Skeleton className="h-11 w-11 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-2.5 w-3/4" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Site Map (Leaflet) ──────────────────────────────────────── */

function SiteMap({
    sites,
    onSiteClick,
}: {
    sites: SiteStat[];
    onSiteClick: (id: number) => void;
}) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<{ remove: () => void } | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => setLoaded(true);
        document.head.appendChild(script);
        return () => {
            link.remove();
            script.remove();
        };
    }, []);

    useEffect(() => {
        if (!loaded || !mapRef.current || !window.L) return;
        const map = window.L.map(mapRef.current).setView([23.6345, -102.5528], 5);
        mapInstanceRef.current = map;
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const markers: unknown[] = [];
        sites.forEach((site) => {
            if (!site.latitude || !site.longitude) return;
            let color = '#71717a';
            if (site.device_count > 0) {
                color = site.online_count === site.device_count ? '#10b981' : '#f59e0b';
            }
            const icon = window.L.divIcon({
                className: '',
                html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            });
            const marker = window.L.marker([site.latitude, site.longitude], { icon })
                .addTo(map)
                .bindPopup(`<b>${site.name}</b><br>${site.online_count}/${site.device_count} online`)
                .on('click', () => onSiteClick(site.id));
            markers.push(marker);
        });
        if (markers.length > 0) {
            const group = window.L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.2));
        }
        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [loaded, sites, onSiteClick]);

    return <div ref={mapRef} className="h-[500px] w-full rounded-xl border" />;
}

/* Exposed for legacy imports */
export { CheckCircle2 };
