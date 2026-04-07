import FloorPlanView from '@/components/FloorPlanView';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';
import type { ZoneBoundary } from '@/types';
import { ZoneRect } from './ZoneRect';
import { useZoneDrawing } from './use-zone-drawing';
import type { EditorMode, FloorPlanWithDevices, LayoutDevice } from './types';

interface CanvasPanelProps {
    floorPlan: FloorPlanWithDevices | null;
    devices: LayoutDevice[];
    zoneBoundaries: ZoneBoundary[];
    editorMode: EditorMode;
    selectedZoneId: number | null;
    siteId: number;
    onDevicePlaced: (deviceId: number, x: number, y: number) => void;
    onZoneSelect: (id: number | null) => void;
    onZoneCreated: (zone: ZoneBoundary) => void;
    onZoneResize: (zone: ZoneBoundary) => void;
}

export function CanvasPanel({
    floorPlan, devices, zoneBoundaries, editorMode, selectedZoneId, siteId,
    onDevicePlaced, onZoneSelect, onZoneCreated, onZoneResize,
}: CanvasPanelProps) {
    const { t } = useLang();

    const { drawingZone, containerRef, handleMouseDown } = useZoneDrawing({
        floorPlanId: floorPlan?.id ?? 0,
        siteId,
        onZoneCreated,
    });

    if (!floorPlan) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted/20 p-8">
                <div className="text-5xl opacity-20">&#128506;</div>
                <p className="text-[14px] font-medium text-muted-foreground">{t('No floor plan yet')}</p>
                <p className="text-[12px] text-muted-foreground/60">{t('Upload a floor plan image to start placing devices')}</p>
            </div>
        );
    }

    const zonesOnFloor = zoneBoundaries.filter((z) => z.floor_plan_id === floorPlan.id);

    // Map LayoutDevice[] to FloorPlanDevice[] for FloorPlanView
    const floorDevices = devices
        .filter((d) => d.floor_id === floorPlan.id && d.floor_x != null && d.floor_y != null)
        .map((d) => ({
            id: d.id,
            name: d.name,
            zone: d.zone,
            status: d.status,
            floor_x: d.floor_x,
            floor_y: d.floor_y,
            last_reading_at: d.last_reading_at,
        }));

    return (
        <div className="relative flex h-full flex-col overflow-auto bg-muted/20">
            {/* Draw mode instruction */}
            {editorMode === 'draw-zone' && (
                <div className="flex items-center gap-2 border-b border-cyan-200/60 bg-cyan-50/50 px-4 py-2 text-[12px] text-cyan-700 dark:border-cyan-800/30 dark:bg-cyan-950/20 dark:text-cyan-300">
                    <span>&#9634;</span>
                    {t('Click and drag on the floor plan to draw a zone rectangle')}
                </div>
            )}

            <div className="flex flex-1 items-center justify-center p-6">
                <div className="relative w-full max-w-[1000px]" ref={(el) => { containerRef.current = el; }}>
                    <FloorPlanView
                        floorPlan={floorPlan}
                        devices={floorDevices}
                        editable={editorMode === 'select'}
                        onDevicePlaced={editorMode === 'select' ? onDevicePlaced : undefined}
                        overlayContent={
                            <>
                                {/* Zone rectangles */}
                                {zonesOnFloor.map((zone) => (
                                    <ZoneRect
                                        key={zone.id}
                                        zone={zone}
                                        selected={selectedZoneId === zone.id}
                                        editable={editorMode === 'select'}
                                        onClick={() => onZoneSelect(zone.id)}
                                        onResize={editorMode === 'select' ? onZoneResize : undefined}
                                    />
                                ))}
                                {drawingZone && <ZoneRect zone={drawingZone} selected />}
                                {/* Draw overlay — only in draw-zone mode */}
                                {editorMode === 'draw-zone' && (
                                    <div
                                        className="absolute inset-0 z-[15] cursor-crosshair"
                                        onMouseDown={handleMouseDown}
                                    />
                                )}
                            </>
                        }
                    />

                </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center gap-3 border-t border-border bg-card px-3 py-1.5 font-mono text-[10px] text-muted-foreground/60">
                <span>{floorPlan.name}</span>
                <span className="text-border">|</span>
                <span>{floorDevices.length} {t('placed')}</span>
                <span className="text-border">|</span>
                <span>{zonesOnFloor.length} {t('zones')}</span>
                <span className="flex-1" />
                <span>
                    <kbd className="rounded border border-border bg-muted/50 px-1 text-[8px]">E</kbd> {t('toggle edit')} ·{' '}
                    {editorMode !== 'view' && (
                        <>
                            <kbd className="rounded border border-border bg-muted/50 px-1 text-[8px]">Del</kbd> {t('delete')} ·{' '}
                        </>
                    )}
                    <kbd className="rounded border border-border bg-muted/50 px-1 text-[8px]">Esc</kbd> {editorMode === 'view' ? '' : t('deselect')}
                </span>
            </div>
        </div>
    );
}
