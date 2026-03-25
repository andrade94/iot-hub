import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTimeAgo } from '@/utils/date';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { GripVertical, MapPin, Save, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FloorPlanDevice {
    id: number;
    name: string;
    zone: string | null;
    status: string;
    floor_x: number | null;
    floor_y: number | null;
    last_reading_at: string | null;
    latest_reading?: { metric: string; value: number; unit: string };
}

interface FloorPlan {
    id: number;
    name: string;
    floor_number: number;
    image_path: string;
}

interface FloorPlanViewProps {
    floorPlan: FloorPlan;
    devices: FloorPlanDevice[];
    editable?: boolean;
    onDevicePlaced?: (deviceId: number, x: number, y: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDotColor(device: FloorPlanDevice): string {
    if (device.status === 'active' && isRecentlyActive(device)) {
        return 'bg-emerald-500';
    }
    if (device.status === 'maintenance') {
        return 'bg-amber-500';
    }
    if (device.status === 'offline') {
        return 'bg-zinc-400 dark:bg-zinc-500';
    }
    if (device.status === 'pending' || device.status === 'provisioned') {
        return 'bg-amber-500';
    }
    // Fallback: active but stale data
    if (device.last_reading_at && !isRecentlyActive(device)) {
        return 'bg-amber-500';
    }
    if (!device.last_reading_at) {
        return 'bg-zinc-400 dark:bg-zinc-500';
    }
    return 'bg-emerald-500';
}

function getDotGlow(device: FloorPlanDevice): string {
    if (device.status === 'active' && isRecentlyActive(device)) {
        return 'shadow-[0_0_8px_rgba(16,185,129,0.6)]';
    }
    return '';
}

function hasAlert(device: FloorPlanDevice): boolean {
    // Treat offline + recently had data as an alert condition
    return device.status === 'offline' && device.last_reading_at !== null;
}

function getAlertStyles(device: FloorPlanDevice): string {
    if (hasAlert(device)) {
        return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse';
    }
    return '';
}

function isRecentlyActive(device: FloorPlanDevice): boolean {
    if (!device.last_reading_at) return false;
    return Date.now() - new Date(device.last_reading_at).getTime() < 15 * 60 * 1000;
}

function clampNormalized(value: number): number {
    return Math.max(0, Math.min(1, value));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface DeviceDotProps {
    device: FloorPlanDevice;
    editable: boolean;
    isDragging: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
}

function DeviceDot({ device, editable, isDragging, onMouseDown }: DeviceDotProps) {
    const { t } = useLang();

    if (device.floor_x === null || device.floor_y === null) return null;

    const alertActive = hasAlert(device);
    const dotColorClass = alertActive ? '' : getDotColor(device);
    const dotGlowClass = alertActive ? getAlertStyles(device) : getDotGlow(device);

    function handleClick(e: React.MouseEvent): void {
        if (editable) return;
        e.stopPropagation();
        router.get(`/devices/${device.id}`);
    }

    const dot = (
        <div
            className={cn(
                'absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 dark:border-zinc-900/80',
                dotColorClass,
                dotGlowClass,
                editable && 'cursor-grab',
                isDragging && 'cursor-grabbing opacity-70',
                !editable && 'cursor-pointer',
            )}
            style={{
                left: `${device.floor_x * 100}%`,
                top: `${device.floor_y * 100}%`,
            }}
            onMouseDown={editable ? onMouseDown : undefined}
            onClick={handleClick}
        />
    );

    if (editable) return dot;

    return (
        <Tooltip>
            <TooltipTrigger asChild>{dot}</TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs space-y-1 text-left">
                <p className="font-medium">{device.name}</p>
                {device.zone && (
                    <p className="text-xs text-muted-foreground">
                        {t('Zone')}: {device.zone}
                    </p>
                )}
                {device.latest_reading && (
                    <p className="text-xs">
                        {device.latest_reading.metric}: {device.latest_reading.value}
                        {device.latest_reading.unit}
                    </p>
                )}
                <p className="text-xs text-muted-foreground">
                    {device.last_reading_at ? formatTimeAgo(device.last_reading_at) : t('No data')}
                </p>
            </TooltipContent>
        </Tooltip>
    );
}

interface UnplacedDeviceListProps {
    devices: FloorPlanDevice[];
    selectedId: number | null;
    onSelect: (id: number | null) => void;
}

function UnplacedDeviceList({ devices, selectedId, onSelect }: UnplacedDeviceListProps) {
    const { t } = useLang();

    if (devices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <MapPin className="h-6 w-6" />
                <p>{t('All devices are placed')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('Unplaced Devices')} ({devices.length})
            </p>
            <ScrollArea className="max-h-[400px]">
                <div className="flex flex-col gap-1 pr-2">
                    {devices.map((device) => (
                        <button
                            key={device.id}
                            type="button"
                            className={cn(
                                'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                                selectedId === device.id
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-transparent hover:bg-muted/50',
                            )}
                            onClick={() => onSelect(selectedId === device.id ? null : device.id)}
                        >
                            <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{device.name}</p>
                                {device.zone && (
                                    <p className="truncate text-xs text-muted-foreground">{device.zone}</p>
                                )}
                            </div>
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                                {device.status}
                            </Badge>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function FloorPlanView({
    floorPlan,
    devices,
    editable = false,
    onDevicePlaced,
}: FloorPlanViewProps) {
    const { t } = useLang();
    const containerRef = useRef<HTMLDivElement>(null);

    // Editable state
    const [selectedUnplacedId, setSelectedUnplacedId] = useState<number | null>(null);
    const [localPositions, setLocalPositions] = useState<Record<number, { x: number; y: number }>>({});
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    const placedDevices = devices.filter((d) => {
        if (localPositions[d.id]) return true;
        return d.floor_x !== null && d.floor_y !== null;
    });

    const unplacedDevices = devices.filter((d) => {
        if (localPositions[d.id]) return false;
        return d.floor_x === null || d.floor_y === null;
    });

    // Compute normalized coordinates from a mouse event relative to the container
    const getNormalizedPosition = useCallback(
        (e: MouseEvent | React.MouseEvent): { x: number; y: number } | null => {
            const container = containerRef.current;
            if (!container) return null;
            const rect = container.getBoundingClientRect();
            const x = clampNormalized((e.clientX - rect.left) / rect.width);
            const y = clampNormalized((e.clientY - rect.top) / rect.height);
            return { x, y };
        },
        [],
    );

    // Place an unplaced device at a clicked position on the floor plan
    function handleFloorPlanClick(e: React.MouseEvent): void {
        if (!editable || selectedUnplacedId === null) return;

        const pos = getNormalizedPosition(e);
        if (!pos) return;

        setLocalPositions((prev) => ({ ...prev, [selectedUnplacedId]: pos }));
        setHasChanges(true);
        onDevicePlaced?.(selectedUnplacedId, pos.x, pos.y);
        setSelectedUnplacedId(null);
    }

    // Drag an already-placed device
    function handleDotMouseDown(deviceId: number) {
        return (e: React.MouseEvent) => {
            if (!editable) return;
            e.preventDefault();
            e.stopPropagation();
            setDraggingId(deviceId);

            function handleMouseMove(moveEvent: MouseEvent): void {
                const container = containerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const x = clampNormalized((moveEvent.clientX - rect.left) / rect.width);
                const y = clampNormalized((moveEvent.clientY - rect.top) / rect.height);
                setLocalPositions((prev) => ({ ...prev, [deviceId]: { x, y } }));
            }

            function handleMouseUp(upEvent: MouseEvent): void {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                setDraggingId(null);
                setHasChanges(true);

                const container = containerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const finalX = clampNormalized((upEvent.clientX - rect.left) / rect.width);
                const finalY = clampNormalized((upEvent.clientY - rect.top) / rect.height);
                onDevicePlaced?.(deviceId, finalX, finalY);
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };
    }

    // Build the effective device data with local overrides
    function getEffectiveDevice(device: FloorPlanDevice): FloorPlanDevice {
        const override = localPositions[device.id];
        if (!override) return device;
        return { ...device, floor_x: override.x, floor_y: override.y };
    }

    function handleSavePositions(): void {
        // Notify parent for each changed position
        for (const [idStr, pos] of Object.entries(localPositions)) {
            onDevicePlaced?.(Number(idStr), pos.x, pos.y);
        }
        setHasChanges(false);
    }

    function handleResetPositions(): void {
        setLocalPositions({});
        setHasChanges(false);
        setSelectedUnplacedId(null);
    }

    return (
        <div className="flex flex-col gap-4 lg:flex-row">
            {/* Floor Plan Image Container */}
            <div className="flex-1">
                {/* Status bar */}
                {editable && selectedUnplacedId !== null && (
                    <div className="mb-2 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>
                            {t('Click on the floor plan to place')}{' '}
                            <strong>
                                {devices.find((d) => d.id === selectedUnplacedId)?.name}
                            </strong>
                        </span>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="ml-auto"
                            onClick={() => setSelectedUnplacedId(null)}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}

                <div
                    ref={containerRef}
                    className={cn(
                        'relative overflow-hidden rounded-lg border bg-muted/30',
                        editable && selectedUnplacedId !== null && 'cursor-crosshair',
                        editable && draggingId !== null && 'cursor-grabbing',
                    )}
                    onClick={handleFloorPlanClick}
                >
                    <img
                        src={floorPlan.image_path}
                        alt={`${floorPlan.name} - ${t('Floor')} ${floorPlan.floor_number}`}
                        className="block h-auto w-full select-none"
                        draggable={false}
                    />

                    {/* Device dots */}
                    {placedDevices.map((device) => {
                        const effective = getEffectiveDevice(device);
                        return (
                            <DeviceDot
                                key={device.id}
                                device={effective}
                                editable={editable}
                                isDragging={draggingId === device.id}
                                onMouseDown={handleDotMouseDown(device.id)}
                            />
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        {t('Online')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                        {t('Warning')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                        {t('Alert')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                        {t('Offline')}
                    </span>
                </div>
            </div>

            {/* Editable sidebar */}
            {editable && (
                <div className="w-full shrink-0 space-y-4 lg:w-64">
                    <UnplacedDeviceList
                        devices={unplacedDevices}
                        selectedId={selectedUnplacedId}
                        onSelect={setSelectedUnplacedId}
                    />

                    {hasChanges && (
                        <div className="flex flex-col gap-2">
                            <Button onClick={handleSavePositions} className="w-full">
                                <Save className="h-4 w-4" />
                                {t('Save Positions')}
                            </Button>
                            <Button variant="outline" onClick={handleResetPositions} className="w-full">
                                {t('Reset Changes')}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
