import { Button } from '@/components/ui/button';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';
import type { FloorPlanWithDevices, EditorMode } from './types';

interface LayoutToolbarProps {
    floorPlans: FloorPlanWithDevices[];
    activeFloorId: number | null;
    onFloorChange: (id: number) => void;
    editorMode: EditorMode;
    onModeChange: (mode: EditorMode) => void;
    hasChanges: boolean;
    saving: boolean;
    onSave: () => void;
    onReset: () => void;
    onUndo: () => void;
    stats: { online: number; offline: number; alerts: number };
}

export function LayoutToolbar({
    floorPlans, activeFloorId, onFloorChange, editorMode, onModeChange,
    hasChanges, saving, onSave, onReset, onUndo, stats,
}: LayoutToolbarProps) {
    const { t } = useLang();

    return (
        <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-1.5 flex-wrap">
            {/* Tool selector */}
            <div className="flex overflow-hidden rounded-md border border-border">
                <button onClick={() => onModeChange('select')}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium transition-colors border-r border-border',
                        editorMode === 'select' ? 'bg-accent text-foreground' : 'text-muted-foreground/60 hover:bg-accent/30')}>
                    &#9654; {t('Select')}
                </button>
                <button onClick={() => onModeChange('draw-zone')}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium transition-colors',
                        editorMode === 'draw-zone' ? 'bg-accent text-cyan-600 dark:text-cyan-400' : 'text-muted-foreground/60 hover:bg-accent/30')}>
                    &#9634; {t('Draw Zone')}
                </button>
            </div>

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Floor tabs */}
            {floorPlans.length > 0 && (
                <div className="flex overflow-hidden rounded-md border border-border">
                    {floorPlans.map((fp) => (
                        <button key={fp.id} onClick={() => onFloorChange(fp.id)}
                            className={cn('px-3 py-1.5 font-mono text-[10px] font-medium transition-colors border-r border-border last:border-r-0',
                                activeFloorId === fp.id ? 'bg-accent text-foreground' : 'text-muted-foreground/60 hover:bg-accent/30')}>
                            {fp.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1" />

            {/* Stats */}
            <div className="flex items-center gap-3 font-mono text-[10px]">
                {stats.online > 0 && <span className="text-emerald-600 dark:text-emerald-400">&#9679; {stats.online}</span>}
                {stats.offline > 0 && <span className="text-rose-600 dark:text-rose-400">&#9679; {stats.offline}</span>}
                {stats.alerts > 0 && <span className="text-amber-600 dark:text-amber-400">&#9679; {stats.alerts}</span>}
            </div>

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Actions */}
            <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" onClick={onUndo} disabled={!hasChanges}>
                &#8634; {t('Undo')}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onReset} disabled={!hasChanges}>
                {t('Reset')}
            </Button>
            <Button size="sm" className="h-7 text-[10px]" onClick={onSave} disabled={!hasChanges || saving}>
                {saving ? t('Saving...') : `✓ ${t('Save')}`}
            </Button>
        </div>
    );
}
