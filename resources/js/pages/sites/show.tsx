import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { TimezoneSelect } from '@/components/ui/timezone-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import FloorPlanView from '@/components/FloorPlanView';
import { ZoneRect } from '@/components/layout-editor/ZoneRect';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type {
    Alert, BreadcrumbItem, Device, FloorPlan, SharedData, Site, SiteKPIs, WorkOrder, ZoneBoundary, ZoneSummary,
} from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { isDeviceOnline } from '@/utils/device';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle, ArrowLeft, Bell, Calendar, Check, ChevronDown, ChevronRight, Circle,
    ClipboardList, Clock, Cpu, FileBarChart, Layers, LayoutGrid, Map, Pencil, Plus, Radio, Search, Settings2, ShieldAlert, Signal,
    Thermometer, Users, Wrench, X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

/* -- Types ------------------------------------------------------------ */

interface OnboardingChecklist {
    gateway_registered: boolean;
    devices_provisioned: boolean;
    modules_activated: boolean;
    escalation_chain_configured: boolean;
    report_schedule_configured: boolean;
}

interface Props {
    site: Site;
    kpis: SiteKPIs;
    zones: ZoneSummary[];
    activeAlerts: Alert[];
    floorPlans?: (FloorPlan & { devices: Device[] })[];
    myRequests?: WorkOrder[];
    onboardingChecklist?: OnboardingChecklist | null;
    timezones?: string[];
    configCounts?: { alert_rules: number; escalation_chains: number; report_schedules: number; maintenance_windows: number };
    tempExcursions24h?: number;
    zoneBoundaries?: ZoneBoundary[];
    siteUsers?: { id: number; name: string; email: string; role: string; has_app_access: boolean }[];
    availableUsers?: { id: number; name: string; email: string; role: string }[];
}

const statusVariants: Record<string, 'success' | 'warning' | 'outline'> = {
    active: 'success', onboarding: 'warning', inactive: 'outline',
};

const woPriorityVariant: Record<string, 'outline' | 'outline-warning' | 'destructive'> = {
    low: 'outline', medium: 'outline-warning', high: 'destructive', urgent: 'destructive',
};

const severityDot: Record<string, string> = {
    critical: 'bg-rose-500 animate-pulse', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-blue-400',
};

const severityBadge: Record<string, string> = {
    critical: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/40 dark:border-rose-800/40',
    high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/40 dark:border-orange-800/40',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/40 dark:border-amber-800/40',
    low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/40 dark:border-blue-800/40',
};

/* -- Main Component --------------------------------------------------- */

export default function SiteShow({ site, kpis, zones, activeAlerts, floorPlans, myRequests = [], onboardingChecklist, timezones = [], configCounts, tempExcursions24h = 0, zoneBoundaries = [], siteUsers = [], availableUsers = [] }: Props) {
    const { t } = useLang();
    const { auth } = usePage<SharedData>().props;
    const isViewer = auth.roles.includes('client_site_viewer');
    const canManage = auth.permissions?.includes('manage devices') || auth.roles.includes('super_admin') || auth.roles.includes('client_org_admin') || auth.roles.includes('client_site_manager');
    const [showEdit, setShowEdit] = useState(false);
    const [showSuspend, setShowSuspend] = useState(false);
    const [woAlertId, setWoAlertId] = useState<number | null>(null);
    const woAlert = woAlertId ? activeAlerts.find((a) => a.id === woAlertId) : null;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: t('Sites'), href: '/sites' },
        { title: site.name, href: '#' },
    ];

    const healthPct = kpis.total_devices > 0 ? Math.round((kpis.online_count / kpis.total_devices) * 100) : 0;
    const offlineCount = kpis.total_devices - kpis.online_count;
    const allDevices = useMemo(() => zones.flatMap((z) => z.devices.map((d) => ({ ...d, zoneName: z.name }))), [zones]);

    // Dismissable checklist
    const [checklistDismissed, setChecklistDismissed] = useState(() => {
        try { return localStorage.getItem(`onboarding-checklist-dismissed-${site.id}`) === 'true'; } catch { return false; }
    });
    const dismissChecklist = useCallback(() => {
        localStorage.setItem(`onboarding-checklist-dismissed-${site.id}`, 'true');
        setChecklistDismissed(true);
    }, [site.id]);

    // Tab state — persisted in URL, default to 'setup' for non-active sites
    const hasChecklist = onboardingChecklist && !checklistDismissed;
    const isSetupSite = site.status === 'draft' || site.status === 'onboarding';
    const [activeTab, setActiveTabState] = useState<'overview' | 'assets' | 'setup'>(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'overview' || tab === 'assets' || tab === 'setup') return tab;
        return isSetupSite ? 'setup' : 'overview';
    });
    const setActiveTab = useCallback((tab: 'overview' | 'assets' | 'setup') => {
        setActiveTabState(tab);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url.toString());
    }, []);

    const tabs = [
        { id: 'overview' as const, label: t('Overview'), count: activeAlerts.length > 0 ? activeAlerts.length : undefined },
        { id: 'assets' as const, label: t('Assets'), count: allDevices.length > 0 ? allDevices.length : undefined },
        { id: 'setup' as const, label: t('Setup'), dot: hasChecklist },
    ];

    // Assets tab filters + sort
    const [deviceSearch, setDeviceSearch] = useState('');
    const [deviceZoneFilter, setDeviceZoneFilter] = useState('all');
    const [deviceStatusFilter, setDeviceStatusFilter] = useState<'all' | 'online' | 'offline' | 'low_battery'>('all');
    const [deviceSort, setDeviceSort] = useState<'name' | 'zone' | 'battery' | 'status'>('name');
    const zoneNames = useMemo(() => [...new Set(zones.map((z) => z.name))].sort(), [zones]);
    const zoneOptions = useMemo(() => [
        { value: 'all', label: t('All Zones') },
        ...zoneNames.map((z) => ({ value: z, label: z })),
    ], [zoneNames, t]);

    const filteredDevices = useMemo(() => {
        let result = allDevices;
        if (deviceZoneFilter !== 'all') result = result.filter((d) => d.zoneName === deviceZoneFilter);
        if (deviceStatusFilter === 'online') result = result.filter((d) => isDeviceOnline(d.last_reading_at));
        if (deviceStatusFilter === 'offline') result = result.filter((d) => !isDeviceOnline(d.last_reading_at));
        if (deviceStatusFilter === 'low_battery') result = result.filter((d) => d.battery_pct != null && d.battery_pct < 20);
        if (deviceSearch.trim()) {
            const q = deviceSearch.toLowerCase();
            result = result.filter((d) => d.name.toLowerCase().includes(q) || d.model?.toLowerCase().includes(q));
        }
        // Sort
        result = [...result].sort((a, b) => {
            switch (deviceSort) {
                case 'zone': return (a.zoneName ?? '').localeCompare(b.zoneName ?? '');
                case 'battery': return (a.battery_pct ?? 100) - (b.battery_pct ?? 100);
                case 'status': {
                    const aOnline = isDeviceOnline(a.last_reading_at) ? 1 : 0;
                    const bOnline = isDeviceOnline(b.last_reading_at) ? 1 : 0;
                    return aOnline - bOnline; // offline first
                }
                default: return a.name.localeCompare(b.name);
            }
        });
        return result;
    }, [allDevices, deviceZoneFilter, deviceStatusFilter, deviceSearch, deviceSort]);

    // Overview — floor plan
    const hasFloorPlans = floorPlans && floorPlans.length > 0;
    const [activeFloorIdx, setActiveFloorIdx] = useState(0);
    const unplacedCount = allDevices.filter((d) => d.floor_x == null).length;

    // Alert filters
    const [alertSeverityFilter, setAlertSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
    const [alertZoneFilter, setAlertZoneFilter] = useState('all');
    const [alertSearch, setAlertSearch] = useState('');
    const filteredAlerts = useMemo(() => {
        let result = activeAlerts;
        if (alertSeverityFilter !== 'all') result = result.filter((a) => a.severity === alertSeverityFilter);
        if (alertZoneFilter !== 'all') result = result.filter((a) => (a.data?.zone ?? '') === alertZoneFilter);
        if (alertSearch.trim()) {
            const q = alertSearch.toLowerCase();
            result = result.filter((a) =>
                (a.data?.rule_name ?? '').toLowerCase().includes(q) ||
                (a.data?.device_name ?? '').toLowerCase().includes(q),
            );
        }
        return result;
    }, [activeAlerts, alertSeverityFilter, alertZoneFilter, alertSearch]);

    // Real KPI values
    const gatewayCount = (site as any).gateways?.length ?? 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={site.name} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">

                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <button onClick={() => router.get('/sites')} className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                <ArrowLeft className="h-3 w-3" />{t('Sites')}
                            </button>
                            <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground md:text-[32px]">{site.name}</h1>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <Badge variant={statusVariants[site.status] ?? 'outline'} className="text-[10px] capitalize">{site.status}</Badge>
                                {site.timezone && <Badge variant="outline" className="text-[10px] font-mono">{site.timezone}</Badge>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isViewer && <MaintenanceRequestDialog siteId={site.id} />}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-[11px]">
                                        <Settings2 className="mr-1 h-3.5 w-3.5" />{t('Manage')}<ChevronDown className="ml-1 h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground/70">{t('Monitoring')}</DropdownMenuLabel>
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem onClick={() => router.get(`/sites/${site.id}/alert-rules`)}>
                                            <Bell className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />{t('Alert Rules')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.get(`/sites/${site.id}/reports/summary`)}>
                                            <FileBarChart className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />{t('Reports')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.get(`/sites/${site.id}/reports/temperature`)}>
                                            <Thermometer className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />{t('Verifications')}
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground/70">{t('Configuration')}</DropdownMenuLabel>
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem onClick={() => router.get(`/sites/${site.id}/modules`)}>
                                            <Cpu className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />{t('Modules')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.get('/settings/users')}>
                                            <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />{t('Manage Users')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.get(`/settings/maintenance-windows`)}>
                                            <Wrench className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />{t('Maintenance Windows')}
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground/70">{t('History')}</DropdownMenuLabel>
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem onClick={() => router.get(`/sites/${site.id}/timeline`)}>
                                            <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />{t('Timeline')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.get(`/sites/${site.id}/audit`)}>
                                            <ClipboardList className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />{t('Audit Package')}
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-rose-600 dark:text-rose-400">
                                        <ShieldAlert className="mr-2 h-3.5 w-3.5" />{t('Suspend Site')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button size="sm" className="text-[11px]" onClick={() => setShowEdit(true)}>
                                <Pencil className="mr-1 h-3.5 w-3.5" />{t('Edit')}
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ KPI STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={400}>
                    <div className="mt-6 flex items-stretch overflow-hidden rounded-lg border border-border bg-card">
                        <SummaryStat label={t('Devices')} value={kpis.total_devices} />
                        <SummaryStat label={t('Online')} value={healthPct} suffix="%" subtitle={`${kpis.online_count} / ${kpis.total_devices}`}
                            color={healthPct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : healthPct > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'} />
                        <SummaryStat label={t('Alerts')} value={kpis.active_alerts} color={kpis.active_alerts > 0 ? 'text-rose-600 dark:text-rose-400' : undefined} />
                        <SummaryStat label={t('Low Battery')} value={kpis.low_battery_count} color={kpis.low_battery_count > 0 ? 'text-amber-600 dark:text-amber-400' : undefined} />
                        <SummaryStat label={t('Work Orders')} value={myRequests.length} />
                        <SummaryStat label={t('Gateways')} value={gatewayCount} last />
                    </div>
                </FadeIn>

                {/* ━━ FLEET HEALTH BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {kpis.total_devices > 0 && (
                    <FadeIn delay={75} duration={400}>
                        <div className="mt-4 rounded-lg border border-border/50 bg-card/50 px-5 py-3">
                            <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="font-mono font-medium uppercase tracking-[0.1em]">{t('Fleet Health')}</span>
                                <span className="font-mono">
                                    <span className="text-emerald-600 dark:text-emerald-400">{kpis.online_count} {t('online')}</span>
                                    {offlineCount > 0 && <> / <span className="text-rose-600 dark:text-rose-400">{offlineCount} {t('offline')}</span></>}
                                </span>
                            </div>
                            <div className="flex h-2 overflow-hidden rounded-full bg-muted/30">
                                <div className="rounded-l-full bg-emerald-500 transition-all duration-500" style={{ width: `${healthPct}%` }} />
                                {offlineCount > 0 && <div className="bg-rose-500 transition-all duration-500" style={{ width: `${100 - healthPct}%` }} />}
                            </div>
                        </div>
                    </FadeIn>
                )}

                {/* ━━ TAB SELECTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={120} duration={400}>
                    <div className="mt-6 flex overflow-hidden rounded-lg border border-border bg-card">
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex flex-1 items-center justify-center gap-2 py-2.5 text-[11px] font-medium transition-colors border-r border-border/50 last:border-r-0',
                                    activeTab === tab.id
                                        ? 'bg-accent text-foreground'
                                        : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30',
                                )}>
                                {tab.label}
                                {tab.count != null && tab.count > 0 && (
                                    <span className={cn(
                                        'rounded-full px-1.5 py-0.5 font-mono text-[9px] tabular-nums',
                                        activeTab === tab.id ? 'bg-foreground/10' : 'bg-muted',
                                    )}>{tab.count}</span>
                                )}
                                {tab.dot && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                            </button>
                        ))}
                    </div>
                </FadeIn>

                {/* ━━ TAB: OVERVIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'overview' && (
                    <>
                        {/* Floor Plan (primary) or Zone Cards (fallback) */}
                        <SectionDivider label={hasFloorPlans ? t('Site Plan') : t('Zones')} />

                        <FadeIn delay={50} duration={400}>
                            {zones.length === 0 ? (
                                <EmptyState size="sm" icon={<Cpu className="h-5 w-5 text-muted-foreground" />}
                                    title={t('No devices yet')} description={t('Add devices to this site to start monitoring')}
                                    action={<Button variant="outline" size="sm" asChild><Link href={`/sites/${site.id}/devices`}>{t('Manage Devices')}</Link></Button>}
                                />
                            ) : hasFloorPlans ? (
                                /* ── Floor plan primary view ── */
                                <Card className="border-border shadow-none overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                                        {floorPlans!.length > 1 ? (
                                            <div className="flex overflow-hidden rounded-md border border-border">
                                                {floorPlans!.map((fp, i) => (
                                                    <button key={fp.id} onClick={() => setActiveFloorIdx(i)}
                                                        className={cn(
                                                            'px-3 py-1.5 font-mono text-[10px] font-medium transition-colors border-r border-border last:border-r-0',
                                                            activeFloorIdx === i ? 'bg-accent text-foreground' : 'text-muted-foreground/60 hover:bg-accent/30',
                                                        )}>
                                                        {fp.name}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-[13px] font-semibold">{floorPlans![0].name}</span>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-[10px] text-muted-foreground">{kpis.total_devices} {t('devices')}</span>
                                            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">{kpis.online_count} {t('online')}</span>
                                            {unplacedCount > 0 && (
                                                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">{unplacedCount} {t('unplaced')}</span>
                                            )}
                                            <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" asChild>
                                                <Link href={`/sites/${site.id}/layout`}>
                                                    <Settings2 className="mr-1 h-3 w-3" />{t('Edit Layout')}
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                    <CardContent className="p-4">
                                        <FloorPlanView floorPlan={floorPlans![activeFloorIdx]} devices={floorPlans![activeFloorIdx].devices ?? []}
                                            overlayContent={zoneBoundaries
                                                .filter((zb) => zb.floor_plan_id === floorPlans![activeFloorIdx].id)
                                                .map((zb) => <ZoneRect key={zb.id} zone={zb} />)
                                            } />
                                    </CardContent>
                                </Card>
                            ) : (
                                /* ── Zone cards fallback ── */
                                <>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {zones.map((zone, i) => (
                                            <FadeIn key={zone.name} delay={i * 40} duration={400}>
                                                <ZoneCard zone={zone} siteId={site.id} />
                                            </FadeIn>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8">
                                        <Map className="h-6 w-6 text-muted-foreground/30" />
                                        <p className="text-[13px] text-muted-foreground">{t('Upload a floor plan for visual monitoring')}</p>
                                        <Button variant="outline" size="sm" className="text-[11px]" asChild>
                                            <Link href={`/sites/${site.id}/layout`}>{t('Open Layout Editor')}</Link>
                                        </Button>
                                    </div>
                                </>
                            )}
                        </FadeIn>

                        {/* Zone Summary Strip — adaptive density */}
                        {zones.length > 0 && (
                            <FadeIn delay={80} duration={400}>
                                {zones.length <= 12 ? (
                                    /* Standard: horizontal scroll with full pills */
                                    <div className="relative mt-4">
                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                                            {zones.map((zone) => (
                                                <ZonePill key={zone.name} zone={zone} siteId={site.id} />
                                            ))}
                                        </div>
                                        {zones.length > 5 && (
                                            <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-background to-transparent" />
                                        )}
                                    </div>
                                ) : (
                                    /* Compact: wrapping grid for 13+ zones */
                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                        {zones.map((zone) => (
                                            <ZonePillCompact key={zone.name} zone={zone} siteId={site.id} />
                                        ))}
                                    </div>
                                )}
                            </FadeIn>
                        )}

                        {/* Compliance summary */}
                        {kpis.total_devices > 0 && (
                            <FadeIn delay={90} duration={400}>
                                <Link href={`/sites/${site.id}/reports/temperature`}
                                    className={cn(
                                        'mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent/20',
                                        tempExcursions24h === 0
                                            ? 'border-emerald-200/60 dark:border-emerald-800/30'
                                            : 'border-amber-200/60 dark:border-amber-800/30',
                                    )}>
                                    <Thermometer className={cn('h-4 w-4', tempExcursions24h === 0 ? 'text-emerald-500' : 'text-amber-500')} />
                                    <div className="flex-1">
                                        <span className={cn('text-[13px] font-medium', tempExcursions24h === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
                                            {tempExcursions24h === 0 ? t('Temperature compliance OK') : `${tempExcursions24h} ${t('temperature excursions in 24h')}`}
                                        </span>
                                    </div>
                                    <span className="font-mono text-[10px] text-muted-foreground">{t('View Report')}</span>
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                                </Link>
                            </FadeIn>
                        )}

                        {/* Alerts section with filters */}
                        <SectionDivider label={t('Active Alerts')} />

                        {activeAlerts.length > 0 && (
                            <FadeIn delay={80} duration={300}>
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <div className="relative flex-1 min-w-[180px]">
                                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                                        <Input value={alertSearch} onChange={(e) => setAlertSearch(e.target.value)}
                                            placeholder={t('Search alerts...')}
                                            className="h-8 pl-9 text-[12px]" />
                                    </div>
                                    <div className="flex overflow-hidden rounded-md border border-border">
                                        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
                                            <button key={s} onClick={() => setAlertSeverityFilter(s)}
                                                className={cn(
                                                    'px-2.5 py-1.5 text-[10px] font-medium transition-colors border-r border-border last:border-r-0',
                                                    alertSeverityFilter === s ? 'bg-accent text-foreground' : 'text-muted-foreground/60 hover:bg-accent/30',
                                                )}>
                                                {s === 'all' ? t('All') : <span className="capitalize">{s}</span>}
                                            </button>
                                        ))}
                                    </div>
                                    {zoneNames.length > 1 && (
                                        <SearchableSelect options={zoneOptions} value={alertZoneFilter}
                                            onValueChange={setAlertZoneFilter} placeholder={t('All Zones')}
                                            searchPlaceholder={t('Search zones...')}
                                            className="h-8 min-w-[130px] text-[11px]" />
                                    )}
                                    <span className="font-mono text-[10px] text-muted-foreground/60">
                                        {filteredAlerts.length}/{activeAlerts.length}
                                    </span>
                                </div>
                            </FadeIn>
                        )}

                        <FadeIn delay={100} duration={400}>
                            {activeAlerts.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <Signal className="h-6 w-6 text-emerald-500" />
                                    <p className="text-sm text-muted-foreground">{t('All clear — no active alerts')}</p>
                                </div>
                            ) : filteredAlerts.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <Search className="h-5 w-5 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">{t('No alerts match your filters')}</p>
                                </div>
                            ) : (
                                <Card className="border-border shadow-none overflow-hidden">
                                    <div className="divide-y divide-border/30">
                                        {filteredAlerts.map((alert) => (
                                            <div key={alert.id} className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                                onClick={() => router.get(`/alerts/${alert.id}`)}>
                                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${severityDot[alert.severity] ?? severityDot.low}`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13px] font-medium">{alert.data?.rule_name ?? `Alert #${alert.id}`}</p>
                                                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                                                        {alert.data?.device_name}{alert.data?.zone && ` @ ${alert.data.zone}`}
                                                    </p>
                                                </div>
                                                <span className={`rounded border px-2 py-0.5 text-[9px] font-medium capitalize ${severityBadge[alert.severity] ?? severityBadge.low}`}>
                                                    {alert.severity}
                                                </span>
                                                {alert.data?.metric && (
                                                    <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">
                                                        {alert.data.metric}: {alert.data.value}
                                                    </span>
                                                )}
                                                <Button variant="outline" size="sm" className="h-7 text-[10px]"
                                                    onClick={(e) => { e.stopPropagation(); setWoAlertId(alert.id); }}>
                                                    <Wrench className="mr-1 h-3 w-3" />{t('WO')}
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-7 text-[10px] text-amber-600 dark:text-amber-400 border-amber-200/40 dark:border-amber-800/40"
                                                    onClick={(e) => { e.stopPropagation(); router.post(`/alerts/${alert.id}/acknowledge`, {}, { preserveScroll: true }); }}>
                                                    {t('Acknowledge')}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-border/30 px-5 py-2">
                                        <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                                            <Link href="/alerts">{t('View all alerts')}</Link>
                                        </Button>
                                    </div>
                                </Card>
                            )}
                        </FadeIn>
                    </>
                )}

                {/* ━━ TAB: ASSETS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'assets' && (
                    <>
                        <div className="my-7 flex items-center gap-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('Devices').toUpperCase()}</span>
                            <div className="h-px flex-1 bg-border" />
                            {canManage && <AddDeviceDialog siteId={site.id} zones={zoneNames} gateways={(site as any).gateways ?? []} />}
                        </div>

                        {/* Filter bar */}
                        {allDevices.length > 0 && (
                            <FadeIn delay={30} duration={300}>
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <div className="relative flex-1 min-w-[180px]">
                                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                                        <Input value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)}
                                            placeholder={t('Search devices...')}
                                            className="h-8 pl-9 text-[12px]" />
                                    </div>
                                    <div className="flex overflow-hidden rounded-md border border-border">
                                        {(['all', 'online', 'offline', 'low_battery'] as const).map((s) => (
                                            <button key={s} onClick={() => setDeviceStatusFilter(s)}
                                                className={cn(
                                                    'px-3 py-1.5 font-mono text-[10px] font-medium transition-colors border-r border-border last:border-r-0',
                                                    deviceStatusFilter === s ? 'bg-accent text-foreground' : 'text-muted-foreground/60 hover:bg-accent/30',
                                                )}>
                                                {s === 'all' ? t('All') : s === 'online' ? t('Online') : s === 'offline' ? t('Offline') : t('Low Bat.')}
                                            </button>
                                        ))}
                                    </div>
                                    {zoneNames.length > 1 && (
                                        <SearchableSelect options={zoneOptions} value={deviceZoneFilter}
                                            onValueChange={setDeviceZoneFilter} placeholder={t('All Zones')}
                                            searchPlaceholder={t('Search zones...')}
                                            className="h-8 min-w-[140px] text-[11px]" />
                                    )}
                                    <Select value={deviceSort} onValueChange={(v) => setDeviceSort(v as typeof deviceSort)}>
                                        <SelectTrigger className="h-8 w-auto min-w-[100px] text-[11px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="name">{t('Sort: Name')}</SelectItem>
                                            <SelectItem value="zone">{t('Sort: Zone')}</SelectItem>
                                            <SelectItem value="battery">{t('Sort: Battery')}</SelectItem>
                                            <SelectItem value="status">{t('Sort: Status')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="font-mono text-[10px] text-muted-foreground/60">
                                        {filteredDevices.length}/{allDevices.length}
                                    </span>
                                </div>
                            </FadeIn>
                        )}

                        <FadeIn delay={50} duration={400}>
                            {allDevices.length === 0 ? (
                                <EmptyState size="sm" icon={<Cpu className="h-5 w-5 text-muted-foreground" />}
                                    title={t('No devices yet')} description={t('Add devices to this site to start monitoring')}
                                    action={<Button variant="outline" size="sm" asChild><Link href={`/sites/${site.id}/devices`}>{t('Manage Devices')}</Link></Button>}
                                />
                            ) : filteredDevices.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <Search className="h-5 w-5 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">{t('No devices match your filters')}</p>
                                </div>
                            ) : (
                                <Card className="border-border shadow-none overflow-hidden">
                                    <div className="divide-y divide-border/30">
                                        {filteredDevices.map((device) => {
                                            const isOnline = isDeviceOnline(device.last_reading_at);
                                            const batteryLow = device.battery_pct != null && device.battery_pct < 20;
                                            return (
                                                <div key={device.id} className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                                    onClick={() => router.get(`/devices/${device.id}`)}>
                                                    <span className={`h-2 w-2 shrink-0 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="truncate text-[13px] font-medium">{device.name}</p>
                                                            <Badge variant="outline" className="shrink-0 font-mono text-[9px]">{device.model}</Badge>
                                                        </div>
                                                        <p className="truncate font-mono text-[10px] text-muted-foreground">{device.zoneName}</p>
                                                    </div>
                                                    <span className={`text-[11px] ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {isOnline ? t('Online') : t('Offline')}
                                                    </span>
                                                    {device.last_reading_at && (
                                                        <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">
                                                            {formatTimeAgo(device.last_reading_at)}
                                                        </span>
                                                    )}
                                                    {device.battery_pct != null && (
                                                        <div className="hidden items-center gap-1.5 sm:flex">
                                                            <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted/40">
                                                                <div className={`h-full rounded-full transition-all ${batteryLow ? 'bg-rose-500' : device.battery_pct < 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${device.battery_pct}%` }} />
                                                            </div>
                                                            <span className={`font-mono text-[10px] ${batteryLow ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                                                                {device.battery_pct}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            )}
                        </FadeIn>

                        <div className="my-7 flex items-center gap-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('Work Orders').toUpperCase()}</span>
                            <div className="h-px flex-1 bg-border" />
                            <MaintenanceRequestDialog siteId={site.id} variant="create" />
                        </div>
                        <FadeIn delay={150} duration={400}>
                            {myRequests.length > 0 ? (
                                <Card className="border-border shadow-none overflow-hidden">
                                    <div className="divide-y divide-border/30">
                                        {myRequests.map((wo) => (
                                            <div key={wo.id} className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                                onClick={() => router.get(`/work-orders/${wo.id}`)}>
                                                <span className={`h-2 w-2 shrink-0 rounded-full ${wo.priority === 'high' || wo.priority === 'urgent' ? 'bg-rose-500' : wo.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13px] font-medium">{wo.title}</p>
                                                    <p className="truncate font-mono text-[10px] text-muted-foreground">{wo.description}</p>
                                                </div>
                                                <Badge variant={woPriorityVariant[wo.priority] ?? 'outline'} className="text-[9px]">{wo.priority}</Badge>
                                                <Badge variant="outline" className="text-[9px]">{wo.status}</Badge>
                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                    {new Date(wo.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-border/30 px-5 py-2">
                                        <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                                            <Link href="/work-orders">{t('View All Work Orders')} →</Link>
                                        </Button>
                                    </div>
                                </Card>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <Wrench className="h-6 w-6 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">{t('No open work orders')}</p>
                                </div>
                            )}
                        </FadeIn>
                    </>
                )}

                {/* ━━ TAB: SETUP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'setup' && (
                    <>
                        {/* Checklist */}
                        {onboardingChecklist && (
                            <>
                                <SectionDivider label={t('Setup Checklist')} />
                                <FadeIn delay={50} duration={400}>
                                    <OnboardingChecklistCard checklist={onboardingChecklist} siteId={site.id} onDismiss={dismissChecklist} />
                                    {Object.values(onboardingChecklist).every(Boolean) && (
                                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800/30 dark:bg-emerald-950/10">
                                            <Check className="h-4 w-4 text-emerald-500" />
                                            <span className="text-[13px] text-emerald-700 dark:text-emerald-400">{t('All setup steps complete')}</span>
                                        </div>
                                    )}
                                </FadeIn>
                            </>
                        )}

                        {/* Configuration Grid — hidden for viewers */}
                        {canManage && (
                        <>
                        <SectionDivider label={t('Configuration')} />
                        <FadeIn delay={80} duration={400}>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <ConfigLink icon={Bell} label={t('Alert Rules')} count={configCounts?.alert_rules}
                                    href={`/sites/${site.id}/rules`} description={t('Thresholds & triggers')} />
                                <ConfigLink icon={Signal} label={t('Escalation Chains')} count={configCounts?.escalation_chains}
                                    href={`/settings/escalation-chains?site_id=${site.id}`} description={t('Notification routing')} />
                                <ConfigLink icon={FileBarChart} label={t('Report Schedules')} count={configCounts?.report_schedules}
                                    href={`/settings/report-schedules?site_id=${site.id}`} description={t('Automated reports')} />
                                <ConfigLink icon={Thermometer} label={t('Verifications')} href={`/sites/${site.id}/verifications`}
                                    description={t('Temperature checks')} />
                                <ConfigLink icon={Radio} label={t('Gateways')} count={gatewayCount}
                                    href={`/sites/${site.id}/gateways`} description={t('LoRaWAN infrastructure')} />
                                <ConfigLink icon={Map} label={t('Floor Plans')} count={floorPlans?.length}
                                    href={`/sites/${site.id}/layout`} description={t('Spatial layout')} />
                                <ConfigLink icon={Layers} label={t('Modules')} count={(site as any).modules?.length}
                                    href={`/sites/${site.id}/modules`} description={t('Active capabilities')} />
                                <ConfigLink icon={Wrench} label={t('Maintenance Windows')} count={configCounts?.maintenance_windows}
                                    href={`/settings/maintenance-windows?site_id=${site.id}`} description={t('Alert suppression')} />
                            </div>
                        </FadeIn>

                        {/* Site Access */}
                        <SiteAccessSection users={siteUsers} availableUsers={availableUsers} siteId={site.id} t={t} />

                        {/* History */}
                        <SectionDivider label={t('History')} />
                        <FadeIn delay={120} duration={400}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <ConfigLink icon={Calendar} label={t('Timeline')} href={`/sites/${site.id}/timeline`}
                                    description={t('Activity log')} />
                                <ConfigLink icon={ClipboardList} label={t('Audit Package')} href={`/sites/${site.id}/audit`}
                                    description={t('Compliance export')} />
                            </div>
                        </FadeIn>
                        </>
                        )}

                        {/* Site Details */}
                        <SectionDivider label={t('Site Details')} />
                        <FadeIn delay={160} duration={400}>
                            <Card className="border-border shadow-none">
                                <CardContent className="p-5">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Site Name')}</span>
                                            <p className="mt-1 text-[13px] font-medium">{site.name}</p>
                                        </div>
                                        <div>
                                            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Status')}</span>
                                            <p className="mt-1"><Badge variant={statusVariants[site.status] ?? 'outline'} className="text-[10px] capitalize">{site.status}</Badge></p>
                                        </div>
                                        <div>
                                            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Address')}</span>
                                            <p className="mt-1 text-[13px] text-muted-foreground">{site.address || '—'}</p>
                                            {site.lat != null && site.lng != null && (
                                                <a href={`https://www.google.com/maps?q=${site.lat},${site.lng}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-primary hover:underline">
                                                    {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
                                                    <span className="text-[8px] text-muted-foreground">&#8599;</span>
                                                </a>
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Timezone')}</span>
                                            <p className="mt-1 font-mono text-[13px]">{site.timezone || '—'}</p>
                                        </div>
                                        {site.created_at && (
                                            <div>
                                                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Created')}</span>
                                                <p className="mt-1 font-mono text-[13px]">{new Date(site.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <Button variant="outline" size="sm" className="text-[11px]" onClick={() => setShowEdit(true)}>
                                            <Pencil className="mr-1 h-3 w-3" />{t('Edit Site')}
                                        </Button>
                                        {(site.status === 'draft' || site.status === 'onboarding') && (
                                            <Button size="sm" className="text-[11px]" asChild>
                                                <Link href={`/sites/${site.id}/onboard`}>{t('Continue Onboarding')}</Link>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </FadeIn>

                        {/* Danger Zone — admins only */}
                        {canManage && (
                            <>
                                <SectionDivider label={t('Danger Zone')} />
                                <FadeIn delay={200} duration={400}>
                                    <div className="rounded-lg border border-rose-200/60 bg-rose-50/30 p-4 dark:border-rose-800/30 dark:bg-rose-950/10">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[13px] font-medium text-rose-700 dark:text-rose-400">
                                                    {site.status === 'suspended' ? t('Reactivate Site') : t('Suspend Site')}
                                                </p>
                                                <p className="text-[11px] text-rose-600/70 dark:text-rose-400/70">
                                                    {site.status === 'suspended'
                                                        ? t('Resume monitoring and alert notifications for this site')
                                                        : t('Disable monitoring and alert notifications for this site')}
                                                </p>
                                            </div>
                                            <Button variant="outline" size="sm"
                                                className="text-[11px] text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                onClick={() => setShowSuspend(true)}>
                                                <ShieldAlert className="mr-1 h-3 w-3" />
                                                {site.status === 'suspended' ? t('Reactivate') : t('Suspend')}
                                            </Button>
                                        </div>
                                    </div>
                                    <ConfirmationDialog
                                        open={showSuspend}
                                        onOpenChange={setShowSuspend}
                                        title={site.status === 'suspended' ? t('Reactivate Site') : t('Suspend Site')}
                                        description={site.status === 'suspended'
                                            ? t('Are you sure you want to reactivate this site?')
                                            : t('Are you sure you want to suspend this site?')}
                                        itemName={site.name}
                                        warningMessage={site.status === 'suspended'
                                            ? t('The site will return to active monitoring.')
                                            : t('Monitoring will continue but users will see a suspension warning.')}
                                        onConfirm={() => {
                                            router.put(`/settings/sites/${site.id}`, {
                                                name: site.name,
                                                status: site.status === 'suspended' ? 'active' : 'suspended',
                                            }, { preserveScroll: true });
                                            setShowSuspend(false);
                                        }}
                                        actionLabel={site.status === 'suspended' ? t('Reactivate') : t('Suspend')}
                                    />
                                </FadeIn>
                            </>
                        )}
                    </>
                )}

                {/* ━━ DIALOGS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SiteEditDialog site={site} timezones={timezones} open={showEdit} onOpenChange={setShowEdit} />
                {woAlert && (
                    <CreateWOFromAlertDialog siteId={site.id} alert={woAlert} open={!!woAlertId} onOpenChange={(o) => !o && setWoAlertId(null)} />
                )}
            </div>
        </AppLayout>
    );
}

/* -- Site Edit Dialog ------------------------------------------------- */

function SiteEditDialog({ site, timezones, open, onOpenChange }: {
    site: Site; timezones: string[]; open: boolean; onOpenChange: (open: boolean) => void;
}) {
    const { t } = useLang();
    const form = useForm({
        name: site.name,
        address: site.address ?? '',
        lat: site.lat != null ? String(site.lat) : '',
        lng: site.lng != null ? String(site.lng) : '',
        timezone: site.timezone ?? 'America/Mexico_City',
        status: site.status,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        router.put(`/settings/sites/${site.id}`, {
            ...form.data,
            lat: form.data.lat ? parseFloat(form.data.lat) : null,
            lng: form.data.lng ? parseFloat(form.data.lng) : null,
        }, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Edit Site')}</DialogTitle>
                    <DialogDescription>{t('Update site details')}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Site Name')}</Label>
                        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                        {form.errors.name && <p className="text-[11px] text-destructive-foreground">{form.errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Address')}</Label>
                        <Input value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} placeholder={t('Street address (optional)')} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-[11px]">{t('Latitude')}</Label>
                            <Input value={form.data.lat} onChange={(e) => form.setData('lat', e.target.value)}
                                placeholder="25.6866142" className="font-mono text-[12px]" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px]">{t('Longitude')}</Label>
                            <Input value={form.data.lng} onChange={(e) => form.setData('lng', e.target.value)}
                                placeholder="-100.3161126" className="font-mono text-[12px]" />
                        </div>
                    </div>
                    {timezones.length > 0 && (
                        <div className="space-y-2">
                            <Label>{t('Timezone')}</Label>
                            <TimezoneSelect timezones={timezones} value={form.data.timezone} onValueChange={(v) => form.setData('timezone', v)} />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>{t('Status')}</Label>
                        <Select value={form.data.status} onValueChange={(v) => form.setData('status', v as Site['status'])}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">{t('Draft')}</SelectItem>
                                <SelectItem value="active">{t('Active')}</SelectItem>
                                <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={form.processing}>{form.processing ? t('Saving...') : t('Save Changes')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* -- Create WO from Alert Dialog -------------------------------------- */

function CreateWOFromAlertDialog({ siteId, alert, open, onOpenChange }: {
    siteId: number; alert: Alert; open: boolean; onOpenChange: (open: boolean) => void;
}) {
    const { t } = useLang();
    const severityToPriority: Record<string, string> = { critical: 'urgent', high: 'high', medium: 'medium', low: 'low' };
    const form = useForm({
        type: 'maintenance' as string,
        title: `WO: ${alert.data?.rule_name ?? 'Alert'} — ${alert.data?.device_name ?? 'Device'}`,
        description: `${t('Auto-created from alert')} #${alert.id}. ${alert.data?.metric ? `${alert.data.metric}: ${alert.data.value}` : ''}`.trim(),
        priority: severityToPriority[alert.severity] ?? 'medium',
        alert_id: alert.id,
        device_id: alert.device_id ?? '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(`/sites/${siteId}/work-orders`, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Create Work Order')}</DialogTitle>
                    <DialogDescription>{t('Create a work order linked to this alert')}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${alert.severity === 'critical' ? 'bg-rose-500' : alert.severity === 'high' ? 'bg-orange-500' : 'bg-amber-400'}`} />
                        <span className="truncate text-[12px] font-medium">{alert.data?.rule_name ?? `Alert #${alert.id}`}</span>
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{alert.data?.device_name}</span>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Title')}</Label>
                        <Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>{t('Type')}</Label>
                            <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="maintenance">{t('Maintenance')}</SelectItem>
                                    <SelectItem value="inspection">{t('Inspection')}</SelectItem>
                                    <SelectItem value="battery_replace">{t('Battery Replace')}</SelectItem>
                                    <SelectItem value="sensor_replace">{t('Sensor Replace')}</SelectItem>
                                    <SelectItem value="install">{t('Install')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Priority')}</Label>
                            <Select value={form.data.priority} onValueChange={(v) => form.setData('priority', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">{t('Low')}</SelectItem>
                                    <SelectItem value="medium">{t('Medium')}</SelectItem>
                                    <SelectItem value="high">{t('High')}</SelectItem>
                                    <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Description')}</Label>
                        <Textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={3} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={form.processing}>
                            <Wrench className="mr-1.5 h-3.5 w-3.5" />
                            {form.processing ? t('Creating...') : t('Create Work Order')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* -- Helpers ---------------------------------------------------------- */

function SummaryStat({ label, value, suffix, subtitle, color, last, onClick }: {
    label: string; value: number; suffix?: string; subtitle?: string; color?: string; last?: boolean; onClick?: () => void;
}) {
    const Comp = onClick ? 'button' : 'div';
    return (
        <Comp onClick={onClick}
            className={`flex flex-1 flex-col items-center gap-1 py-5 transition-colors ${!last ? 'border-r border-border/50' : ''} ${onClick ? 'cursor-pointer hover:bg-accent/20' : ''}`}>
            <span className={`font-display text-4xl font-bold leading-none tracking-tight ${color ?? 'text-foreground'}`}>
                {value}{suffix && <span className="text-2xl">{suffix}</span>}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">{label}</span>
            {subtitle && <span className="font-mono text-[9px] text-muted-foreground/70">{subtitle}</span>}
        </Comp>
    );
}

/* ── Site Access Section ──────────────────────────────────────────── */

const ROLE_COLORS: Record<string, string> = {
    client_org_admin: 'bg-violet-500/15 text-violet-400',
    client_site_manager: 'bg-blue-500/15 text-blue-400',
    client_site_viewer: 'bg-zinc-500/15 text-zinc-400',
    super_admin: 'bg-rose-500/15 text-rose-400',
    support: 'bg-amber-500/15 text-amber-400',
    account_manager: 'bg-emerald-500/15 text-emerald-400',
    technician: 'bg-cyan-500/15 text-cyan-400',
};

const AVATAR_COLORS = [
    'bg-violet-500/20 text-violet-400',
    'bg-blue-500/20 text-blue-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-amber-500/20 text-amber-400',
    'bg-rose-500/20 text-rose-400',
    'bg-cyan-500/20 text-cyan-400',
];

function SiteAccessSection({ users, availableUsers, siteId, t }: {
    users: { id: number; name: string; email: string; role: string; has_app_access: boolean }[];
    availableUsers: { id: number; name: string; email: string; role: string }[];
    siteId: number;
    t: (key: string) => string;
}) {
    const [showAdd, setShowAdd] = useState(false);
    const [removeUserId, setRemoveUserId] = useState<number | null>(null);
    const [selectedUserId, setSelectedUserId] = useState('');

    const roleCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        users.forEach((u) => { const r = u.role ?? 'viewer'; counts[r] = (counts[r] || 0) + 1; });
        return counts;
    }, [users]);

    const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const removeUser = users.find((u) => u.id === removeUserId);

    return (
        <>
            <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('SITE ACCESS')}</span>
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">{users.length}</span>
            </div>
            <FadeIn delay={100} duration={400}>
                <Card className="shadow-elevation-1 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[13px] font-semibold">{t('Users with access')}</h3>
                            <div className="flex gap-1.5">
                                {Object.entries(roleCounts).map(([role, count]) => (
                                    <span key={role} className={cn('rounded-full px-2 py-0.5 text-[9px] font-medium', ROLE_COLORS[role] ?? 'bg-muted text-muted-foreground')}>
                                        {count} {role.replace('client_', '').replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {availableUsers.length > 0 && (
                            <Button variant="default" size="sm" className="h-7 text-[11px]" onClick={() => setShowAdd(true)}>
                                <Plus className="mr-1 h-3 w-3" /> {t('Add User')}
                            </Button>
                        )}
                    </div>

                    {/* User rows */}
                    {users.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">{t('No users assigned to this site')}</div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {users.map((user, i) => (
                                <div key={user.id}
                                    className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
                                    <div className={cn('flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg font-display text-[11px] font-semibold', AVATAR_COLORS[i % AVATAR_COLORS.length])}
                                        onClick={() => router.get(`/settings/users/${user.id}`)}>
                                        {initials(user.name)}
                                    </div>
                                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => router.get(`/settings/users/${user.id}`)}>
                                        <p className="text-[13px] font-medium">{user.name}</p>
                                        <p className="truncate font-mono text-[10px] text-muted-foreground/60">{user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-medium', ROLE_COLORS[user.role ?? ''] ?? 'bg-muted text-muted-foreground')}>
                                            {(user.role ?? 'viewer').replace('client_', '').replace(/_/g, ' ')}
                                        </span>
                                        {user.has_app_access && (
                                            <span className="rounded-full bg-teal-500/10 px-1.5 py-0.5 text-[8px] font-medium text-teal-400">App</span>
                                        )}
                                        <button className="ml-1 hidden text-muted-foreground/40 transition-colors hover:text-destructive group-hover:inline-flex"
                                            onClick={() => setRemoveUserId(user.id)} title={t('Remove access')}>
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5">
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                            {users.length} {t('users')}
                        </span>
                        <button
                            className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => router.get('/settings/users')}
                        >
                            {t('Manage All Users')} &rarr;
                        </button>
                    </div>
                </Card>
            </FadeIn>

            {/* Add User Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('Add User to Site')}</DialogTitle>
                        <DialogDescription>{t('Grant an existing user access to this site.')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger><SelectValue placeholder={t('Select a user')} /></SelectTrigger>
                            <SelectContent>
                                {availableUsers.map((u) => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                        <span className="font-medium">{u.name}</span>
                                        <span className="ml-2 text-muted-foreground">{u.email}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setSelectedUserId(''); }}>{t('Cancel')}</Button>
                        <Button size="sm" disabled={!selectedUserId}
                            onClick={() => {
                                router.post(`/sites/${siteId}/access`, { user_id: Number(selectedUserId) }, {
                                    preserveScroll: true,
                                    onSuccess: () => { setShowAdd(false); setSelectedUserId(''); },
                                });
                            }}>{t('Grant Access')}</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Remove Confirmation */}
            <ConfirmationDialog
                open={removeUserId !== null}
                onOpenChange={(open) => { if (!open) setRemoveUserId(null); }}
                title={t('Remove Access')}
                description={`${t('Remove')} ${removeUser?.name ?? ''} ${t('from this site')}?`}
                onConfirm={() => {
                    if (removeUserId) {
                        router.delete(`/sites/${siteId}/access/${removeUserId}`, {
                            preserveScroll: true,
                            onSuccess: () => setRemoveUserId(null),
                        });
                    }
                }}
                actionLabel={t('Remove')}
            />
        </>
    );
}

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{label.toUpperCase()}</span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

/* -- Zone Card -------------------------------------------------------- */

function ZoneCard({ zone, siteId }: { zone: ZoneSummary; siteId: number }) {
    const { t } = useLang();
    const primary = zone.summary?.[0]; // Primary metric (first in array)
    const onlinePct = zone.device_count > 0 ? Math.round((zone.online_count / zone.device_count) * 100) : 0;
    const allOnline = zone.online_count === zone.device_count;

    return (
        <Card className="group cursor-pointer border-border shadow-none transition-colors hover:bg-accent/20"
            onClick={() => router.get(`/sites/${siteId}/zones/${encodeURIComponent(zone.name)}`)}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{zone.name}</span>
                    <span className={`font-mono text-[10px] ${allOnline ? 'text-emerald-600 dark:text-emerald-400' : zone.online_count === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {zone.online_count}/{zone.device_count} {t('devices')}
                    </span>
                </div>
                {primary ? (
                    <div className="mt-3">
                        <div className="flex items-baseline gap-1">
                            <span className="font-display text-3xl font-bold tabular-nums leading-none">
                                {primary.current?.toFixed(1) ?? '—'}
                            </span>
                            <span className="text-sm text-muted-foreground">{primary.unit}</span>
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            min {primary.min?.toFixed(1)} · avg {primary.avg?.toFixed(1)} · max {primary.max?.toFixed(1)}
                        </p>
                    </div>
                ) : (
                    <div className="mt-3">
                        <span className="font-display text-3xl font-bold tabular-nums leading-none text-muted-foreground/30">—</span>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground/50">{t('No readings')}</p>
                    </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                    <div className={`h-1 flex-1 rounded-full ${onlinePct === 100 ? 'bg-emerald-500' : onlinePct > 50 ? 'bg-amber-400' : onlinePct > 0 ? 'bg-rose-400' : 'bg-muted'}`} />
                    <span className="font-mono text-[9px] tabular-nums text-muted-foreground/70">{onlinePct}%</span>
                </div>
            </CardContent>
        </Card>
    );
}

/* -- Zone Pill (summary strip) ---------------------------------------- */

function ZonePill({ zone, siteId }: { zone: ZoneSummary; siteId: number }) {
    const { t } = useLang();
    const primary = zone.summary?.[0];
    const onlinePct = zone.device_count > 0 ? Math.round((zone.online_count / zone.device_count) * 100) : 0;
    const healthColor = onlinePct === 100 ? 'bg-emerald-500' : onlinePct > 0 ? 'bg-amber-400' : zone.device_count > 0 ? 'bg-rose-500' : 'bg-muted-foreground/30';

    return (
        <button onClick={() => router.get(`/sites/${siteId}/zones/${encodeURIComponent(zone.name)}`)}
            className="flex shrink-0 items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/20 min-w-[170px]">
            <div className={`w-[3px] self-stretch rounded-full ${healthColor}`} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold">{zone.name}</p>
                <p className="font-mono text-[9px] text-muted-foreground/70">
                    {zone.online_count}/{zone.device_count} {t('online')}
                </p>
            </div>
            {primary ? (
                <div className="text-right">
                    <span className="font-display text-xl font-bold tracking-tight leading-none">
                        {primary.current?.toFixed(1) ?? '—'}
                        <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{primary.unit}</span>
                    </span>
                    <p className="font-mono text-[8px] text-muted-foreground/60">
                        min {primary.min?.toFixed(0)} · max {primary.max?.toFixed(0)}
                    </p>
                </div>
            ) : (
                <span className="font-display text-xl font-bold text-muted-foreground/30">—</span>
            )}
        </button>
    );
}

/* -- Zone Pill Compact (for 13+ zones) -------------------------------- */

function ZonePillCompact({ zone, siteId }: { zone: ZoneSummary; siteId: number }) {
    const primary = zone.summary?.[0];
    const onlinePct = zone.device_count > 0 ? Math.round((zone.online_count / zone.device_count) * 100) : 0;
    const dotColor = onlinePct === 100 ? 'bg-emerald-500' : onlinePct > 0 ? 'bg-amber-400' : zone.device_count > 0 ? 'bg-rose-500' : 'bg-muted-foreground/30';

    return (
        <button onClick={() => router.get(`/sites/${siteId}/zones/${encodeURIComponent(zone.name)}`)}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-primary/30 hover:bg-accent/20">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
            <span className="text-[11px] font-medium">{zone.name}</span>
            {primary ? (
                <span className="font-display text-[13px] font-bold tabular-nums leading-none">
                    {primary.current?.toFixed(1) ?? '—'}
                    <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">{primary.unit}</span>
                </span>
            ) : (
                <span className="text-[13px] font-bold text-muted-foreground/30">—</span>
            )}
        </button>
    );
}

/* -- Config Link (Setup tab) ------------------------------------------ */

function ConfigLink({ icon: Icon, label, count, href, description }: {
    icon: React.ElementType; label: string; count?: number; href: string; description: string;
}) {
    return (
        <Link href={href}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/30 hover:bg-accent/20">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{label}</span>
                    {count != null && count > 0 && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-muted-foreground">{count}</span>
                    )}
                </div>
                <p className="text-[10px] text-muted-foreground/70">{description}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
        </Link>
    );
}

/* -- Add Device Dialog ------------------------------------------------ */

function AddDeviceDialog({ siteId, zones, gateways }: {
    siteId: number; zones: string[]; gateways: { id: number; model: string; serial: string }[];
}) {
    const { t } = useLang();
    const [open, setOpen] = useState(false);
    const form = useForm({
        name: '', model: 'EM300-TH', dev_eui: '', zone: '', gateway_id: gateways[0]?.id?.toString() ?? '',
    });

    const sensorModels = ['EM300-TH', 'CT101', 'WS301', 'GS101', 'EM300-PT', 'EM310-UDL', 'AM307'];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(`/sites/${siteId}/devices`, {
            preserveScroll: true,
            onSuccess: () => { form.reset(); setOpen(false); },
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[10px]">
                    <Plus className="mr-1 h-3 w-3" />{t('Add Device')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Add Device')}</DialogTitle>
                    <DialogDescription>{t('Register a new sensor device for this site')}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Device Name')}</Label>
                        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)}
                            placeholder={t('e.g. EM300-TH - Cooler A')} />
                        {form.errors.name && <p className="text-[11px] text-destructive">{form.errors.name}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>{t('Model')}</Label>
                            <Select value={form.data.model} onValueChange={(v) => form.setData('model', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {sensorModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('DevEUI')}</Label>
                            <Input value={form.data.dev_eui} onChange={(e) => form.setData('dev_eui', e.target.value)}
                                placeholder="A81758FFFE..." className="font-mono text-[12px]" />
                            {form.errors.dev_eui && <p className="text-[11px] text-destructive">{form.errors.dev_eui}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>{t('Zone')}</Label>
                            <Select value={form.data.zone} onValueChange={(v) => form.setData('zone', v)}>
                                <SelectTrigger><SelectValue placeholder={t('Select zone...')} /></SelectTrigger>
                                <SelectContent>
                                    {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                                    <SelectItem value="__new">{t('+ New zone')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {gateways.length > 0 && (
                            <div className="space-y-2">
                                <Label>{t('Gateway')}</Label>
                                <Select value={form.data.gateway_id} onValueChange={(v) => form.setData('gateway_id', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {gateways.map((gw) => (
                                            <SelectItem key={gw.id} value={String(gw.id)}>{gw.model} — {gw.serial}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    {form.data.zone === '__new' && (
                        <div className="space-y-2">
                            <Label>{t('New Zone Name')}</Label>
                            <Input onChange={(e) => form.setData('zone', e.target.value)}
                                placeholder={t('e.g. Cold Room 3')} />
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={form.processing || !form.data.name || !form.data.dev_eui}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {form.processing ? t('Creating...') : t('Add Device')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* -- Maintenance Request Dialog --------------------------------------- */

function MaintenanceRequestDialog({ siteId, variant = 'report' }: { siteId: number; variant?: 'report' | 'create' }) {
    const { t } = useLang();
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        title: variant === 'create' ? '' : 'Maintenance Request', type: 'maintenance' as const, description: '', priority: 'medium',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(`/sites/${siteId}/work-orders`, { onSuccess: () => { reset(); setOpen(false); } });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {variant === 'create' ? (
                    <Button variant="outline" size="sm" className="h-7 text-[10px]">
                        <Plus className="mr-1 h-3 w-3" />{t('New')}
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" className="text-[11px] text-amber-600 dark:text-amber-400 border-border hover:border-amber-300 dark:hover:border-amber-800">
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" />{t('Report Issue')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{variant === 'create' ? t('New Work Order') : t('Request Maintenance')}</DialogTitle>
                        <DialogDescription>{variant === 'create' ? t('Create a work order for this site') : t('Submit a maintenance request for this site. The operations team will be notified.')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label className="text-xs">{t('Title')}</Label>
                            <Input value={data.title} onChange={(e) => setData('title', e.target.value)}
                                placeholder={t('e.g. Replace battery on Cooler A sensor')} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label className="text-xs">{t('Type')}</Label>
                                <Select value={data.type} onValueChange={(v) => setData('type', v as typeof data.type)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="maintenance">{t('Maintenance')}</SelectItem>
                                        <SelectItem value="inspection">{t('Inspection')}</SelectItem>
                                        <SelectItem value="battery_replace">{t('Battery Replace')}</SelectItem>
                                        <SelectItem value="sensor_replace">{t('Sensor Replace')}</SelectItem>
                                        <SelectItem value="install">{t('Install')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs">{t('Priority')}</Label>
                                <Select value={data.priority} onValueChange={(v) => setData('priority', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{t('Low')}</SelectItem>
                                        <SelectItem value="medium">{t('Medium')}</SelectItem>
                                        <SelectItem value="high">{t('High')}</SelectItem>
                                        <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs">{t('Description')}</Label>
                            <Textarea placeholder={t('Describe what needs attention...')} value={data.description}
                                onChange={(e) => setData('description', e.target.value)} rows={3} />
                            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={processing || !data.title.trim()}>
                            <Wrench className="mr-1.5 h-3.5 w-3.5" />{variant === 'create' ? t('Create Work Order') : t('Submit Request')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* -- Onboarding Checklist --------------------------------------------- */

function OnboardingChecklistCard({ checklist, siteId, onDismiss }: { checklist: OnboardingChecklist; siteId: number; onDismiss: () => void }) {
    const { t } = useLang();
    const items = [
        { key: 'gateway_registered', label: t('Gateway registered'), done: checklist.gateway_registered, href: `/sites/${siteId}/onboard` },
        { key: 'devices_provisioned', label: t('Devices provisioned'), done: checklist.devices_provisioned, href: `/sites/${siteId}/onboard` },
        { key: 'modules_activated', label: t('Modules activated'), done: checklist.modules_activated, href: `/sites/${siteId}/modules` },
        { key: 'escalation_chain_configured', label: t('Escalation chain configured'), done: checklist.escalation_chain_configured, href: '/settings/escalation-chains' },
        { key: 'report_schedule_configured', label: t('Report schedule configured'), done: checklist.report_schedule_configured, href: `/sites/${siteId}/reports/summary` },
    ];
    const completedCount = items.filter((i) => i.done).length;
    const completionPct = Math.round((completedCount / items.length) * 100);

    if (completedCount === items.length) return null;

    return (
        <Card className="mt-4 border-border shadow-none">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">{t('Setup Checklist')}</span>
                        <p className="mt-1 text-sm font-semibold">{t('Complete your site setup')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold tabular-nums">{completionPct}%</span>
                        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-7 w-7 p-0">
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
                <Progress value={completionPct} size="sm" className="mt-3"
                    variant={completionPct >= 80 ? 'success' : completionPct >= 40 ? 'warning' : 'default'} />
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <div key={item.key}
                            onClick={() => !item.done && router.get(item.href)}
                            className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                                item.done
                                    ? 'border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/10'
                                    : 'border-border bg-muted/30 cursor-pointer hover:border-primary/30 hover:bg-accent/20'
                            }`}>
                            {item.done
                                ? <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                                : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                            }
                            <span className={`flex-1 ${item.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>{item.label}</span>
                            {!item.done && <ArrowLeft className="h-3 w-3 rotate-180 text-muted-foreground/40" />}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/* -- Skeleton --------------------------------------------------------- */

export function SiteShowSkeleton() {
    return (
        <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-3 h-7 w-48" />
            <div className="mt-2 flex gap-2"><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-28 rounded-full" /></div>
            <div className="mt-6 flex overflow-hidden rounded-lg border border-border">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2 border-r border-border/50 py-5 last:border-r-0">
                        <Skeleton className="h-9 w-10" />
                        <Skeleton className="h-2 w-14" />
                    </div>
                ))}
            </div>
            <Skeleton className="mt-4 h-10 w-full rounded-lg" />
            <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-border/50" /><Skeleton className="h-2 w-12" /><div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border p-4">
                        <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" /></div>
                        <Skeleton className="mt-3 h-9 w-16" />
                        <Skeleton className="mt-2 h-2 w-28" />
                        <Skeleton className="mt-3 h-1 w-full rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
