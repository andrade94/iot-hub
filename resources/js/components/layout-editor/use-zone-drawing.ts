import type { ZoneBoundary } from '@/types';
import { useCallback, useRef, useState } from 'react';

interface UseZoneDrawingOptions {
    floorPlanId: number;
    siteId: number;
    onZoneCreated: (zone: ZoneBoundary) => void;
}

let tempIdCounter = -1;

export function useZoneDrawing({ floorPlanId, siteId, onZoneCreated }: UseZoneDrawingOptions) {
    const [drawingZone, setDrawingZone] = useState<ZoneBoundary | null>(null);
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLElement | null>(null);

    const getNormalized = useCallback((e: MouseEvent | React.MouseEvent): { x: number; y: number } | null => {
        const container = containerRef.current;
        if (!container) return null;
        const img = container.querySelector('img');
        if (!img) return null;
        const rect = img.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
            y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
        };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const pos = getNormalized(e);
        if (!pos) return;
        startRef.current = pos;
        setDrawingZone({
            id: tempIdCounter--,
            site_id: siteId,
            floor_plan_id: floorPlanId,
            name: '',
            color: '#06b6d4',
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
        });
    }, [floorPlanId, siteId, getNormalized]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!startRef.current || !drawingZone) return;
        const pos = getNormalized(e);
        if (!pos) return;

        const x = Math.min(startRef.current.x, pos.x);
        const y = Math.min(startRef.current.y, pos.y);
        const width = Math.abs(pos.x - startRef.current.x);
        const height = Math.abs(pos.y - startRef.current.y);

        setDrawingZone((prev) => prev ? { ...prev, x, y, width, height } : null);
    }, [drawingZone, getNormalized]);

    const handleMouseUp = useCallback(() => {
        if (!drawingZone || drawingZone.width < 0.02 || drawingZone.height < 0.02) {
            // Too small — cancel
            setDrawingZone(null);
            startRef.current = null;
            return;
        }

        const finalZone = { ...drawingZone, name: `Zone ${Math.abs(drawingZone.id)}` };
        onZoneCreated(finalZone);
        setDrawingZone(null);
        startRef.current = null;
    }, [drawingZone, onZoneCreated]);

    return {
        drawingZone,
        containerRef,
        handlers: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
        },
    };
}
