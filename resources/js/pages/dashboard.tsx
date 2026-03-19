import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Cpu, LayoutGrid, Map, MapPin, Signal, Wrench } from 'lucide-react';
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

interface Props {
    kpis: DashboardKPIs;
    siteStats: SiteStat[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
];

const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    onboarding: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    inactive: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function Dashboard({ kpis, siteStats }: Props) {
    const { t } = useLang();
    const { current_organization } = usePage<SharedData>().props;
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

    const healthPct = kpis.total_devices > 0 ? Math.round((kpis.online_devices / kpis.total_devices) * 100) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Dashboard')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Welcome + View Toggle */}
                <div className="flex items-start justify-between rounded-xl border border-sidebar-border/70 bg-card p-6 dark:border-sidebar-border">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {t('Welcome')}
                            {current_organization ? ` — ${current_organization.name}` : ''}
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            {siteStats.length > 0
                                ? t(':count sites accessible', { count: siteStats.length })
                                : t('No sites configured yet')}
                        </p>
                    </div>
                    {siteStats.length > 0 && (
                        <div className="flex gap-2">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="mr-2 h-4 w-4" />
                                {t('Grid')}
                            </Button>
                            <Button
                                variant={viewMode === 'map' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('map')}
                            >
                                <Map className="mr-2 h-4 w-4" />
                                {t('Map')}
                            </Button>
                        </div>
                    )}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KPICard icon={<Cpu className="h-4 w-4" />} label={t('Total Devices')} value={kpis.total_devices} />
                    <KPICard icon={<Signal className="h-4 w-4 text-emerald-500" />} label={t('Online')} value={kpis.online_devices} accent="emerald" />
                    <KPICard
                        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                        label={t('Active Alerts')}
                        value={kpis.active_alerts}
                        accent={kpis.active_alerts > 0 ? 'red' : undefined}
                    />
                    <KPICard
                        icon={<Wrench className="h-4 w-4 text-amber-500" />}
                        label={t('Open Work Orders')}
                        value={kpis.open_work_orders}
                        accent={kpis.open_work_orders > 0 ? 'amber' : undefined}
                    />
                </div>

                {/* Fleet health bar */}
                {kpis.total_devices > 0 && (
                    <Card>
                        <CardContent className="flex items-center gap-4 p-4">
                            <Signal className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t('Fleet Health')}</span>
                                    <span className="font-bold tabular-nums">{healthPct}%</span>
                                </div>
                                <Progress
                                    value={healthPct}
                                    size="md"
                                    variant={healthPct > 80 ? 'success' : 'warning'}
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Sites: Grid or Map */}
                {siteStats.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {siteStats.map((site) => (
                                <SiteCard key={site.id} site={site} t={t} />
                            ))}
                        </div>
                    ) : (
                        <SiteMap sites={siteStats} onSiteClick={(id) => router.get(`/sites/${id}`)} />
                    )
                ) : (
                    <EmptyState
                        icon={<MapPin className="h-5 w-5 text-muted-foreground" />}
                        title={t('No sites yet')}
                        description={t('Create your first site to start monitoring devices and receiving alerts')}
                        action={
                            <Button variant="outline" onClick={() => router.get('/settings/sites')}>
                                {t('Go to Sites')}
                            </Button>
                        }
                    />
                )}
            </div>
        </AppLayout>
    );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                {icon}
                <div>
                    <p className={`text-2xl font-bold tabular-nums ${accent ? `text-${accent}-600 dark:text-${accent}-400` : ''}`}>{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function SiteCard({ site, t }: { site: SiteStat; t: (key: string) => string }) {
    const sitePct = site.device_count > 0
        ? Math.round((site.online_count / site.device_count) * 100)
        : 0;

    return (
        <div
            className="flex cursor-pointer flex-col gap-3 rounded-xl border border-sidebar-border/70 bg-card p-5 transition-colors hover:bg-muted/50 dark:border-sidebar-border"
            onClick={() => router.get(`/sites/${site.id}`)}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">{site.name}</h3>
                </div>
                <Badge
                    variant="secondary"
                    className={statusColors[site.status] ?? statusColors.inactive}
                >
                    {site.status}
                </Badge>
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        {site.device_count} {t('device(s)')}
                    </span>
                    <span className="font-medium tabular-nums">
                        {site.online_count} {t('online')}
                    </span>
                </div>
                {site.device_count > 0 && (
                    <Progress
                        value={sitePct}
                        size="sm"
                        variant={sitePct > 80 ? 'success' : sitePct > 50 ? 'warning' : 'destructive'}
                    />
                )}
            </div>
        </div>
    );
}

function SiteMap({ sites, onSiteClick }: { sites: SiteStat[]; onSiteClick: (id: number) => void }) {
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
