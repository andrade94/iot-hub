import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BarChart3,
    Clock,
    Cpu,
    Download,
    Flame,
    ShieldCheck,
    Target,
    TrendingUp,
    Users,
    Wrench,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────── */

interface ExecKpis {
    device_uptime_pct: number;
    sla_compliance_pct: number;
    sla_target_pct: number;
    mttr_minutes: number | null;
    ack_minutes: number | null;
    wo_completed: number;
    wo_created: number;
    alert_to_wo_pct: number;
    active_critical: number;
    total_devices: number;
    online_devices: number;
}

interface SlaBanner {
    pct: number;
    target_pct: number;
    total: number;
    on_time: number;
    breached: number;
    is_healthy: boolean;
}

interface SlaTrendPoint {
    date: string;
    pct: number;
    total: number;
}

interface UptimeTrendPoint {
    date: string;
    pct: number;
}

interface WoHistogramPoint {
    date: string;
    created: number;
    completed: number;
}

interface BreachedSla {
    id: number;
    title: string;
    priority: 'urgent' | 'high' | 'medium' | 'low' | string;
    status: string;
    site_name: string | null;
    site_id: number | null;
    created_at: string | null;
    sla_hours: number;
    overdue_minutes: number;
}

interface Improvement {
    site_id: number;
    site_name: string;
    alerts_before: number;
    alerts_after: number;
    delta: number;
    improvement_pct: number;
}

interface DeviceReliability {
    model: string;
    total_devices: number;
    online: number;
    uptime_pct: number;
    alert_count: number;
    critical_alerts: number;
    alerts_per_device: number;
}

interface SiteRow {
    site_id: number;
    site_name: string;
    alert_count: number;
    compliance_pct: number;
    device_uptime_pct: number;
    mttr_minutes: number | null;
    total_devices: number;
    online_devices: number;
}

interface Technician {
    id: number;
    name: string;
    initials: string;
    handled: number;
    open: number;
    avg_minutes: number | null;
    sla_hit_pct: number | null;
}

interface Incident {
    id: number;
    severity: string;
    title: string;
    site_name: string | null;
    site_id: number | null;
    device_name: string | null;
    zone: string | null;
    triggered_at: string | null;
    acknowledged_at: string | null;
    resolved_at: string | null;
    ack_delay_seconds: number | null;
    is_active: boolean;
    linked_work_order_id: number | null;
}

interface Props {
    days: number;
    execKpis: ExecKpis;
    slaBanner: SlaBanner;
    slaTrend: SlaTrendPoint[];
    uptimeTrend: UptimeTrendPoint[];
    woHistogram: WoHistogramPoint[];
    breachedSlas: BreachedSla[];
    improvements: Improvement[];
    deviceReliability: DeviceReliability[];
    siteBreakdown: SiteRow[];
    technicians: Technician[];
    incidents: Incident[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Analytics', href: '#' },
    { title: 'Performance', href: '/analytics/performance' },
];

/* ── Helpers ────────────────────────────────────────────────── */

function formatMinutes(minutes: number | null): string {
    if (minutes === null || minutes === undefined) return '—';
    if (minutes < 1) {
        const seconds = Math.max(0, Math.round(minutes * 60));
        return `${seconds}s`;
    }
    if (minutes < 60) {
        const whole = Math.floor(minutes);
        const seconds = Math.round((minutes - whole) * 60);
        return seconds > 0 ? `${whole}m ${seconds}s` : `${whole}m`;
    }
    if (minutes < 1440) {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function formatOverdue(minutes: number): string {
    if (minutes < 60) return `+${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `+${h}h ${m}m` : `+${h}h`;
}

function formatShortDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDateTick(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
}

function relativeTime(iso: string | null): string {
    if (!iso) return '—';
    const then = new Date(iso).getTime();
    const diffSeconds = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/* ── Main Component ─────────────────────────────────────────── */

export default function PerformanceAnalytics({
    days,
    execKpis,
    slaBanner,
    slaTrend,
    uptimeTrend,
    woHistogram,
    breachedSlas,
    improvements,
    deviceReliability,
    siteBreakdown,
    technicians,
    incidents,
}: Props) {
    const { t } = useLang();

    const changeDays = (d: number) => {
        router.get('/analytics/performance', { days: d }, { preserveState: true, replace: true });
    };

    const noData =
        execKpis.total_devices === 0 && slaBanner.total === 0 && siteBreakdown.length === 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Performance')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Hero ───────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
                            <div className="max-w-2xl">
                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('SLA & KPI Dashboard')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Performance')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t(
                                        'How the platform is meeting its commitments: SLA compliance, uptime, mean time to resolution, and team efficiency.',
                                    )}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <ButtonGroup>
                                    {[7, 30, 90].map((d) => (
                                        <Button
                                            key={d}
                                            variant={days === d ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => changeDays(d)}
                                        >
                                            <span className="font-mono tabular-nums">{d}</span>d
                                        </Button>
                                    ))}
                                </ButtonGroup>
                                <Button variant="outline" size="sm" disabled>
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Export CSV')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {noData ? (
                    <FadeIn delay={100}>
                        <EmptyState
                            icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
                            title={t('No performance data yet')}
                            description={t(
                                'Once devices report and alerts fire, the performance dashboard will populate with SLA compliance, uptime trends, and team efficiency.',
                            )}
                        />
                    </FadeIn>
                ) : (
                    <>
                        {/* ── SLA Health Banner ───────────────────── */}
                        <FadeIn delay={50} duration={400}>
                            <SlaHealthBanner banner={slaBanner} days={days} t={t} />
                        </FadeIn>

                        {/* ── Top Breached SLAs ──────────────────── */}
                        {breachedSlas.length > 0 && (
                            <FadeIn delay={100} duration={400}>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                    <AlertTriangle className="mr-1.5 inline-block h-3 w-3 align-[-0.125em]" />
                                                    {t('Top breached SLAs')} · {t('last :days days', { days })}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {t('Open work orders that have missed their SLA target. Click to open.')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-border/60">
                                            {breachedSlas.map((wo) => (
                                                <BreachRow key={wo.id} wo={wo} t={t} />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}

                        {/* ── Executive KPI strip ─────────────────── */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                            <ExecKpi
                                icon={<Cpu className="h-3.5 w-3.5" />}
                                label={t('Device uptime')}
                                value={`${execKpis.device_uptime_pct}%`}
                                tone={execKpis.device_uptime_pct >= 99 ? 'good' : execKpis.device_uptime_pct >= 95 ? 'info' : 'warning'}
                                subtitle={`${execKpis.online_devices}/${execKpis.total_devices} ${t('online')}`}
                            />
                            <ExecKpi
                                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                                label={t('SLA compliance')}
                                value={`${execKpis.sla_compliance_pct}%`}
                                tone={execKpis.sla_compliance_pct >= execKpis.sla_target_pct ? 'good' : 'warning'}
                                subtitle={`${t('target')} ${execKpis.sla_target_pct}%`}
                            />
                            <ExecKpi
                                icon={<Clock className="h-3.5 w-3.5" />}
                                label={t('MTTR')}
                                value={formatMinutes(execKpis.mttr_minutes)}
                                tone={(execKpis.mttr_minutes ?? 0) > 240 ? 'warning' : 'info'}
                                subtitle={t('work orders')}
                            />
                            <ExecKpi
                                icon={<Activity className="h-3.5 w-3.5" />}
                                label={t('Avg ack time')}
                                value={formatMinutes(execKpis.ack_minutes)}
                                tone={(execKpis.ack_minutes ?? 0) > 15 ? 'warning' : 'good'}
                                subtitle={t('alerts acknowledged')}
                            />
                            <ExecKpi
                                icon={<Flame className="h-3.5 w-3.5" />}
                                label={t('Critical incidents')}
                                value={execKpis.active_critical.toString()}
                                tone={execKpis.active_critical > 0 ? 'danger' : 'good'}
                                subtitle={t('open · unresolved')}
                            />
                            <ExecKpi
                                icon={<Wrench className="h-3.5 w-3.5" />}
                                label={t('Work orders')}
                                value={execKpis.wo_completed.toString()}
                                tone="info"
                                subtitle={`${execKpis.wo_created} ${t('created')}`}
                            />
                            <ExecKpi
                                icon={<Target className="h-3.5 w-3.5" />}
                                label={t('Alert → WO rate')}
                                value={`${execKpis.alert_to_wo_pct}%`}
                                tone="info"
                                subtitle={t('converted to WO')}
                            />
                        </div>

                        {/* ── Uptime + SLA trend row ──────────────── */}
                        <div className="grid gap-4 lg:grid-cols-2">
                            <FadeIn delay={150} duration={400}>
                                <Card className="h-full shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4">
                                            <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {t('Device uptime')} · {days}d
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('Daily estimated device availability')}
                                            </p>
                                        </div>
                                        <UptimeLineChart data={uptimeTrend} t={t} />
                                    </CardContent>
                                </Card>
                            </FadeIn>
                            <FadeIn delay={200} duration={400}>
                                <Card className="h-full shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4">
                                            <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {t('SLA compliance')} · {days}d
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('Daily on-time vs breached work orders')}
                                            </p>
                                        </div>
                                        <SlaTrendBars data={slaTrend} target={execKpis.sla_target_pct} t={t} />
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        </div>

                        {/* ── Recent improvements ─────────────────── */}
                        {improvements.length > 0 && (
                            <FadeIn delay={230} duration={400}>
                                <Card className="border-l-[3px] border-l-emerald-500 bg-gradient-to-r from-card to-emerald-500/[0.03] shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4 flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                                                <TrendingUp className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-emerald-500">
                                                    {t('Recent improvements')}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('Sites with the biggest drop in critical alerts this period')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-3">
                                            {improvements.map((imp) => (
                                                <Link
                                                    key={imp.site_id}
                                                    href={`/sites/${imp.site_id}`}
                                                    className="group flex items-center justify-between rounded-lg border border-border/50 bg-background/40 p-3 transition-colors hover:border-emerald-500/40"
                                                >
                                                    <div>
                                                        <p className="text-sm font-semibold">{imp.site_name}</p>
                                                        <p className="font-mono text-[10px] text-muted-foreground">
                                                            {imp.alerts_before} → {imp.alerts_after} {t('critical alerts')}
                                                        </p>
                                                    </div>
                                                    <span className="font-mono text-sm font-semibold tabular-nums text-emerald-500">
                                                        −{imp.improvement_pct}%
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}

                        {/* ── WO histogram + device reliability ──── */}
                        <div className="grid gap-4 lg:grid-cols-2">
                            <FadeIn delay={250} duration={400}>
                                <Card className="h-full shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4">
                                            <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {t('Work order throughput')} · {days}d
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('Daily created vs completed work orders')}
                                            </p>
                                        </div>
                                        <WoHistogramChart data={woHistogram} t={t} />
                                    </CardContent>
                                </Card>
                            </FadeIn>

                            <FadeIn delay={300} duration={400}>
                                <Card className="h-full shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4">
                                            <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {t('Device reliability by model')}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('Uptime % and alert volume grouped by sensor model')}
                                            </p>
                                        </div>
                                        {deviceReliability.length === 0 ? (
                                            <p className="py-6 text-center text-xs text-muted-foreground">
                                                {t('No device models recorded yet.')}
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {deviceReliability.slice(0, 6).map((row) => (
                                                    <ReliabilityRow key={row.model} row={row} t={t} />
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        </div>

                        {/* ── Site breakdown table ────────────────── */}
                        <FadeIn delay={350} duration={400}>
                            <Card className="shadow-elevation-1">
                                <CardContent className="p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {t('Site performance')} · {days}d
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('Sorted by alert volume. Click a row to drill into that site.')}
                                            </p>
                                        </div>
                                        <Link
                                            href="/sites/compare"
                                            className="font-mono text-[10px] text-primary hover:text-primary/80"
                                        >
                                            {t('COMPARE SITES')} →
                                        </Link>
                                    </div>

                                    {siteBreakdown.length === 0 ? (
                                        <p className="py-6 text-center text-xs text-muted-foreground">
                                            {t('No site data available yet.')}
                                        </p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('Site')}</TableHead>
                                                    <TableHead className="text-right">{t('Devices')}</TableHead>
                                                    <TableHead className="text-right">{t('Uptime')}</TableHead>
                                                    <TableHead className="text-right">{t('Alerts')}</TableHead>
                                                    <TableHead className="text-right">{t('MTTR')}</TableHead>
                                                    <TableHead className="text-right">{t('Compliance')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {siteBreakdown.map((site) => (
                                                    <TableRow
                                                        key={site.site_id}
                                                        className="cursor-pointer"
                                                        onClick={() => router.get(`/sites/${site.site_id}`)}
                                                    >
                                                        <TableCell className="font-medium">{site.site_name}</TableCell>
                                                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                                            {site.online_devices}/{site.total_devices}
                                                        </TableCell>
                                                        <TableCell
                                                            className={cn(
                                                                'text-right font-mono tabular-nums',
                                                                site.device_uptime_pct >= 99 && 'text-emerald-500',
                                                                site.device_uptime_pct < 99 && site.device_uptime_pct >= 95 && 'text-cyan-500',
                                                                site.device_uptime_pct < 95 && 'text-amber-500',
                                                            )}
                                                        >
                                                            {site.device_uptime_pct}%
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono tabular-nums">
                                                            {site.alert_count}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                                                            {formatMinutes(site.mttr_minutes)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <ComplianceBadge pct={site.compliance_pct} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </FadeIn>

                        {/* ── Technician performance ──────────────── */}
                        {technicians.length > 0 && (
                            <FadeIn delay={400} duration={400}>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4">
                                            <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                <Users className="mr-1.5 inline-block h-3 w-3 align-[-0.125em]" />
                                                {t('Technician performance')} · {days}d
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('Per-technician throughput, mean completion time, and workload.')}
                                            </p>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                            {technicians.map((tech, idx) => (
                                                <TechnicianCard
                                                    key={tech.id}
                                                    tech={tech}
                                                    isTop={idx === 0 && (tech.sla_hit_pct ?? 0) >= 90}
                                                    t={t}
                                                />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}

                        {/* ── Critical incidents timeline ─────────── */}
                        {incidents.length > 0 && (
                            <FadeIn delay={450} duration={400}>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="mb-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                    {t('Critical incidents')} · {t('last :days days', { days })}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {t('High-severity alerts in the selected window')}
                                                </p>
                                            </div>
                                            <Link
                                                href="/alerts"
                                                className="font-mono text-[10px] text-primary hover:text-primary/80"
                                            >
                                                {t('VIEW IN ALERTS')} →
                                            </Link>
                                        </div>
                                        <div className="space-y-3">
                                            {incidents.map((incident) => (
                                                <IncidentRow key={incident.id} incident={incident} t={t} />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}

/* ── SLA Health Banner ──────────────────────────────────────── */

function SlaHealthBanner({
    banner,
    days,
    t,
}: {
    banner: SlaBanner;
    days: number;
    t: (key: string, replacements?: Record<string, string | number>) => string;
}) {
    const tone = banner.is_healthy ? 'emerald' : 'amber';
    const accent = tone === 'emerald' ? 'border-l-emerald-500' : 'border-l-amber-500';
    const valueTone = tone === 'emerald' ? 'text-emerald-500' : 'text-amber-500';

    return (
        <Card
            className={cn(
                'border-l-[3px] bg-gradient-to-r from-card to-transparent shadow-elevation-1',
                accent,
            )}
        >
            <CardContent className="flex flex-wrap items-center gap-6 p-6">
                <div className="flex-1 min-w-[220px]">
                    <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        {t('SLA compliance')} · {t(':days days', { days })}
                    </p>
                    <p className={cn('font-display mt-2 text-5xl font-bold tabular-nums', valueTone)}>
                        {banner.pct}
                        <span className="text-2xl text-muted-foreground">%</span>
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                        <strong className="text-foreground">{banner.on_time}</strong> {t('of')}{' '}
                        <strong className="text-foreground">{banner.total}</strong>{' '}
                        {t('work orders resolved within priority SLA')}
                        {banner.breached > 0 && (
                            <>
                                {' · '}
                                <strong className="text-amber-500">
                                    {banner.breached} {t('breached')}
                                </strong>
                            </>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
                        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                            {t('Target')}
                        </p>
                        <p className="font-mono text-sm font-semibold tabular-nums">{banner.target_pct}%</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
                        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                            {t('On time')}
                        </p>
                        <p className="font-mono text-sm font-semibold tabular-nums text-emerald-500">{banner.on_time}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
                        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                            {t('Breached')}
                        </p>
                        <p className="font-mono text-sm font-semibold tabular-nums text-amber-500">{banner.breached}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Breach row ─────────────────────────────────────────────── */

function BreachRow({
    wo,
    t,
}: {
    wo: BreachedSla;
    t: (key: string) => string;
}) {
    return (
        <Link
            href={`/work-orders/${wo.id}`}
            className="flex items-center gap-4 py-3 text-xs transition-colors hover:bg-muted/30"
        >
            <PriorityTag priority={wo.priority} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                    #{wo.id} · {wo.title}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                    {wo.site_name ?? '—'} · {formatShortDate(wo.created_at)} · {t('SLA')} {wo.sla_hours}h
                </p>
            </div>
            <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-semibold tabular-nums text-amber-500">
                    {formatOverdue(wo.overdue_minutes)}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {t('over SLA')}
                </p>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Link>
    );
}

function PriorityTag({ priority }: { priority: string }) {
    const tone =
        {
            urgent: 'bg-rose-500/15 text-rose-500',
            high: 'bg-amber-500/15 text-amber-500',
            medium: 'bg-cyan-500/15 text-cyan-500',
            low: 'bg-muted text-muted-foreground',
        }[priority] ?? 'bg-muted text-muted-foreground';
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center rounded px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider',
                tone,
            )}
        >
            {priority}
        </span>
    );
}

/* ── Exec KPI card ──────────────────────────────────────────── */

function ExecKpi({
    icon,
    label,
    value,
    tone = 'info',
    subtitle,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone?: 'good' | 'warning' | 'danger' | 'info';
    subtitle?: string;
}) {
    const toneClasses = {
        good: 'border-emerald-500/25',
        warning: 'border-amber-500/25',
        danger: 'border-rose-500/30 bg-gradient-to-br from-card to-rose-500/[0.03]',
        info: 'border-border/50',
    } as const;
    const valueTone = {
        good: 'text-emerald-500',
        warning: 'text-amber-500',
        danger: 'text-rose-500',
        info: 'text-foreground',
    } as const;

    return (
        <Card className={cn('shadow-elevation-1 transition-all hover:-translate-y-0.5', toneClasses[tone])}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-widest">{label}</p>
                    {icon}
                </div>
                <p
                    className={cn(
                        'font-display mt-3 text-2xl font-bold leading-none tracking-tight tabular-nums',
                        valueTone[tone],
                    )}
                >
                    {value}
                </p>
                {subtitle && <p className="mt-2 font-mono text-[10px] text-muted-foreground">{subtitle}</p>}
            </CardContent>
        </Card>
    );
}

/* ── Uptime line chart ──────────────────────────────────────── */

function UptimeLineChart({
    data,
    t,
}: {
    data: UptimeTrendPoint[];
    t: (key: string) => string;
}) {
    if (data.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {t('No uptime data available')}
            </div>
        );
    }

    const width = 600;
    const height = 160;
    const values = data.map((d) => d.pct);
    const min = Math.max(0, Math.min(...values, 90));
    const max = 100;
    const span = Math.max(max - min, 1);

    const points = data
        .map((d, i) => {
            const x = (i / Math.max(data.length - 1, 1)) * width;
            const y = height - ((d.pct - min) / span) * (height - 10);
            return `${x},${y}`;
        })
        .join(' ');

    const areaPath = `M 0,${height} L ${points
        .split(' ')
        .join(' L ')} L ${width},${height} Z`;

    const avgPct = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    const labelCount = Math.min(data.length, 6);
    const step = Math.max(1, Math.floor(data.length / labelCount));

    return (
        <div>
            <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <line x1="0" y1="0" x2={width} y2="0" stroke="currentColor" strokeOpacity="0.08" />
                <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeOpacity="0.08" />
                <line x1="0" y1={height} x2={width} y2={height} stroke="currentColor" strokeOpacity="0.08" />
                <path d={areaPath} fill="url(#uptimeGrad)" />
                <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" />
            </svg>
            <div className="mt-2 flex gap-1">
                {data.map((d, i) => (
                    <div key={d.date} className="flex-1 text-center">
                        {(i === 0 || i === data.length - 1 || i % step === 0) && (
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
                                {formatDateTick(d.date)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-[10px]">
                <span className="font-mono text-muted-foreground">
                    {t('Avg')} <span className="font-semibold text-emerald-500">{avgPct}%</span>
                </span>
                <span className="font-mono text-muted-foreground">
                    {t('Target')} <span className="font-semibold">99%</span>
                </span>
            </div>
        </div>
    );
}

/* ── SLA trend bars ────────────────────────────────────────── */

function SlaTrendBars({
    data,
    target,
    t,
}: {
    data: SlaTrendPoint[];
    target: number;
    t: (key: string) => string;
}) {
    if (data.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {t('No SLA data available')}
            </div>
        );
    }

    const labelCount = Math.min(data.length, 6);
    const step = Math.max(1, Math.floor(data.length / labelCount));

    return (
        <div>
            <div className="flex h-40 items-end gap-1 border-l border-border pl-1">
                {data.map((d) => {
                    const heightPct = Math.max(d.pct, 4);
                    const color =
                        d.pct >= target
                            ? 'bg-emerald-500'
                            : d.pct >= target - 10
                              ? 'bg-amber-500'
                              : 'bg-rose-500';
                    return (
                        <div
                            key={d.date}
                            className={cn('group relative flex-1 rounded-t transition-opacity hover:opacity-80', color)}
                            style={{ height: `${heightPct}%` }}
                            title={`${formatDateTick(d.date)} · ${d.pct}% · ${d.total} WO`}
                        />
                    );
                })}
            </div>
            <div className="mt-2 flex gap-1">
                {data.map((d, i) => (
                    <div key={d.date} className="flex-1 text-center">
                        {(i === 0 || i === data.length - 1 || i % step === 0) && (
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
                                {formatDateTick(d.date)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-3 flex items-center gap-3 border-t border-border/50 pt-3 font-mono text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-emerald-500" /> {t('On target')}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-amber-500" /> {t('Close call')}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-rose-500" /> {t('Breached')}
                </span>
                <span className="ml-auto">
                    {t('Target')} <span className="font-semibold text-foreground">{target}%</span>
                </span>
            </div>
        </div>
    );
}

/* ── WO histogram ──────────────────────────────────────────── */

function WoHistogramChart({
    data,
    t,
}: {
    data: WoHistogramPoint[];
    t: (key: string) => string;
}) {
    if (data.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {t('No work order activity yet')}
            </div>
        );
    }
    const maxValue = Math.max(...data.map((d) => Math.max(d.created, d.completed)), 1);
    const labelCount = Math.min(data.length, 6);
    const step = Math.max(1, Math.floor(data.length / labelCount));

    const totalCreated = data.reduce((s, d) => s + d.created, 0);
    const totalCompleted = data.reduce((s, d) => s + d.completed, 0);

    return (
        <div>
            <div className="flex h-40 items-end gap-2 border-l border-border pl-1">
                {data.map((d) => (
                    <div key={d.date} className="relative flex flex-1 items-end justify-center gap-[2px]">
                        <div
                            className="w-2 rounded-t bg-cyan-500/60 transition-opacity hover:opacity-90"
                            style={{ height: `${(d.created / maxValue) * 100}%` }}
                            title={`${formatDateTick(d.date)} · ${d.created} ${t('created')}`}
                        />
                        <div
                            className="w-2 rounded-t bg-emerald-500/70 transition-opacity hover:opacity-90"
                            style={{ height: `${(d.completed / maxValue) * 100}%` }}
                            title={`${formatDateTick(d.date)} · ${d.completed} ${t('completed')}`}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-2 flex gap-2">
                {data.map((d, i) => (
                    <div key={d.date} className="flex-1 text-center">
                        {(i === 0 || i === data.length - 1 || i % step === 0) && (
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">
                                {formatDateTick(d.date)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-3 flex items-center gap-4 border-t border-border/50 pt-3 font-mono text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-cyan-500" /> {t('Created')}
                    <span className="font-semibold text-foreground">{totalCreated}</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-emerald-500" /> {t('Completed')}
                    <span className="font-semibold text-foreground">{totalCompleted}</span>
                </span>
            </div>
        </div>
    );
}

/* ── Reliability row ────────────────────────────────────────── */

function ReliabilityRow({
    row,
    t,
}: {
    row: DeviceReliability;
    t: (key: string) => string;
}) {
    const tone =
        row.uptime_pct >= 99
            ? { bar: 'bg-emerald-500', text: 'text-emerald-500' }
            : row.uptime_pct >= 97
              ? { bar: 'bg-amber-500', text: 'text-amber-500' }
              : { bar: 'bg-rose-500', text: 'text-rose-500' };

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 text-xs">
            <div className="min-w-0">
                <p className="truncate font-mono text-[11px] font-semibold">{row.model}</p>
                <p className="truncate font-mono text-[9px] text-muted-foreground">
                    {row.total_devices} {t('devices')} · {row.alerts_per_device}/{t('dev')}
                </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(row.uptime_pct, 100)}%` }} />
            </div>
            <span className={cn('min-w-[52px] text-right font-mono text-xs font-semibold tabular-nums', tone.text)}>
                {row.uptime_pct}%
            </span>
        </div>
    );
}

/* ── Compliance badge ──────────────────────────────────────── */

function ComplianceBadge({ pct }: { pct: number }) {
    const tone =
        pct >= 95
            ? 'bg-emerald-500/15 text-emerald-500'
            : pct >= 80
              ? 'bg-cyan-500/15 text-cyan-500'
              : pct >= 60
                ? 'bg-amber-500/15 text-amber-500'
                : 'bg-rose-500/15 text-rose-500';

    return (
        <span
            className={cn(
                'inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums',
                tone,
            )}
        >
            {pct}%
        </span>
    );
}

/* ── Technician card ───────────────────────────────────────── */

function TechnicianCard({
    tech,
    isTop,
    t,
}: {
    tech: Technician;
    isTop: boolean;
    t: (key: string) => string;
}) {
    const slaTone =
        tech.sla_hit_pct === null
            ? 'text-muted-foreground'
            : tech.sla_hit_pct >= 90
              ? 'text-emerald-500'
              : tech.sla_hit_pct >= 80
                ? 'text-cyan-500'
                : 'text-amber-500';

    // Workload: open WO count against a team average of 5 (clamped to 150%)
    const workloadPct = Math.min(Math.max((tech.open / 5) * 100, 4), 150);
    const workloadColor =
        tech.open <= 3 ? 'bg-emerald-500' : tech.open <= 5 ? 'bg-cyan-500' : 'bg-amber-500';

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-lg border bg-card p-4',
                isTop ? 'border-emerald-500/40' : 'border-border/60',
            )}
        >
            {isTop && <span className="absolute bottom-0 left-0 top-0 w-[3px] bg-gradient-to-b from-emerald-500 to-transparent" />}
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 font-display text-xs font-bold text-background">
                    {tech.initials}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{tech.name}</p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        {t('Technician')}
                    </p>
                </div>
                {isTop && (
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-500">
                        {t('Top')}
                    </span>
                )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center">
                <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                        {t('Handled')}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold tabular-nums">{tech.handled}</p>
                </div>
                <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                        {t('Avg time')}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                        {formatMinutes(tech.avg_minutes)}
                    </p>
                </div>
                <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                        {t('SLA hit')}
                    </p>
                    <p className={cn('mt-1 font-mono text-sm font-semibold tabular-nums', slaTone)}>
                        {tech.sla_hit_pct === null ? '—' : `${tech.sla_hit_pct}%`}
                    </p>
                </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
                <span className="font-mono text-[9px] text-muted-foreground">{t('Workload')}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', workloadColor)} style={{ width: `${workloadPct}%` }} />
                </div>
                <span className="font-mono text-[10px] font-semibold tabular-nums">
                    {tech.open} {t('open')}
                </span>
            </div>
        </div>
    );
}

/* ── Incident row ──────────────────────────────────────────── */

function IncidentRow({
    incident,
    t,
}: {
    incident: Incident;
    t: (key: string) => string;
}) {
    const severityTone =
        {
            critical: 'bg-rose-500/15 text-rose-500',
            high: 'bg-amber-500/15 text-amber-500',
            medium: 'bg-cyan-500/15 text-cyan-500',
            low: 'bg-muted text-muted-foreground',
        }[incident.severity] ?? 'bg-muted text-muted-foreground';

    const ackMinutes =
        incident.ack_delay_seconds !== null ? incident.ack_delay_seconds / 60 : null;

    return (
        <div
            className={cn(
                'rounded-lg border p-4',
                incident.is_active ? 'border-rose-500/40 bg-rose-500/[0.03]' : 'border-border/60 bg-card',
            )}
        >
            <div className="flex items-center gap-2 text-xs">
                <span
                    className={cn(
                        'inline-flex items-center rounded px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider',
                        severityTone,
                    )}
                >
                    {incident.severity}
                </span>
                <p className="flex-1 truncate text-sm font-semibold">{incident.title}</p>
                {incident.is_active ? (
                    <span className="rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-rose-500">
                        {t('Active')} · {relativeTime(incident.triggered_at)}
                    </span>
                ) : (
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-500">
                        {t('Resolved')}
                    </span>
                )}
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {incident.site_name ?? '—'}
                {incident.device_name && ` · ${incident.device_name}`}
                {incident.zone && ` · ${incident.zone}`}
                {' · '}
                {formatShortDate(incident.triggered_at)}
            </p>
            {ackMinutes !== null && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                    {t('Acknowledged in')}{' '}
                    <span className="font-mono font-semibold text-foreground">{formatMinutes(ackMinutes)}</span>
                    {incident.linked_work_order_id && (
                        <>
                            {' · '}
                            <Link
                                href={`/work-orders/${incident.linked_work_order_id}`}
                                className="text-primary hover:text-primary/80"
                            >
                                WO #{incident.linked_work_order_id}
                            </Link>
                        </>
                    )}
                </p>
            )}
        </div>
    );
}
