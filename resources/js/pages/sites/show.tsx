import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, BreadcrumbItem, Device, FloorPlan, Site, SiteKPIs, ZoneSummary } from '@/types';
import FloorPlanView from '@/components/FloorPlanView';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    BatteryLow,
    Cpu,
    MapPin,
    Radio,
    Signal,
    Thermometer,
    WifiOff,
} from 'lucide-react';

interface Props {
    site: Site;
    kpis: SiteKPIs;
    zones: ZoneSummary[];
    activeAlerts: Alert[];
    floorPlans?: (FloorPlan & { devices: Device[] })[];
}

export default function SiteShow({ site, kpis, zones, activeAlerts, floorPlans }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: site.name, href: '#' },
    ];

    const healthPct = kpis.total_devices > 0
        ? Math.round((kpis.online_count / kpis.total_devices) * 100)
        : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={site.name} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{site.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            {t('Site overview and zone health')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={`/sites/${site.id}/reports/summary`}>
                                {t('Summary')}
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={`/sites/${site.id}/reports/temperature`}>
                                {t('Temp Report')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <KPICard
                        icon={<Cpu className="h-4 w-4" />}
                        label={t('Devices')}
                        value={kpis.total_devices}
                    />
                    <KPICard
                        icon={<Signal className="h-4 w-4 text-emerald-500" />}
                        label={t('Online')}
                        value={kpis.online_count}
                        accent="emerald"
                    />
                    <KPICard
                        icon={<WifiOff className="h-4 w-4 text-red-500" />}
                        label={t('Offline')}
                        value={kpis.offline_count}
                        accent={kpis.offline_count > 0 ? 'red' : undefined}
                    />
                    <KPICard
                        icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                        label={t('Active Alerts')}
                        value={kpis.active_alerts}
                        accent={kpis.active_alerts > 0 ? 'amber' : undefined}
                    />
                    <KPICard
                        icon={<BatteryLow className="h-4 w-4 text-orange-500" />}
                        label={t('Low Battery')}
                        value={kpis.low_battery_count}
                        accent={kpis.low_battery_count > 0 ? 'orange' : undefined}
                    />
                </div>

                {/* Health bar */}
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex-1">
                            <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t('Fleet Health')}</span>
                                <span className="font-bold tabular-nums">{healthPct}%</span>
                            </div>
                            <Progress
                                value={healthPct}
                                size="md"
                                variant={healthPct > 80 ? 'success' : healthPct > 50 ? 'warning' : 'destructive'}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {kpis.online_count}/{kpis.total_devices} {t('online')}
                        </div>
                    </CardContent>
                </Card>

                {/* Floor Plans */}
                {floorPlans && floorPlans.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold">{t('Floor Plans')}</h2>
                        {floorPlans.map((fp) => (
                            <Card key={fp.id}>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        {fp.name} {fp.floor_number != null && `— Floor ${fp.floor_number}`}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <FloorPlanView floorPlan={fp} devices={fp.devices ?? []} />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_320px]">
                    {/* Zones grid */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">{t('Zones')}</h2>
                        {zones.length === 0 ? (
                            <Card>
                                <CardContent className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <MapPin className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {t('No zones configured')}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {zones.map((zone) => (
                                    <ZoneCard
                                        key={zone.name}
                                        zone={zone}
                                        siteId={site.id}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active Alerts sidebar */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            {t('Active Alerts')}
                            {activeAlerts.length > 0 && (
                                <Badge variant="destructive" className="ml-2">
                                    {activeAlerts.length}
                                </Badge>
                            )}
                        </h2>
                        {activeAlerts.length === 0 ? (
                            <Card>
                                <CardContent className="flex items-center justify-center py-8">
                                    <div className="text-center">
                                        <Signal className="mx-auto h-6 w-6 text-emerald-400" />
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {t('All clear')}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {activeAlerts.map((alert) => (
                                    <Card
                                        key={alert.id}
                                        className="cursor-pointer transition-colors hover:bg-muted/50"
                                        onClick={() => router.get(`/alerts/${alert.id}`)}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {alert.data?.rule_name ?? `Alert #${alert.id}`}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {alert.data?.device_name}
                                                        {alert.data?.zone && ` · ${alert.data.zone}`}
                                                    </p>
                                                </div>
                                                <SeverityDot severity={alert.severity} />
                                            </div>
                                            {alert.data?.metric && (
                                                <p className="mt-1 font-mono text-xs text-muted-foreground">
                                                    {alert.data.metric}: {alert.data.value}
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                                <Button variant="ghost" size="sm" className="w-full" asChild>
                                    <Link href="/alerts">{t('View all alerts')}</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function KPICard({
    icon,
    label,
    value,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    accent?: string;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                {icon}
                <div>
                    <p className={`text-2xl font-bold tabular-nums ${accent ? `text-${accent}-600 dark:text-${accent}-400` : ''}`}>
                        {value}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function ZoneCard({ zone, siteId }: { zone: ZoneSummary; siteId: number }) {
    const { t } = useLang();
    const tempSummary = zone.summary?.find((s) => s.metric === 'temperature');
    const onlinePct = zone.device_count > 0 ? Math.round((zone.online_count / zone.device_count) * 100) : 0;

    return (
        <Card
            className="cursor-pointer transition-colors hover:bg-muted/30"
            onClick={() => router.get(`/sites/${siteId}/zones/${encodeURIComponent(zone.name)}`)}
        >
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{zone.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
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
                                <span className="text-lg font-bold tabular-nums">
                                    {tempSummary.current?.toFixed(1) ?? '—'}
                                </span>
                                <span className="text-xs text-muted-foreground">°C</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('Min')} {tempSummary.min?.toFixed(1)} · {t('Max')} {tempSummary.max?.toFixed(1)}
                            </p>
                        </div>
                    </div>
                )}
                <Progress value={onlinePct} size="sm" variant={onlinePct === 100 ? 'success' : 'warning'} />
            </CardContent>
        </Card>
    );
}

function SeverityDot({ severity }: { severity: string }) {
    const colors: Record<string, string> = {
        critical: 'bg-red-500 animate-pulse',
        high: 'bg-orange-500',
        medium: 'bg-amber-400',
        low: 'bg-blue-400',
    };
    return <span className={`h-2.5 w-2.5 rounded-full ${colors[severity] ?? 'bg-zinc-400'}`} />;
}
