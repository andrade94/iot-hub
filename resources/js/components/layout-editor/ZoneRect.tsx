import { cn } from '@/lib/utils';
import type { ZoneBoundary } from '@/types';

interface ZoneRectProps {
    zone: ZoneBoundary;
    selected?: boolean;
    editable?: boolean;
    onClick?: () => void;
    onResize?: (zone: ZoneBoundary) => void;
}

export function ZoneRect({ zone, selected = false, editable = false, onClick, onResize }: ZoneRectProps) {
    const handleResizeStart = (corner: string) => (e: React.MouseEvent) => {
        if (!editable || !onResize) return;
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const container = (e.target as HTMLElement).closest('[data-slot="resizable-panel"]')?.querySelector('img')
            ?? (e.target as HTMLElement).closest('.relative')?.querySelector('img');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const origZone = { ...zone };

        function onMouseMove(ev: MouseEvent) {
            const dx = (ev.clientX - startX) / rect.width;
            const dy = (ev.clientY - startY) / rect.height;
            const updated = { ...origZone };

            if (corner.includes('e')) { updated.width = Math.max(0.02, origZone.width + dx); }
            if (corner.includes('w')) { updated.x = origZone.x + dx; updated.width = Math.max(0.02, origZone.width - dx); }
            if (corner.includes('s')) { updated.height = Math.max(0.02, origZone.height + dy); }
            if (corner.includes('n')) { updated.y = origZone.y + dy; updated.height = Math.max(0.02, origZone.height - dy); }

            // Clamp to 0-1
            updated.x = Math.max(0, Math.min(1 - updated.width, updated.x));
            updated.y = Math.max(0, Math.min(1 - updated.height, updated.y));

            onResize?.(updated);
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div
            className={cn(
                'absolute z-[5] flex flex-col items-center justify-center rounded transition-shadow cursor-pointer',
                selected && 'z-[6] ring-2 ring-cyan-500/30',
            )}
            style={{
                left: `${zone.x * 100}%`,
                top: `${zone.y * 100}%`,
                width: `${zone.width * 100}%`,
                height: `${zone.height * 100}%`,
                border: `2px solid ${zone.color}40`,
                backgroundColor: `${zone.color}12`,
            }}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        >
            {/* Zone label */}
            <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: `${zone.color}99` }}>
                {zone.name}
            </span>

            {/* Resize handles — only when selected + editable */}
            {selected && editable && (
                <>
                    {['nw', 'ne', 'sw', 'se'].map((corner) => (
                        <div key={corner}
                            className="absolute h-2 w-2 rounded-sm border border-white bg-cyan-500"
                            style={{
                                top: corner.includes('n') ? -4 : undefined,
                                bottom: corner.includes('s') ? -4 : undefined,
                                left: corner.includes('w') ? -4 : undefined,
                                right: corner.includes('e') ? -4 : undefined,
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
