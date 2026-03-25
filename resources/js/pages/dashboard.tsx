import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { CircularProgress, Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BatteryLow,
    ChevronRight,
    Clock,
    Cpu,
    LayoutGrid,
    Map,
    MapPin,
    Signal,
    Wrench,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        L: any;
    }
}

interface SiteStat {
    id: number;
    name: string;
    status: 'active' | 'inactive' | 'onboarding';
    device_count: number;
    online_count: number;
    latitude?: number | null;
    longitude?: number | null;
}

interface DashboardKPIs {
    total_devices: number;
    online_devices: number;
    active_alerts: number;
    open_work_orders: number;
}

interface ActionCards {
    unacknowledged_alerts: number;
    overdue_work_orders: number;
    critical_battery: number;
}

interface Props {
    kpis: DashboardKPIs;
    siteStats: SiteStat[];
    actionCards: ActionCards;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

const statusBadgeVariant: Record<string, 'outline-success' | 'outline-warning' | 'outline'> = {
    active: 'outline-success',
    onboarding: 'outline-warning',
    inactive: 'outline',
};

export default function Dashboard({ kpis, siteStats, actionCards }: Props) {
    const { t } = useLang();
    const { current_organization, auth } = usePage<SharedData>().props;
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const roles = auth?.roles ?? [];
    const isViewerOnly = roles.includes('client_site_viewer') && roles.length === 1;
    const isTechnician = roles.includes('technician') && !roles.includes('client_site_manager') && !roles.includes('client_org_admin') && !roles.includes('super_admin');
    // BR-100: site_viewer sees alerts only; technician sees alerts+WOs; site_manager+ sees all three
    const showWOCard = !isViewerOnly;
    const showBatteryCard = !isViewerOnly && !isTechnician;

    const healthPct =
        kpis.total_devices > 0 ? Math.round((kpis.online_devices / kpis.total_devices) * 100) : 0;

    const hasActions =
        actionCards.unacknowledged_alerts > 0 ||
        (showWOCard && actionCards.overdue_work_orders > 0) ||
        (showBatteryCard && actionCards.critical_battery > 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Dashboard')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Command Center')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {current_organization?.name ?? t('Dashboard')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {siteStats.length > 0 ? (
                                        <>
                                            <span className="font-mono font-medium text-foreground">
                                                {siteStats.length}
                                            </span>{' '}
                                            {t('sites accessible')}
                                        </>
                                    ) : (
                                        t('No sites configured yet')
                                    )}
                                </p>
                            </div>
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
                        </div>
                    </div>
                </FadeIn>

                {/* ── KPI Row ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {(
                        [
                            {
                                title: t('Total Devices'),
                                value: kpis.total_devices,
                                icon: <Cpu className="h-5 w-5" />,
                            },
                            {
                                title: t('Online'),
                                value: kpis.online_devices,
                                icon: <Signal className="h-5 w-5" />,
                                description:
                                    kpis.total_devices > 0
                                        ? `${healthPct}% ${t('of fleet')}`
                                        : undefined,
                            },
                            {
                                title: t('Active Alerts'),
                                value: kpis.active_alerts,
                                icon: <AlertTriangle className="h-5 w-5" />,
                                className:
                                    kpis.active_alerts > 0
                                        ? 'border-red-200/50 dark:border-red-900/30'
                                        : undefined,
                            },
                            {
                                title: t('Open Work Orders'),
                                value: kpis.open_work_orders,
                                icon: <Wrench className="h-5 w-5" />,
                                className:
                                    kpis.open_work_orders > 0
                                        ? 'border-amber-200/50 dark:border-amber-900/30'
                                        : undefined,
                            },
                        ] as const
                    ).map((card, i) => (
                        <FadeIn key={card.title} delay={i * 75} duration={400}>
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

                {/* ── Fleet Health + Needs Attention ───────────────── */}
                {(kpis.total_devices > 0 || hasActions) && (
                    <div
                        className={`grid gap-4 ${hasActions && kpis.total_devices > 0 ? 'lg:grid-cols-5' : ''}`}
                    >
                        {kpis.total_devices > 0 && (
                            <FadeIn
                                delay={100}
                                duration={500}
                                className={hasActions ? 'lg:col-span-2' : ''}
                            >
                                <Card className="h-full shadow-elevation-1">
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
                                                    {t('Fleet Health')}
                                                </p>
                                                <p className="mt-1 text-lg font-semibold">
                                                    <span className="font-mono tabular-nums">
                                                        {kpis.online_devices}
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

                        {hasActions && (
                            <FadeIn
                                delay={200}
                                duration={500}
                                className={kpis.total_devices > 0 ? 'lg:col-span-3' : ''}
                            >
                                <Card className="h-full border-amber-200/30 shadow-elevation-1 dark:border-amber-900/20">
                                    <CardContent className="p-6">
                                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {t('Needs Attention')}
                                        </p>
                                        <div className="mt-4 space-y-2.5">
                                            {actionCards.unacknowledged_alerts > 0 && (
                                                <ActionItem
                                                    icon={
                                                        <AlertTriangle className="h-4 w-4" />
                                                    }
                                                    color="red"
                                                    count={actionCards.unacknowledged_alerts}
                                                    label={t('alerts need acknowledgment')}
                                                    onClick={() =>
                                                        router.get('/alerts?status=active')
                                                    }
                                                    pulse
                                                />
                                            )}
                                            {showWOCard && actionCards.overdue_work_orders > 0 && (
                                                <ActionItem
                                                    icon={<Clock className="h-4 w-4" />}
                                                    color="amber"
                                                    count={actionCards.overdue_work_orders}
                                                    label={t('work orders overdue')}
                                                    onClick={() =>
                                                        router.get(
                                                            '/work-orders?status=overdue',
                                                        )
                                                    }
                                                />
                                            )}
                                            {showBatteryCard && actionCards.critical_battery > 0 && (
                                                <ActionItem
                                                    icon={<BatteryLow className="h-4 w-4" />}
                                                    color="amber"
                                                    count={actionCards.critical_battery}
                                                    label={t('sensors battery critical')}
                                                    onClick={() =>
                                                        router.get(
                                                            '/settings/devices?battery=critical',
                                                        )
                                                    }
                                                />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}
                    </div>
                )}

                {/* ── Sites ───────────────────────────────────────── */}
                {siteStats.length > 0 ? (
                    <>
                        <div className="flex items-center gap-3">
                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Sites')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
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
                                <SiteMap
                                    sites={siteStats}
                                    onSiteClick={(id) => router.get(`/sites/${id}`)}
                                />
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
                                <Button
                                    variant="outline"
                                    onClick={() => router.get('/settings/sites')}
                                >
                                    {t('Go to Sites')}
                                </Button>
                            }
                        />
                    </FadeIn>
                )}
            </div>
        </AppLayout>
    );
}

/* ── Action Item ────────────────────────────────────────────────── */

const actionColors = {
    red: {
        bg: 'bg-red-50/80 dark:bg-red-950/20',
        border: 'border-red-200/60 dark:border-red-800/40',
        icon: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
    },
    amber: {
        bg: 'bg-amber-50/80 dark:bg-amber-950/20',
        border: 'border-amber-200/60 dark:border-amber-800/40',
        icon: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
};

function ActionItem({
    icon,
    color,
    count,
    label,
    onClick,
    pulse,
}: {
    icon: React.ReactNode;
    color: 'red' | 'amber';
    count: number;
    label: string;
    onClick: () => void;
    pulse?: boolean;
}) {
    const c = actionColors[color];
    return (
        <button
            type="button"
            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border ${c.border} ${c.bg} p-3 text-left transition-all hover:shadow-sm`}
            onClick={onClick}
        >
            {pulse && (
                <span className="relative flex h-2 w-2 shrink-0">
                    <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full ${c.dot} opacity-75`}
                    />
                    <span
                        className={`relative inline-flex h-2 w-2 rounded-full ${c.dot}`}
                    />
                </span>
            )}
            <span className={c.icon}>{icon}</span>
            <p className="flex-1 text-sm font-medium">
                <span className="font-mono tabular-nums">{count}</span> {label}
            </p>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
    );
}

/* ── Site Card ──────────────────────────────────────────────────── */

function SiteCard({ site, t }: { site: SiteStat; t: (key: string) => string }) {
    const sitePct =
        site.device_count > 0
            ? Math.round((site.online_count / site.device_count) * 100)
            : 0;

    return (
        <div
            className="group cursor-pointer rounded-xl border border-border/50 bg-card p-5 shadow-elevation-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2"
            onClick={() => router.get(`/sites/${site.id}`)}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold leading-tight">{site.name}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            <span className="font-mono tabular-nums">{site.device_count}</span>{' '}
                            {t('device(s)')}
                        </p>
                    </div>
                </div>
                <Badge variant={statusBadgeVariant[site.status] ?? 'outline'}>
                    {site.status}
                </Badge>
            </div>
            <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('online')}</span>
                    <span className="font-mono font-semibold tabular-nums">
                        {site.online_count}/{site.device_count}
                        {site.device_count > 0 && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                ({sitePct}%)
                            </span>
                        )}
                    </span>
                </div>
                {site.device_count > 0 && (
                    <Progress
                        value={sitePct}
                        size="sm"
                        variant={
                            sitePct > 80
                                ? 'success'
                                : sitePct > 50
                                  ? 'warning'
                                  : 'destructive'
                        }
                    />
                )}
            </div>
            <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {t('View site')} <ChevronRight className="ml-0.5 h-3 w-3" />
            </div>
        </div>
    );
}

/* ── Dashboard Skeleton ─────────────────────────────────────────── */

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-56" />
                <Skeleton className="mt-2 h-4 w-36" />
            </div>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="mt-2 h-8 w-16" />
                            </div>
                            <Skeleton className="h-10 w-10 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
            {/* Health + Actions */}
            <div className="grid gap-4 lg:grid-cols-5">
                <div className="rounded-xl border p-6 lg:col-span-2">
                    <div className="flex items-center gap-6">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="flex-1 space-y-3">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-1 w-full rounded-full" />
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border p-6 lg:col-span-3">
                    <Skeleton className="h-3 w-28" />
                    <div className="mt-4 space-y-2.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
            {/* Sites divider */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-12" />
                <div className="h-px flex-1 bg-border" />
                <Skeleton className="h-3 w-4" />
            </div>
            {/* Sites */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                                <Skeleton className="h-8 w-8 rounded-lg" />
                                <div>
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="mt-1 h-3 w-16" />
                                </div>
                            </div>
                            <Skeleton className="h-5 w-14 rounded-md" />
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="flex justify-between">
                                <Skeleton className="h-3.5 w-12" />
                                <Skeleton className="h-3.5 w-16" />
                            </div>
                            <Skeleton className="h-1 w-full rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Site Map (Leaflet) ─────────────────────────────────────────── */

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
                .bindPopup(
                    `<b>${site.name}</b><br>${site.online_count}/${site.device_count} online`,
                )
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
