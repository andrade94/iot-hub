import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import FloorPlanView from '@/components/FloorPlanView';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type {
    Alert, BreadcrumbItem, Device, FloorPlan, SharedData, Site, SiteKPIs, WorkOrder, ZoneSummary,
} from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle, ArrowLeft, Bell, Calendar, Check, ChevronDown, Circle,
    ClipboardList, Clock, Cpu, FileBarChart, Pencil, Settings2, ShieldAlert, Signal,
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

export default function SiteShow({ site, kpis, zones, activeAlerts, floorPlans, myRequests = [], onboardingChecklist }: Props) {
    const { t } = useLang();
    const { auth } = usePage<SharedData>().props;
    const isViewer = auth.roles.includes('client_site_viewer');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: site.name, href: '#' },
    ];

    const healthPct = kpis.total_devices > 0 ? Math.round((kpis.online_count / kpis.total_devices) * 100) : 0;
    const offlineCount = kpis.total_devices - kpis.online_count;

    // Flatten all devices from zones for the devices table
    const allDevices = useMemo(() => zones.flatMap((z) => z.devices.map((d) => ({ ...d, zoneName: z.name }))), [zones]);

    // Dismissable checklist
    const [checklistDismissed, setChecklistDismissed] = useState(() => {
        try { return localStorage.getItem(`onboarding-checklist-dismissed-${site.id}`) === 'true'; } catch { return false; }
    });
    const dismissChecklist = useCallback(() => {
        localStorage.setItem(`onboarding-checklist-dismissed-${site.id}`, 'true');
        setChecklistDismissed(true);
    }, [site.id]);

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
                            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{site.name}</h1>
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
                                        <DropdownMenuItem onClick={() => router.get(`/sites/${site.id}/users`)}>
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

                            <Button size="sm" className="text-[11px]" onClick={() => router.get(`/sites/${site.id}/edit`)}>
                                <Pencil className="mr-1 h-3.5 w-3.5" />{t('Edit')}
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ KPI STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={400}>
                    <div className="mt-6 flex items-stretch overflow-hidden rounded-lg border border-border bg-card">
                        <SummaryStat label={t('Devices')} value={kpis.total_devices} />
                        <SummaryStat label={t('Gateways')} value={0} subtitle={t('registered')} />
                        <SummaryStat label={t('Online')} value={healthPct} suffix="%" color={healthPct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : healthPct > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'} />
                        <SummaryStat label={t('Alerts')} value={kpis.active_alerts} color={kpis.active_alerts > 0 ? 'text-rose-600 dark:text-rose-400' : undefined} />
                        <SummaryStat label={t('Work Orders')} value={0} color={undefined} />
                        <SummaryStat label={t('Zones')} value={zones.length} last />
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

                {/* ━━ DETAILS BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={100} duration={400}>
                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/50 bg-card/50 px-5 py-3">
                        {site.timezone && (
                            <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span className="font-mono text-[11px] font-medium text-foreground/80">{site.timezone}</span>
                            </div>
                        )}
                        <span className="text-border/60">|</span>
                        <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-muted-foreground">{t('Created')}</span>
                            <span className="font-mono text-foreground/80">{t('—')}</span>
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ ONBOARDING CHECKLIST ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {onboardingChecklist && !checklistDismissed && (
                    <FadeIn delay={120} duration={400}>
                        <OnboardingChecklistCard checklist={onboardingChecklist} onDismiss={dismissChecklist} />
                    </FadeIn>
                )}

                {/* ━━ ZONES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={t('Zones')} />
                <FadeIn delay={150} duration={400}>
                    {zones.length === 0 ? (
                        <EmptyState size="sm" icon={<Cpu className="h-5 w-5 text-muted-foreground" />}
                            title={t('No devices yet')} description={t('Add devices to this site to start monitoring')}
                            action={<Button variant="outline" size="sm" asChild><Link href={`/sites/${site.id}/devices`}>{t('Manage Devices')}</Link></Button>}
                        />
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {zones.map((zone, i) => (
                                <FadeIn key={zone.name} delay={i * 40} duration={400}>
                                    <ZoneCard zone={zone} siteId={site.id} />
                                </FadeIn>
                            ))}
                        </div>
                    )}
                </FadeIn>

                {/* ━━ FLOOR PLAN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {floorPlans && floorPlans.length > 0 && (
                    <>
                        <SectionDivider label={t('Floor Plan')} />
                        <FadeIn delay={200} duration={400}>
                            {floorPlans.map((fp) => (
                                <Card key={fp.id} className="border-border shadow-none">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {fp.name}
                                            {fp.floor_number != null && <span className="ml-2 font-mono text-xs text-muted-foreground">Floor {fp.floor_number}</span>}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <FloorPlanView floorPlan={fp} devices={fp.devices ?? []} />
                                    </CardContent>
                                </Card>
                            ))}
                        </FadeIn>
                    </>
                )}

                {/* ━━ ACTIVE ALERTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={t('Active Alerts')} />
                <FadeIn delay={250} duration={400}>
                    {activeAlerts.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10">
                            <Signal className="h-6 w-6 text-emerald-500" />
                            <p className="text-sm text-muted-foreground">{t('All clear — no active alerts')}</p>
                        </div>
                    ) : (
                        <Card className="border-border shadow-none overflow-hidden">
                            <div className="divide-y divide-border/30">
                                {activeAlerts.map((alert) => (
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
                                        <Button variant="outline" size="sm" className="h-7 text-[10px] text-amber-600 dark:text-amber-400 border-amber-200/40 dark:border-amber-800/40"
                                            onClick={(e) => { e.stopPropagation(); }}>
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

                {/* ━━ WORK ORDERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={t('Work Orders')} />
                <FadeIn delay={280} duration={400}>
                    {isViewer && myRequests.length > 0 ? (
                        <Card className="border-border shadow-none overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                                <span className="font-mono text-[10px] text-muted-foreground">{myRequests.length} {t('open work orders')}</span>
                            </div>
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
                        </Card>
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-10">
                            <Wrench className="h-6 w-6 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">{t('No open work orders')}</p>
                        </div>
                    )}
                </FadeIn>

                {/* ━━ DEVICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {allDevices.length > 0 && (
                    <>
                        <SectionDivider label={t('Devices')} />
                        <FadeIn delay={320} duration={400}>
                            <Card className="border-border shadow-none overflow-hidden">
                                <div className="divide-y divide-border/30">
                                    {allDevices.map((device) => {
                                        const isOnline = device.status === 'active';
                                        const batteryLow = device.battery_pct != null && device.battery_pct < 20;
                                        return (
                                            <div key={device.id} className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                                onClick={() => router.get(`/devices/${device.id}`)}>
                                                <span className={`h-2 w-2 shrink-0 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13px] font-medium">{device.name}</p>
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
                        </FadeIn>
                    </>
                )}
            </div>
        </AppLayout>
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

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border/50" />
            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{label.toUpperCase()}</span>
            <div className="h-px flex-1 bg-border/50" />
        </div>
    );
}

/* -- Zone Card -------------------------------------------------------- */

function ZoneCard({ zone, siteId }: { zone: ZoneSummary; siteId: number }) {
    const { t } = useLang();
    const tempSummary = zone.summary?.find((s) => s.metric === 'temperature');
    const onlinePct = zone.device_count > 0 ? Math.round((zone.online_count / zone.device_count) * 100) : 0;
    const allOnline = zone.online_count === zone.device_count;

    return (
        <Card className="group cursor-pointer border-border shadow-none transition-colors hover:bg-accent/20"
            onClick={() => router.get(`/sites/${siteId}/zones/${encodeURIComponent(zone.name)}`)}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{zone.name}</span>
                    <span className={`font-mono text-[10px] ${allOnline ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'}`}>
                        {zone.online_count}/{zone.device_count} {t('devices')}
                    </span>
                </div>
                {tempSummary && (
                    <div className="mt-3">
                        <div className="flex items-baseline gap-1">
                            <span className="font-display text-3xl font-bold tabular-nums leading-none">
                                {tempSummary.current?.toFixed(1) ?? '—'}
                            </span>
                            <span className="text-sm text-muted-foreground">°C</span>
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {t('Range')}: {tempSummary.min?.toFixed(0) ?? '—'}°C – {tempSummary.max?.toFixed(0) ?? '—'}°C
                        </p>
                    </div>
                )}
                <div className={`mt-3 h-1 rounded-full ${onlinePct === 100 ? 'bg-emerald-500' : onlinePct > 50 ? 'bg-amber-400' : 'bg-rose-500'}`} />
            </CardContent>
        </Card>
    );
}

/* -- Maintenance Request Dialog --------------------------------------- */

function MaintenanceRequestDialog({ siteId }: { siteId: number }) {
    const { t } = useLang();
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        title: 'Maintenance Request', type: 'maintenance' as const, description: '', priority: 'medium',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(`/sites/${siteId}/work-orders`, { onSuccess: () => { reset(); setOpen(false); } });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-[11px] text-amber-600 dark:text-amber-400 border-border hover:border-amber-300 dark:hover:border-amber-800">
                    <AlertTriangle className="mr-1 h-3.5 w-3.5" />{t('Report Issue')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('Request Maintenance')}</DialogTitle>
                        <DialogDescription>{t('Submit a maintenance request for this site. The operations team will be notified.')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label className="text-xs">{t('Description')}</Label>
                            <Textarea placeholder={t('Describe what needs attention...')} value={data.description}
                                onChange={(e) => setData('description', e.target.value)} rows={4} />
                            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs">{t('Priority')}</Label>
                            <Select value={data.priority} onValueChange={(v) => setData('priority', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">{t('Low')}</SelectItem>
                                    <SelectItem value="medium">{t('Medium')}</SelectItem>
                                    <SelectItem value="high">{t('High')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={processing}>
                            <Wrench className="mr-1.5 h-3.5 w-3.5" />{t('Submit Request')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* -- Onboarding Checklist --------------------------------------------- */

function OnboardingChecklistCard({ checklist, onDismiss }: { checklist: OnboardingChecklist; onDismiss: () => void }) {
    const { t } = useLang();
    const items = [
        { key: 'gateway_registered', label: t('Gateway registered'), done: checklist.gateway_registered },
        { key: 'devices_provisioned', label: t('Devices provisioned'), done: checklist.devices_provisioned },
        { key: 'modules_activated', label: t('Modules activated'), done: checklist.modules_activated },
        { key: 'escalation_chain_configured', label: t('Escalation chain configured'), done: checklist.escalation_chain_configured },
        { key: 'report_schedule_configured', label: t('Report schedule configured'), done: checklist.report_schedule_configured },
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
                        <div key={item.key} className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                            item.done ? 'border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/10' : 'border-border bg-muted/30'
                        }`}>
                            {item.done
                                ? <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                                : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                            }
                            <span className={item.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}>{item.label}</span>
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
