import { cn } from '@/lib/utils';
import type { ZoneBoundary } from '@/types';
import { useCallback } from 'react';

interface ZoneRectProps {
    zone: ZoneBoundary;
    selected?: boolean;
    editable?: boolean;
    onClick?: () => void;
    onResize?: (zone: ZoneBoundary) => void;
}

function findImg(el: HTMLElement): HTMLImageElement | null {
    // Walk up to find the container with the floor plan image
    let node: HTMLElement | null = el;
    while (node) {
        const img = node.querySelector('img');
        if (img) return img;
        node = node.parentElement;
    }
    return null;
}

export function ZoneRect({ zone, selected = false, editable = false, onClick, onResize }: ZoneRectProps) {

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (!editable || !selected || !onResize) return;
        // Only drag from zone body, not from resize handles
        if ((e.target as HTMLElement).dataset.handle) return;
        e.stopPropagation();
        e.preventDefault();

        const img = findImg(e.currentTarget as HTMLElement);
        if (!img) return;

        const rect = img.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const origZone = { ...zone };

        function onMouseMove(ev: MouseEvent) {
            const dx = (ev.clientX - startX) / rect.width;
            const dy = (ev.clientY - startY) / rect.height;
            const updated = { ...origZone };
            updated.x = Math.max(0, Math.min(1 - updated.width, origZone.x + dx));
            updated.y = Math.max(0, Math.min(1 - updated.height, origZone.y + dy));
            onResize?.(updated);
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [editable, selected, zone, onResize]);

    const handleResizeStart = useCallback((corner: string) => (e: React.MouseEvent) => {
        if (!editable || !onResize) return;
        e.stopPropagation();
        e.preventDefault();

        const img = findImg(e.currentTarget as HTMLElement);
        if (!img) return;

        const rect = img.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const origZone = { ...zone };

        function onMouseMove(ev: MouseEvent) {
            const dx = (ev.clientX - startX) / rect.width;
            const dy = (ev.clientY - startY) / rect.height;
            const updated = { ...origZone };

            if (corner.includes('e')) { updated.width = Math.max(0.02, origZone.width + dx); }
            if (corner.includes('w')) { updated.x = origZone.x + dx; updated.width = Math.max(0.02, origZone.width - dx); }
            if (corner.includes('s')) { updated.height = Math.max(0.02, origZone.height + dy); }
            if (corner.includes('n')) { updated.y = origZone.y + dy; updated.height = Math.max(0.02, origZone.height - dy); }

            // Clamp all values to 0-1 range and ensure zone stays within bounds
            updated.x = Math.max(0, updated.x);
            updated.y = Math.max(0, updated.y);
            updated.width = Math.max(0.02, Math.min(1 - updated.x, updated.width));
            updated.height = Math.max(0.02, Math.min(1 - updated.y, updated.height));

            onResize?.(updated);
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [editable, zone, onResize]);

    return (
        <div
            className={cn(
                'absolute z-[5] flex flex-col items-center justify-center rounded transition-shadow',
                selected && editable ? 'z-[6] cursor-move ring-2 ring-cyan-500/30' : 'cursor-pointer',
            )}
            style={{
                left: `${zone.x * 100}%`,
                top: `${zone.y * 100}%`,
                width: `${zone.width * 100}%`,
                height: `${zone.height * 100}%`,
                border: `2px solid ${zone.color}${selected ? 'aa' : '40'}`,
                backgroundColor: `${zone.color}${selected ? '18' : '0a'}`,
            }}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            onMouseDown={selected ? handleDragStart : undefined}
        >
            {/* Zone label */}
            <span className="pointer-events-none font-mono text-[8px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: `${zone.color}${selected ? 'dd' : '99'}` }}>
                {zone.name}
            </span>

            {/* Resize handles — only when selected + editable */}
            {selected && editable && (
                <>
                    {['nw', 'ne', 'sw', 'se'].map((corner) => (
                        <div key={corner}
                            data-handle="true"
                            className="absolute h-2.5 w-2.5 rounded-sm border-2 border-white bg-cyan-500 shadow-sm"
                            style={{
                                top: corner.includes('n') ? -5 : undefined,
                                bottom: corner.includes('s') ? -5 : undefined,
                                left: corner.includes('w') ? -5 : undefined,
                                right: corner.includes('e') ? -5 : undefined,
                                cursor: `${corner}-resize`,
                            }}
                            onMouseDown={handleResizeStart(corner)}
                        />
                    ))}
                </>
            )}
        </div>
    );
}
