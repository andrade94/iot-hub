import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device, FloorPlan, Site } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Cpu,
    GripVertical,
    Layers,
    MapPin,
    Trash2,
    Upload,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface Props {
    site: Site;
    floorPlans: (FloorPlan & { devices: Device[] })[];
    unplacedDevices: Device[];
}

export default function FloorPlans({ site, floorPlans, unplacedDevices }: Props) {
    const { t } = useLang();
    const [activeFloor, setActiveFloor] = useState<number | null>(
        floorPlans.length > 0 ? floorPlans[0].id : null,
    );

    const activePlan = floorPlans.find((fp) => fp.id === activeFloor);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Floor Plans', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Floor Plans')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Floor Plans')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {site.name} — {floorPlans.length} {t('floor plan(s)')}
                        </p>
                    </div>
                </div>

                <div className="grid flex-1 gap-4 lg:grid-cols-[280px_1fr]">
                    {/* Sidebar: Floor list + upload + unplaced devices */}
                    <div className="space-y-4">
                        {/* Upload */}
                        <UploadCard site={site} />

                        {/* Floor list */}
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm">{t('Floors')}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-2">
                                {floorPlans.length === 0 ? (
                                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                                        {t('Upload a floor plan to get started')}
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {floorPlans.map((fp) => (
                                            <button
                                                key={fp.id}
                                                type="button"
                                                onClick={() => setActiveFloor(fp.id)}
                                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                                    activeFloor === fp.id
                                                        ? 'bg-primary/10 text-primary font-medium'
                                                        : 'hover:bg-muted'
                                                }`}
                                            >
                                                <Layers className="h-4 w-4 shrink-0" />
                                                <div className="flex-1 truncate">
                                                    <p className="truncate">{fp.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {fp.devices.length} {t('sensor(s)')}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Unplaced devices */}
                        {unplacedDevices.length > 0 && (
                            <Card>
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-sm">
                                        {t('Unplaced Sensors')} ({unplacedDevices.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2">
                                    <div className="space-y-1">
                                        {unplacedDevices.map((device) => (
                                            <div
                                                key={device.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('device_id', String(device.id));
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                className="flex cursor-grab items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-xs hover:border-primary hover:bg-primary/5 active:cursor-grabbing"
                                            >
                                                <GripVertical className="h-3 w-3 text-muted-foreground" />
                                                <Cpu className="h-3 w-3" />
                                                <span className="flex-1 truncate">{device.name}</span>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {device.model}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Main: Floor plan viewer */}
                    <Card className="flex flex-col">
                        {activePlan ? (
                            <>
                                <CardHeader className="flex flex-row items-center justify-between p-4">
                                    <div>
                                        <CardTitle className="text-base">{activePlan.name}</CardTitle>
                                        <CardDescription>
                                            {t('Floor')} {activePlan.floor_number}
                                            {activePlan.width_px && activePlan.height_px
                                                ? ` — ${activePlan.width_px}×${activePlan.height_px}px`
                                                : ''}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive"
                                        onClick={() =>
                                            router.delete(
                                                `/sites/${site.id}/floor-plans/${activePlan.id}`,
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: () => {
                                                        const remaining = floorPlans.filter(
                                                            (fp) => fp.id !== activePlan.id,
                                                        );
                                                        setActiveFloor(remaining[0]?.id ?? null);
                                                    },
                                                },
                                            )
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="relative flex-1 overflow-hidden p-0">
                                    <FloorPlanCanvas
                                        site={site}
                                        floorPlan={activePlan}
                                        devices={activePlan.devices}
                                    />
                                </CardContent>
                            </>
                        ) : (
                            <CardContent className="flex flex-1 items-center justify-center">
                                <EmptyState
                                    icon={<MapPin className="h-6 w-6 text-muted-foreground" />}
                                    title={t('No floor plan selected')}
                                    description={t('Upload a floor plan image or select one from the list')}
                                />
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

/* ── Upload Card ──────────────────────────────────── */

function UploadCard({ site }: { site: Site }) {
    const { t } = useLang();
    const form = useForm<{ name: string; floor_number: string; image: File | null }>({
        name: '',
        floor_number: '1',
        image: null,
    });

    function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!form.data.image) return;
        form.post(`/sites/${site.id}/floor-plans`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <Card>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Upload className="h-4 w-4" />
                    {t('Upload Floor Plan')}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <form onSubmit={handleUpload} className="space-y-3">
                    <Input
                        placeholder={t('Floor name')}
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                    />
                    <Input
                        type="number"
                        min={0}
                        placeholder={t('Floor #')}
                        value={form.data.floor_number}
                        onChange={(e) => form.setData('floor_number', e.target.value)}
                    />
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)}
                    />
                    <Button
                        type="submit"
                        size="sm"
                        className="w-full"
                        disabled={form.processing || !form.data.image || !form.data.name}
                    >
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        {t('Upload')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

/* ── Floor Plan Canvas with Drag & Drop ───────────── */

function FloorPlanCanvas({
    site,
    floorPlan,
    devices,
}: {
    site: Site;
    floorPlan: FloorPlan;
    devices: Device[];
}) {
    const { t } = useLang();
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [draggingDeviceId, setDraggingDeviceId] = useState<number | null>(null);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const deviceId = e.dataTransfer.getData('device_id');
            if (!deviceId || !imgRef.current || !containerRef.current) return;

            const rect = imgRef.current.getBoundingClientRect();
            const x = Math.round(
                ((e.clientX - rect.left) / rect.width) * (floorPlan.width_px ?? rect.width),
            );
            const y = Math.round(
                ((e.clientY - rect.top) / rect.height) * (floorPlan.height_px ?? rect.height),
            );

            router.put(
                `/sites/${site.id}/devices/${deviceId}`,
                {
                    floor_id: floorPlan.id,
                    floor_x: x,
                    floor_y: y,
                },
                { preserveScroll: true },
            );
        },
        [floorPlan, site.id],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const statusColors: Record<string, string> = {
        active: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
        offline: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
        pending: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
        provisioned: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]',
        maintenance: 'bg-zinc-400',
    };

    return (
        <div
            ref={containerRef}
            className="relative h-full min-h-[400px] overflow-auto bg-zinc-950/5 dark:bg-zinc-950/50"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <img
                ref={imgRef}
                src={`/storage/${floorPlan.image_path}`}
                alt={floorPlan.name}
                className="h-full w-full object-contain"
                draggable={false}
            />

            {/* Sensor dots */}
            {devices
                .filter((d) => d.floor_x !== null && d.floor_y !== null)
                .map((device) => {
                    const xPct =
                        floorPlan.width_px && device.floor_x !== null
                            ? (device.floor_x / floorPlan.width_px) * 100
                            : 0;
                    const yPct =
                        floorPlan.height_px && device.floor_y !== null
                            ? (device.floor_y / floorPlan.height_px) * 100
                            : 0;

                    return (
                        <div
                            key={device.id}
                            className="group absolute"
                            style={{
                                left: `${xPct}%`,
                                top: `${yPct}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            {/* Dot */}
                            <div
                                className={`h-3.5 w-3.5 cursor-pointer rounded-full border-2 border-white transition-transform hover:scale-150 dark:border-zinc-900 ${
                                    statusColors[device.status] ?? 'bg-zinc-400'
                                }`}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('device_id', String(device.id));
                                    setDraggingDeviceId(device.id);
                                }}
                                onDragEnd={() => setDraggingDeviceId(null)}
                            />

                            {/* Tooltip */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                                <div className="whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md border">
                                    <p className="font-medium">{device.name}</p>
                                    <p className="text-muted-foreground">
                                        {device.model} · {device.zone ?? t('No zone')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}

            {/* Drop hint overlay */}
            {devices.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <div className="text-center">
                        <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50" />
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t('Drag sensors from the sidebar to place them on the floor plan')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
