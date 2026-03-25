import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Label } from '@/components/ui/label';
import { CircularProgress, Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type {
    Alert,
    BreadcrumbItem,
    Device,
    FloorPlan,
    SharedData,
    Site,
    SiteKPIs,
    WorkOrder,
    ZoneSummary,
} from '@/types';
import FloorPlanView from '@/components/FloorPlanView';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BatteryLow,
    Check,
    ChevronRight,
    Circle,
    Cpu,
    FileText,
    Signal,
    Thermometer,
    WifiOff,
    Wrench,
    X,
} from 'lucide-react';
import { useCallback, useState } from 'react';

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

const statusBadgeVariant: Record<
    string,
    'outline-success' | 'outline-warning' | 'outline'
> = {
    active: 'outline-success',
    onboarding: 'outline-warning',
    inactive: 'outline',
};

const woPriorityVariant: Record<string, 'outline' | 'outline-warning' | 'destructive'> = {
    low: 'outline',
    medium: 'outline-warning',
    high: 'destructive',
    urgent: 'destructive',
};

export default function SiteShow({
    site,
    kpis,
    zones,
    activeAlerts,
    floorPlans,
    myRequests = [],
    onboardingChecklist,
}: Props) {
    const { t } = useLang();
    const { auth } = usePage<SharedData>().props;
    const isViewer = auth.roles.includes('client_site_viewer');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: site.name, href: '#' },
    ];

    const healthPct =
        kpis.total_devices > 0
            ? Math.round((kpis.online_count / kpis.total_devices) * 100)
            : 0;

    // Feature 4: Dismissable checklist
    const [checklistDismissed, setChecklistDismissed] = useState(() => {
        try {
            return localStorage.getItem(`onboarding-checklist-dismissed-${site.id}`) === 'true';
        } catch {
            return false;
        }
    });

    const dismissChecklist = useCallback(() => {
        localStorage.setItem(`onboarding-checklist-dismissed-${site.id}`, 'true');
        setChecklistDismissed(true);
    }, [site.id]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={site.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Site Monitor')}
                                </p>
                                <div className="mt-1.5 flex items-center gap-3">
                                    <h1 className="font-display text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                        {site.name}
                                    </h1>
                                    <Badge
                                        variant={
                                            statusBadgeVariant[site.status] ??
                                            'outline'
                                        }
                                    >
                                        {site.status}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Site overview and zone health')}
                                    {site.timezone && (
                                        <span className="ml-2 font-mono text-xs">
                                            ({site.timezone})
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {isViewer && (
                                    <MaintenanceRequestDialog siteId={site.id} />
                                )}
                                <Button variant="outline" size="sm" asChild>
                                    <Link
                                        href={`/sites/${site.id}/reports/summary`}
                                    >
                                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Summary')}
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link
                                        href={`/sites/${site.id}/reports/temperature`}
                                    >
                                        <Thermometer className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Temp Report')}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Post-Onboarding Checklist (Feature 4) ─────── */}
                {onboardingChecklist && !checklistDismissed && (
                    <FadeIn delay={50} duration={400}>
                        <OnboardingChecklistCard
                            checklist={onboardingChecklist}
                            onDismiss={dismissChecklist}
                        />
                    </FadeIn>
                )}

                {/* ── KPI Row ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                    {(
                        [
                            {
                                title: t('Devices'),
                                value: kpis.total_devices,
                                icon: <Cpu className="h-5 w-5" />,
                            },
                            {
                                title: t('Online'),
                                value: kpis.online_count,
                                icon: <Signal className="h-5 w-5" />,
                                description:
                                    kpis.total_devices > 0
                                        ? `${healthPct}%`
                                        : undefined,
                            },
                            {
                                title: t('Offline'),
                                value: kpis.offline_count,
                                icon: <WifiOff className="h-5 w-5" />,
                                className:
                                    kpis.offline_count > 0
                                        ? 'border-red-200/50 dark:border-red-900/30'
                                        : undefined,
                            },
                            {
                                title: t('Active Alerts'),
                                value: kpis.active_alerts,
                                icon: <AlertTriangle className="h-5 w-5" />,
                                className:
                                    kpis.active_alerts > 0
                                        ? 'border-amber-200/50 dark:border-amber-900/30'
                                        : undefined,
                            },
                            {
                                title: t('Low Battery'),
                                value: kpis.low_battery_count,
                                icon: <BatteryLow className="h-5 w-5" />,
                                className:
                                    kpis.low_battery_count > 0
                                        ? 'border-orange-200/50 dark:border-orange-900/30'
                                        : undefined,
                            },
                        ] as const
                    ).map((card, i) => (
                        <FadeIn key={card.title} delay={i * 60} duration={400}>
                            <StatCard
                                variant="elevated"
                                title={card.title}
                                value={card.value}
                                icon={card.icon}
                                description={card.description}
                                className={card.className}
                            />
                        </FadeIn>
                    ))}
                </div>

                {/* ── Fleet Health Gauge ───────────────────────────── */}
                {kpis.total_devices > 0 && (
                    <FadeIn delay={100} duration={500}>
                        <Card className="shadow-elevation-1">
                            <CardContent className="flex items-center gap-6 p-6">
                                <CircularProgress
                                    value={healthPct}
                                    size="xl"
                                    variant={
                                        healthPct > 80
                                            ? 'success'
                                            : healthPct > 50
                                              ? 'warning'
                                              : 'destructive'
                                    }
                                    showLabel
                                />
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {t('Site Health')}
                                        </p>
                                        <p className="mt-1 text-lg font-semibold">
                                            <span className="font-mono tabular-nums">
                                                {kpis.online_count}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {' / '}
                                                <span className="font-mono tabular-nums">
                                                    {kpis.total_devices}
                                                </span>
                                            </span>{' '}
                                            <span className="text-sm font-normal text-muted-foreground">
                                                {t('devices online')}
                                            </span>
                                        </p>
                                    </div>
                                    <Progress
                                        value={healthPct}
                                        size="sm"
                                        variant={
                                            healthPct > 80
                                                ? 'success'
                                                : healthPct > 50
                                                  ? 'warning'
                                                  : 'destructive'
                                        }
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* ── Floor Plans ──────────────────────────────────── */}
                {floorPlans && floorPlans.length > 0 && (
                    <FadeIn delay={150} duration={500}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Floor Plans')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {floorPlans.length}
                                </span>
                            </div>
                            {floorPlans.map((fp) => (
                                <Card
                                    key={fp.id}
                                    className="shadow-elevation-1"
                                >
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            {fp.name}{' '}
                                            {fp.floor_number != null && (
                                                <span className="font-mono text-sm font-normal text-muted-foreground">
                                                    — Floor {fp.floor_number}
                                                </span>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <FloorPlanView
                                            floorPlan={fp}
                                            devices={fp.devices ?? []}
                                        />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </FadeIn>
                )}

                {/* ── Zones + Alerts Layout ────────────────────────── */}
                <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_340px]">
                    {/* Zones */}
                    <FadeIn delay={200} duration={500}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Zones')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {zones.length}
                                </span>
                            </div>
                            {zones.length === 0 ? (
                                <EmptyState
                                    size="sm"
                                    icon={
                                        <Cpu className="h-5 w-5 text-muted-foreground" />
                                    }
                                    title={t('No devices yet')}
                                    description={t(
                                        'Add devices to this site to start monitoring',
                                    )}
                                    action={
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={`/sites/${site.id}/devices`}
                                            >
                                                {t('Manage Devices')}
                                            </Link>
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {zones.map((zone, i) => (
                                        <FadeIn
                                            key={zone.name}
                                            delay={i * 50}
                                            duration={400}
                                        >
                                            <ZoneCard
                                                zone={zone}
                                                siteId={site.id}
                                            />
                                        </FadeIn>
                                    ))}
                                </div>
                            )}
                        </div>
                    </FadeIn>

                    {/* Active Alerts Sidebar */}
                    <FadeIn delay={250} duration={500}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Active Alerts')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                                {activeAlerts.length > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="font-mono tabular-nums"
                                    >
                                        {activeAlerts.length}
                                    </Badge>
                                )}
                            </div>
                            {activeAlerts.length === 0 ? (
                                <Card className="shadow-elevation-1">
                                    <CardContent className="flex items-center justify-center py-10">
                                        <div className="text-center">
                                            <Signal className="mx-auto h-6 w-6 text-emerald-400" />
                                            <p className="mt-2 text-sm font-medium text-muted-foreground">
                                                {t('All clear')}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-2">
                                    {activeAlerts.map((alert) => (
                                        <AlertCard
                                            key={alert.id}
                                            alert={alert}
                                        />
                                    ))}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-xs"
                                        asChild
                                    >
                                        <Link href="/alerts">
                                            {t('View all alerts')}{' '}
                                            <ChevronRight className="ml-1 h-3 w-3" />
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </FadeIn>
                </div>

                {/* ── My Requests (Feature 3 — viewer only) ─────── */}
                {isViewer && myRequests.length > 0 && (
                    <FadeIn delay={300} duration={500}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('My Requests')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {myRequests.length}
                                </span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {myRequests.map((wo) => (
                                    <Card
                                        key={wo.id}
                                        className="cursor-pointer shadow-elevation-1 transition-all hover:shadow-elevation-2"
                                        onClick={() => router.get(`/work-orders/${wo.id}`)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {wo.title}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                        {wo.description}
                                                    </p>
                                                </div>
                                                <Badge variant={woPriorityVariant[wo.priority] ?? 'outline'}>
                                                    {wo.priority}
                                                </Badge>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between">
                                                <Badge variant="outline" className="text-[0.6rem]">
                                                    {wo.status}
                                                </Badge>
                                                <span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground">
                                                    {new Date(wo.created_at).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </FadeIn>
                )}
            </div>
        </AppLayout>
    );
}

/* ── Maintenance Request Dialog (Feature 3) ───────────────────── */

function MaintenanceRequestDialog({ siteId }: { siteId: number }) {
    const { t } = useLang();
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        title: 'Maintenance Request',
        type: 'maintenance' as const,
        description: '',
        priority: 'medium',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(`/sites/${siteId}/work-orders`, {
            onSuccess: () => {
                reset();
                setOpen(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Wrench className="mr-1.5 h-3.5 w-3.5" />
                    {t('Request Maintenance')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('Request Maintenance')}</DialogTitle>
                        <DialogDescription>
                            {t('Submit a maintenance request for this site. The operations team will be notified.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label className="text-xs">{t('Description')}</Label>
                            <Textarea
                                placeholder={t('Describe what needs attention...')}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={4}
                            />
                            {errors.description && (
                                <p className="text-xs text-destructive">{errors.description}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs">{t('Priority')}</Label>
                            <Select
                                value={data.priority}
                                onValueChange={(v) => setData('priority', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">{t('Low')}</SelectItem>
                                    <SelectItem value="medium">{t('Medium')}</SelectItem>
                                    <SelectItem value="high">{t('High')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Wrench className="mr-1.5 h-3.5 w-3.5" />
                            {t('Submit Request')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* ── Post-Onboarding Checklist (Feature 4) ────────────────────── */

function OnboardingChecklistCard({
    checklist,
    onDismiss,
}: {
    checklist: OnboardingChecklist;
    onDismiss: () => void;
}) {
    const { t } = useLang();

    const items = [
        { key: 'gateway_registered', label: t('Gateway registered'), done: checklist.gateway_registered },
        { key: 'devices_provisioned', label: t('Devices provisioned'), done: checklist.devices_provisioned },
        { key: 'modules_activated', label: t('Modules activated'), done: checklist.modules_activated },
        { key: 'escalation_chain_configured', label: t('Escalation chain configured'), done: checklist.escalation_chain_configured },
        { key: 'report_schedule_configured', label: t('Report schedule configured'), done: checklist.report_schedule_configured },
    ];

    const completedCount = items.filter((i) => i.done).length;
    const totalCount = items.length;
    const completionPct = Math.round((completedCount / totalCount) * 100);

    // Don't show if all items are complete
    if (completedCount === totalCount) return null;

    return (
        <Card className="shadow-elevation-1">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Setup Checklist')}
                        </p>
                        <CardTitle className="mt-1 text-base">
                            {t('Complete your site setup')}
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold tabular-nums">
                            {completionPct}%
                        </span>
                        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-7 w-7 p-0">
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <Progress
                    value={completionPct}
                    size="sm"
                    variant={completionPct >= 80 ? 'success' : completionPct >= 40 ? 'warning' : 'default'}
                />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <div
                            key={item.key}
                            className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                                item.done
                                    ? 'border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/10'
                                    : 'border-border bg-muted/30'
                            }`}
                        >
                            {item.done ? (
                                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                            ) : (
                                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                            )}
                            <span className={item.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Zone Card ─────────────────────────────────────────────────── */

function ZoneCard({ zone, siteId }: { zone: ZoneSummary; siteId: number }) {
    const { t } = useLang();
    const tempSummary = zone.summary?.find((s) => s.metric === 'temperature');
    const onlinePct =
        zone.device_count > 0
            ? Math.round((zone.online_count / zone.device_count) * 100)
            : 0;

    return (
        <Card
            className="cursor-pointer shadow-elevation-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2"
            onClick={() =>
                router.get(
                    `/sites/${siteId}/zones/${encodeURIComponent(zone.name)}`,
                )
            }
        >
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                        {zone.name}
                    </CardTitle>
                    <Badge
                        variant="outline"
                        className="font-mono text-xs tabular-nums"
                    >
                        {zone.online_count}/{zone.device_count}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {tempSummary && (
                    <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-blue-500" />
                        <div className="flex-1">
                            <div className="flex items-baseline gap-1">
                                <span className="font-mono text-lg font-bold tabular-nums">
                                    {tempSummary.current?.toFixed(1) ?? '—'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    °C
                                </span>
                            </div>
                            <p className="font-mono text-xs tabular-nums text-muted-foreground">
                                {t('Min')}{' '}
                                {tempSummary.min?.toFixed(1) ?? '—'} ·{' '}
                                {t('Max')}{' '}
                                {tempSummary.max?.toFixed(1) ?? '—'}
                            </p>
                        </div>
                    </div>
                )}
                <Progress
                    value={onlinePct}
                    size="sm"
                    variant={onlinePct === 100 ? 'success' : 'warning'}
                />
                <div className="flex items-center justify-end text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {t('View zone')}{' '}
                    <ChevronRight className="ml-0.5 h-3 w-3" />
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Alert Card ────────────────────────────────────────────────── */

const severityStyles: Record<
    string,
    { border: string; bg: string; dot: string }
> = {
    critical: {
        border: 'border-red-200/60 dark:border-red-800/40',
        bg: 'bg-red-50/50 dark:bg-red-950/10',
        dot: 'bg-red-500 animate-pulse',
    },
    high: {
        border: 'border-orange-200/60 dark:border-orange-800/40',
        bg: 'bg-orange-50/50 dark:bg-orange-950/10',
        dot: 'bg-orange-500',
    },
    medium: {
        border: 'border-amber-200/60 dark:border-amber-800/40',
        bg: 'bg-amber-50/50 dark:bg-amber-950/10',
        dot: 'bg-amber-400',
    },
    low: {
        border: 'border-border',
        bg: '',
        dot: 'bg-blue-400',
    },
};

function AlertCard({ alert }: { alert: Alert }) {
    const s = severityStyles[alert.severity] ?? severityStyles.low;

    return (
        <Card
            className={`cursor-pointer border ${s.border} ${s.bg} shadow-elevation-1 transition-all hover:shadow-elevation-2`}
            onClick={() => router.get(`/alerts/${alert.id}`)}
        >
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                            {alert.data?.rule_name ?? `Alert #${alert.id}`}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {alert.data?.device_name}
                            {alert.data?.zone && ` · ${alert.data.zone}`}
                        </p>
                    </div>
                    <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`}
                    />
                </div>
                {alert.data?.metric && (
                    <p className="mt-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                        {alert.data.metric}: {alert.data.value}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

/* ── Skeleton ──────────────────────────────────────────────────── */

export function SiteShowSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-48" />
                <Skeleton className="mt-2 h-4 w-64" />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="mt-2 h-8 w-12" />
                            </div>
                            <Skeleton className="h-10 w-10 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Health gauge */}
            <div className="rounded-xl border p-6">
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-1 w-full rounded-full" />
                    </div>
                </div>
            </div>

            {/* Zones + Alerts */}
            <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_340px]">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-12" />
                        <div className="h-px flex-1 bg-border" />
                        <Skeleton className="h-3 w-4" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-5 w-12 rounded-md" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-4" />
                                        <div className="flex-1 space-y-1">
                                            <Skeleton className="h-5 w-16" />
                                            <Skeleton className="h-3 w-28" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-1 w-full rounded-full" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-24" />
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="space-y-2 p-3">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                    <Skeleton className="h-2.5 w-2.5 rounded-full" />
                                </div>
                                <Skeleton className="h-3 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
