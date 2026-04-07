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
    const drawingRef = useRef<ZoneBoundary | null>(null);

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
        e.preventDefault();
        const pos = getNormalized(e);
        if (!pos) return;

        startRef.current = pos;
        const newZone: ZoneBoundary = {
            id: tempIdCounter--,
            site_id: siteId,
            floor_plan_id: floorPlanId,
            name: '',
            color: '#06b6d4',
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
        };
        drawingRef.current = newZone;
        setDrawingZone(newZone);

        function handleMouseMove(ev: MouseEvent) {
            if (!startRef.current) return;
            const movePos = getNormalized(ev);
            if (!movePos) return;

            const x = Math.min(startRef.current.x, movePos.x);
            const y = Math.min(startRef.current.y, movePos.y);
            const width = Math.abs(movePos.x - startRef.current.x);
            const height = Math.abs(movePos.y - startRef.current.y);

            const updated = { ...drawingRef.current!, x, y, width, height };
            drawingRef.current = updated;
            setDrawingZone(updated);
        }

        function handleMouseUp() {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            const zone = drawingRef.current;
            if (!zone || zone.width < 0.02 || zone.height < 0.02) {
                // Too small — cancel
                setDrawingZone(null);
                drawingRef.current = null;
                startRef.current = null;
                return;
            }

            const finalZone = { ...zone, name: `Zone ${Math.abs(zone.id)}` };
            onZoneCreated(finalZone);
            setDrawingZone(null);
            drawingRef.current = null;
            startRef.current = null;
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [floorPlanId, siteId, getNormalized, onZoneCreated]);

    return {
        drawingZone,
        containerRef,
        handleMouseDown,
    };
}
