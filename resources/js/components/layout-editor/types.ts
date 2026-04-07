import type { Device, FloorPlan, ZoneBoundary } from '@/types';

export type EditorMode = 'view' | 'select' | 'draw-zone';

export interface FloorPlanWithDevices extends FloorPlan {
    devices: Device[];
}

export interface LayoutDevice {
    id: number;
    name: string;
    model: string;
    zone: string | null;
    status: string;
    floor_id: number | null;
    floor_x: number | null;
    floor_y: number | null;
    battery_pct: number | null;
    rssi: number | null;
    last_reading_at: string | null;
}

export interface EditorState {
    activeFloorId: number | null;
    selectedDeviceId: number | null;
    selectedZoneId: number | null;
    editorMode: EditorMode;
    hasChanges: boolean;
    saving: boolean;
}

export function getZoneForPosition(
    x: number,
    y: number,
    zones: ZoneBoundary[],
    floorPlanId: number,
): string | null {
    // Filter zones for this floor, find smallest containing zone (most specific)
    const matching = zones
        .filter(
            (z) =>
                z.floor_plan_id === floorPlanId &&
                x >= z.x &&
                x <= z.x + z.width &&
                y >= z.y &&
                y <= z.y + z.height,
        )
        .sort((a, b) => a.width * a.height - (b.width * b.height));

    return matching[0]?.name ?? null;
}
