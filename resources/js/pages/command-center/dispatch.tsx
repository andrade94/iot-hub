import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Filter, MapPin, Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        L: any;
    }
}

interface DispatchSite {
    id: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
    open_work_orders: number;
}

interface DispatchWorkOrder {
    id: number;
    title: string;
    priority: string;
    site_id: number;
    assigned_to: number | null;
    type: string;
    site?: { name: string };
}

interface Props {
    sites: DispatchSite[];
    workOrders: DispatchWorkOrder[];
    technicians: { id: number; name: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Command Center', href: '/command-center' },
    { title: 'Dispatch', href: '/command-center/dispatch' },
];

const PRIORITY_VARIANTS: Record<string, 'destructive' | 'warning' | 'outline' | 'secondary'> = {
    urgent: 'destructive',
    high: 'warning',
    medium: 'outline',
    low: 'secondary',
};

export default function CommandCenterDispatch({ sites, workOrders, technicians }: Props) {
    const { t } = useLang();
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
    const woListRef = useRef<HTMLDivElement>(null);
    const woRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    const displayedOrders = showUnassignedOnly
        ? workOrders.filter((wo) => wo.assigned_to === null)
        : workOrders;

    const unassignedCount = workOrders.filter((wo) => wo.assigned_to === null).length;

    function handleAssign(workOrderId: number, techId: string) {
        router.post(
            `/work-orders/${workOrderId}/status`,
            { assigned_to: Number(techId) },
            { preserveScroll: true },
        );
    }

    function scrollToWorkOrder(siteId: number) {
        const firstMatch = displayedOrders.find((wo) => wo.site_id === siteId);
        if (!firstMatch) return;
        const element = woRefs.current.get(firstMatch.id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Field Dispatch')} />
            <div className="flex h-full flex-1 flex-col overflow-hidden">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden border-b border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-center justify-between p-4 md:px-6 md:py-5">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Field Dispatch')}
                                </p>
                                <h1 className="font-display mt-1 text-xl font-bold tracking-tight md:text-2xl">
                                    {t('Work Order Map')}
                                </h1>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                        {workOrders.length}
                                    </span>{' '}
                                    {t('order(s)')}{' '}
                                    {unassignedCount > 0 && (
                                        <>
                                            &middot;{' '}
                                            <span className="font-mono font-medium tabular-nums text-amber-600 dark:text-amber-400">
                                                {unassignedCount}
                                            </span>{' '}
                                            {t('unassigned')}
                                        </>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="gap-1.5">
                                    <MapPin className="h-3 w-3" />
                                    <span className="font-mono tabular-nums">{sites.length}</span> {t('sites')}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Split panel ─────────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left panel -- work order list */}
                    <FadeIn direction="left" delay={100} duration={400} className="flex w-[380px] shrink-0 flex-col overflow-hidden border-r">
                        <Card className="flex flex-1 flex-col overflow-hidden rounded-none border-0 shadow-elevation-1">
                            {/* Panel header */}
                            <div className="sticky top-0 z-10 border-b bg-background p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {t('Work Orders')}
                                            </h2>
                                            <div className="h-px flex-1 bg-border" />
                                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                                {displayedOrders.length}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant={showUnassignedOnly ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                                    >
                                        <Filter className="mr-2 h-3.5 w-3.5" />
                                        {t('Unassigned')}
                                    </Button>
                                </div>
                            </div>

                            {/* Scrollable list */}
                            <div ref={woListRef} className="flex-1 overflow-y-auto">
                                <div className="space-y-2 p-4">
                                    {displayedOrders.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <Truck className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {t('No work orders found')}
                                            </p>
                                        </div>
                                    ) : (
                                        displayedOrders.map((wo, index) => (
                                            <FadeIn key={wo.id} delay={50 + index * 30} duration={300} direction="up">
                                                <div
                                                    ref={(el) => {
                                                        if (el) woRefs.current.set(wo.id, el);
                                                    }}
                                                    className={`rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 ${
                                                        wo.assigned_to === null
                                                            ? 'border-l-4 border-l-amber-400'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="mb-2 flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    variant={PRIORITY_VARIANTS[wo.priority] ?? 'outline'}
                                                                    className="text-xs"
                                                                >
                                                                    {wo.priority}
                                                                </Badge>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {wo.type.replace(/_/g, ' ')}
                                                                </Badge>
                                                                <span className="ml-auto font-mono text-[0.65rem] tabular-nums text-muted-foreground">
                                                                    #{wo.id}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-sm font-medium">{wo.title}</p>
                                                            {wo.site && (
                                                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <MapPin className="h-3 w-3" />
                                                                    {wo.site.name}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Select
                                                        value={wo.assigned_to?.toString() ?? ''}
                                                        onValueChange={(v) => handleAssign(wo.id, v)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder={t('Assign technician...')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {technicians.map((tech) => (
                                                                <SelectItem key={tech.id} value={tech.id.toString()}>
                                                                    {tech.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </FadeIn>
                                        ))
                                    )}
                                </div>
                            </div>
                        </Card>
                    </FadeIn>

                    {/* Right panel -- map */}
                    <FadeIn direction="right" delay={200} duration={400} className="flex-1">
                        <DispatchMap sites={sites} onSiteClick={scrollToWorkOrder} />
                    </FadeIn>
                </div>
            </div>
        </AppLayout>
    );
}

function DispatchMap({ sites, onSiteClick }: { sites: DispatchSite[]; onSiteClick: (siteId: number) => void }) {
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

            const color = site.open_work_orders > 0 ? '#ef4444' : '#71717a';

            const icon = window.L.divIcon({
                className: '',
                html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            });

            const marker = window.L.marker([site.latitude, site.longitude], { icon })
                .addTo(map)
                .bindPopup(`<b>${site.name}</b><br>${site.open_work_orders} open WO(s)`)
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

    return <div ref={mapRef} className="h-full w-full" />;
}
