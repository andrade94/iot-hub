import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    MapPin,
    Plus,
    Radio,
    Wrench,
} from 'lucide-react';

interface ZoneReading {
    site_id: number;
    site_name: string | null;
    zone: string;
    device_count: number;
    temperature: number | null;
    humidity: number | null;
    last_reading_at: string | null;
    last_reading_ago: string | null;
    active_alerts: number;
    low_battery_device: { name: string; battery_pct: number } | null;
}

interface RecentAlert {
    id: number;
    severity: string;
    status: string;
    rule_name: string;
    device_name: string | null;
    zone: string | null;
    site_name: string | null;
    triggered_ago: string;
}

interface MaintenanceWindow {
    id: number;
    title: string;
    start_time: string;
    duration_minutes: number;
    suppress_alerts: boolean;
}

interface Props {
    kpis: {
        total_devices: number;
        online_devices: number;
        active_alerts: number;
        open_work_orders: number;
    };
    gatewayStats: { total: number; online: number };
    zoneReadings: ZoneReading[];
    siteStats: Array<{ id: number; name: string; active_alerts: number }>;
    recentAlerts: RecentAlert[];
    maintenanceUpcoming: MaintenanceWindow[];
}

export function SiteCommandCenter({
    kpis,
    gatewayStats,
    zoneReadings,
    siteStats,
    recentAlerts,
    maintenanceUpcoming,
}: Props) {
    const { t } = useLang();
    const { auth, current_organization } = usePage<SharedData>().props;
    const userName = auth.user?.name?.split(' ')[0] ?? '';

    // Group zones by site
    const siteIds = [...new Set(zoneReadings.map((z) => z.site_id))];
    const activeSiteId = siteIds[0]; // Default to first site
    const siteZones = zoneReadings.filter((z) => z.site_id === activeSiteId);
    const activeSiteName = siteZones[0]?.site_name ?? siteStats[0]?.name ?? '—';

    const excursionFree = kpis.active_alerts === 0;

    return (
        <div className="flex flex-col gap-5">
            {/* Hero */}
            <FadeIn direction="down" duration={400}>
                <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                    <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                    <div className="relative flex items-start justify-between gap-4 p-6 md:p-8">
                        <div>
                            <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Good morning')}, {userName}
                            </p>
                            <h1 className="font-display mt-1.5 text-[1.75rem] font-bold tracking-tight md:text-[2rem]">
                                {activeSiteName}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                <strong>{siteZones.length} {t('zones')}</strong> · {kpis.total_devices} {t('devices')} ·{' '}
                                {excursionFree ? (
                                    <span className="text-emerald-500">{t('all clear')}</span>
                                ) : (
                                    <span className="text-rose-500">{kpis.active_alerts} {t('active alerts')}</span>
                                )}
                            </p>
                        </div>
                        <span className={cn(
                            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold',
                            gatewayStats.online > 0
                                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500'
                                : 'border-rose-500/25 bg-rose-500/10 text-rose-500',
                        )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', gatewayStats.online > 0 ? 'bg-emerald-500' : 'bg-rose-500')} />
                            {gatewayStats.online > 0 ? t('Online') : t('Offline')}
                        </span>
                    </div>
                </div>
            </FadeIn>

            {/* Site tabs (when multi-site) */}
            {siteIds.length > 1 && (
                <FadeIn delay={30} duration={300}>
                    <div className="inline-flex gap-0.5 rounded-lg border border-border bg-muted/30 p-1">
                        {siteStats.filter(s => siteIds.includes(s.id)).map((site) => (
                            <button
                                key={site.id}
                                type="button"
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-colors',
                                    site.id === activeSiteId
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <span className={cn('h-1.5 w-1.5 rounded-full', site.active_alerts > 0 ? 'bg-amber-500' : 'bg-emerald-500')} />
                                {site.name}
                                {site.active_alerts > 0 && (
                                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber-500">
                                        {site.active_alerts}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </FadeIn>
            )}

            {/* KPI bar */}
            <FadeIn delay={60} duration={400}>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
                    <KpiCell label={t('Devices online')} value={`${kpis.online_devices}/${kpis.total_devices}`} tone={kpis.online_devices === kpis.total_devices ? 'emerald' : 'amber'} />
                    <KpiCell label={t('Active Alerts')} value={String(kpis.active_alerts)} tone={kpis.active_alerts === 0 ? 'default' : 'coral'} />
                    <KpiCell label={t('Open WOs')} value={String(kpis.open_work_orders)} tone={kpis.open_work_orders > 0 ? 'amber' : 'default'} />
                    <KpiCell label={t('Compliance')} value={excursionFree ? '100%' : '—'} tone="emerald" />
                    <KpiCell label={t('Gateway')} value={gatewayStats.online > 0 ? '●' : '○'} tone={gatewayStats.online > 0 ? 'emerald' : 'coral'} subtitle={`${gatewayStats.online}/${gatewayStats.total}`} />
                </div>
            </FadeIn>

            {/* Zone grid */}
            <FadeIn delay={120} duration={400}>
                <Card className="shadow-elevation-1">
                    <CardContent className="p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="font-display text-base font-semibold">{t('Zones')}</p>
                                <p className="text-xs text-muted-foreground">{t('Real-time readings per zone')}</p>
                            </div>
                            <Link href={`/sites/${activeSiteId}`} className="font-mono text-[10px] text-primary hover:text-primary/80">
                                {t('VIEW SITE')} →
                            </Link>
                        </div>
                        {siteZones.length === 0 ? (
                            <EmptyState
                                icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                                title={t('No zones configured')}
                                description={t('Add devices with zones to see readings here.')}
                                size="sm"
                            />
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {siteZones.map((zone) => (
                                    <ZoneCard key={`${zone.site_id}-${zone.zone}`} zone={zone} t={t} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </FadeIn>

            {/* Alerts + WOs row */}
            <div className="grid gap-5 lg:grid-cols-2">
                <FadeIn delay={180} duration={400}>
                    <Card className="h-full shadow-elevation-1">
                        <CardContent className="p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <p className="font-display text-base font-semibold">{t('Recent alerts')}</p>
                                <Link href="/alerts" className="font-mono text-[10px] text-primary hover:text-primary/80">{t('VIEW ALL')} →</Link>
                            </div>
                            {recentAlerts.length === 0 ? (
                                <div className="py-6 text-center">
                                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <p className="text-sm font-medium">{t('all clear')}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{t('No alerts in the last 24 hours')}</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {recentAlerts.slice(0, 4).map((alert) => (
                                        <Link
                                            key={alert.id}
                                            href={`/alerts/${alert.id}`}
                                            className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs transition-colors hover:bg-muted/30"
                                        >
                                            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full',
                                                alert.severity === 'critical' && 'bg-rose-500',
                                                alert.severity === 'high' && 'bg-amber-500',
                                                alert.severity === 'medium' && 'bg-cyan-500',
                                                alert.severity === 'low' && 'bg-muted-foreground',
                                            )} />
                                            <span className="flex-1 truncate text-muted-foreground">{alert.rule_name}</span>
                                            <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60">{alert.triggered_ago}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>

                <FadeIn delay={220} duration={400}>
                    <Card className="h-full shadow-elevation-1">
                        <CardContent className="p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <p className="font-display text-base font-semibold">{t('Work orders')}</p>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-[10px]" onClick={() => router.get(`/sites/${activeSiteId}`)}>
                                        <Plus className="h-3 w-3" />
                                        {t('Create WO')}
                                    </Button>
                                    <Link href="/work-orders" className="font-mono text-[10px] text-primary hover:text-primary/80">{t('VIEW ALL')} →</Link>
                                </div>
                            </div>
                            {kpis.open_work_orders === 0 ? (
                                <p className="py-6 text-center text-xs text-muted-foreground">{t('No open work orders')}</p>
                            ) : (
                                <p className="text-center text-xs text-muted-foreground">
                                    {kpis.open_work_orders} {t('open work orders')} —{' '}
                                    <Link href="/work-orders" className="text-primary hover:underline">{t('view all')}</Link>
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>

            {/* Maintenance windows */}
            {maintenanceUpcoming.length > 0 && (
                <FadeIn delay={260} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-5">
                            <p className="mb-3 font-display text-base font-semibold">{t('Maintenance today')}</p>
                            <div className="flex flex-wrap gap-2">
                                {maintenanceUpcoming.map((mw) => (
                                    <div key={mw.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
                                        <Clock className="h-3 w-3 text-amber-500" />
                                        <span>{mw.title}</span>
                                        <span className="font-mono text-[10px] font-semibold text-amber-500">{mw.start_time}</span>
                                        {mw.suppress_alerts && <span className="font-mono text-[9px] text-muted-foreground">{t('suppresses alerts')}</span>}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}
        </div>
    );
}

function KpiCell({ label, value, tone = 'default', subtitle }: { label: string; value: string; tone?: 'emerald' | 'coral' | 'amber' | 'default'; subtitle?: string }) {
    const valueClass = { emerald: 'text-emerald-500', coral: 'text-rose-500', amber: 'text-amber-500', default: 'text-foreground' }[tone];
    return (
        <div className="bg-card px-4 py-3">
            <p className="font-mono text-[8px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
            <p className={cn('mt-1 font-display text-xl font-bold tabular-nums', valueClass)}>{value}</p>
            {subtitle && <p className="font-mono text-[9px] text-muted-foreground">{subtitle}</p>}
        </div>
    );
}

function ZoneCard({ zone, t }: { zone: ZoneReading; t: (k: string) => string }) {
    const hasAlert = zone.active_alerts > 0;
    const tone = hasAlert ? 'alert' : 'ok';
    const borderClass = hasAlert
        ? "before:bg-rose-500"
        : "before:bg-emerald-500";

    return (
        <div className={cn(
            "relative overflow-hidden rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30",
            "before:absolute before:left-0 before:right-0 before:top-0 before:h-[2px] before:content-['']",
            borderClass,
        )}>
            <p className="text-[13px] font-semibold">{zone.zone}</p>
            <p className={cn(
                'font-display mt-2 text-2xl font-bold tabular-nums',
                hasAlert ? 'text-rose-500' : zone.temperature !== null ? 'text-emerald-500' : 'text-muted-foreground',
            )}>
                {zone.temperature !== null ? `${zone.temperature}°C` : '—'}
            </p>
            <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-muted-foreground">
                <span>{zone.humidity !== null ? `${zone.humidity}% HR` : ''}</span>
                <span className={hasAlert ? 'font-semibold text-rose-500' : 'text-emerald-500'}>
                    {hasAlert ? `⚠ ${zone.active_alerts} ${t('alert')}` : `✓ OK`}
                    {zone.last_reading_ago && ` · ${zone.last_reading_ago}`}
                </span>
            </div>
            <div className="mt-2 font-mono text-[9px] text-muted-foreground/60">
                {zone.device_count} {t('devices')}
                {zone.low_battery_device && (
                    <span className="ml-2 text-rose-500">
                        ⚠ {zone.low_battery_device.name} {zone.low_battery_device.battery_pct}%
                    </span>
                )}
            </div>
        </div>
    );
}
