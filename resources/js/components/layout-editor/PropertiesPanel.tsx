import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';
import type { ZoneBoundary } from '@/types';
import { isDeviceOnline } from '@/utils/device';
import { formatTimeAgo } from '@/utils/date';
import { Link } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { LayoutDevice } from './types';

const ZONE_COLORS = ['#06b6d4', '#22c55e', '#f59e0b', '#f43f5e', '#8b5cf6', '#3b82f6', '#94a3b8', '#ec4899'];

interface PropertiesPanelProps {
    selectedZone: ZoneBoundary | null;
    selectedDevice: LayoutDevice | null;
    devicesInZone: LayoutDevice[];
    onZoneUpdate: (zone: ZoneBoundary) => void;
    onZoneDelete: (id: number) => void;
    onDeviceRemoveFromFloor: (id: number) => void;
    onDeselect: () => void;
}

export function PropertiesPanel({
    selectedZone, selectedDevice, devicesInZone,
    onZoneUpdate, onZoneDelete, onDeviceRemoveFromFloor, onDeselect,
}: PropertiesPanelProps) {
    const { t } = useLang();
    const [confirmDeleteZone, setConfirmDeleteZone] = useState(false);
    const [confirmRemoveDevice, setConfirmRemoveDevice] = useState(false);

    // Nothing selected
    if (!selectedZone && !selectedDevice) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-[13px] text-muted-foreground">{t('Select a device or zone')}</p>
                <p className="text-[11px] text-muted-foreground/60">{t('Click on the floor plan to select, or use the Draw Zone tool to create zones')}</p>
            </div>
        );
    }

    // Zone selected
    if (selectedZone) {
        return (
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                        <span className="h-3 w-3 rounded" style={{ backgroundColor: selectedZone.color }} />
                        {t('Zone')}
                    </h3>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onDeselect}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <div>
                        <Label className="text-[9px]">{t('Zone Name')}</Label>
                        <Input value={selectedZone.name} className="mt-1 h-8 text-[12px]"
                            onChange={(e) => onZoneUpdate({ ...selectedZone, name: e.target.value })} />
                    </div>
                    <div>
                        <Label className="text-[9px]">{t('Color')}</Label>
                        <div className="mt-1 flex gap-1.5">
                            {ZONE_COLORS.map((c) => (
                                <button key={c} onClick={() => onZoneUpdate({ ...selectedZone, color: c })}
                                    className={cn('h-5 w-5 rounded border-2 transition-colors',
                                        selectedZone.color === c ? 'border-foreground' : 'border-transparent hover:border-muted-foreground/30')}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                    <div className="h-px bg-border" />
                    <div>
                        <Label className="text-[9px]">{t('Devices in Zone')} ({devicesInZone.length})</Label>
                        <div className="mt-1 space-y-1">
                            {devicesInZone.length === 0 ? (
                                <p className="py-3 text-center text-[11px] text-muted-foreground/60">{t('No devices in this zone')}</p>
                            ) : (
                                devicesInZone.map((d) => (
                                    <div key={d.id} className="flex items-center gap-2 rounded border border-border px-2 py-1.5">
                                        <span className={cn('h-[6px] w-[6px] rounded-full', isDeviceOnline(d.last_reading_at) ? 'bg-emerald-500' : 'bg-rose-500')} />
                                        <span className="truncate text-[10px] font-medium">{d.name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="h-px bg-border" />
                    <div>
                        <Label className="text-[9px]">{t('Boundary')}</Label>
                        <div className="mt-2 grid grid-cols-4 gap-2">
                            {[
                                { label: 'X', value: selectedZone.x },
                                { label: 'Y', value: selectedZone.y },
                                { label: 'W', value: selectedZone.width },
                                { label: 'H', value: selectedZone.height },
                            ].map(({ label, value }) => (
                                <div key={label} className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-center">
                                    <span className="block font-mono text-[9px] font-medium text-muted-foreground/60">{label}</span>
                                    <span className="block font-mono text-[13px] font-semibold tabular-nums">{(value * 100).toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-[10px] text-rose-600 dark:text-rose-400 border-rose-200/40 dark:border-rose-800/40"
                        onClick={() => setConfirmDeleteZone(true)}>
                        {t('Delete Zone')}
                    </Button>
                    <ConfirmationDialog
                        open={confirmDeleteZone}
                        onOpenChange={setConfirmDeleteZone}
                        title={t('Delete Zone')}
                        description={t('Are you sure you want to delete this zone boundary?')}
                        itemName={selectedZone.name}
                        warningMessage={devicesInZone.length > 0
                            ? `${devicesInZone.length} ${t('device(s) in this zone will become unassigned')}`
                            : t('This zone boundary will be removed from the floor plan')}
                        onConfirm={() => { onZoneDelete(selectedZone.id); setConfirmDeleteZone(false); }}
                    />
                </div>
            </div>
        );
    }

    // Device selected
    if (selectedDevice) {
        const online = isDeviceOnline(selectedDevice.last_reading_at);
        return (
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <h3 className="text-[13px] font-semibold">{t('Device')}</h3>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onDeselect}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <div>
                        <Label className="text-[9px]">{t('Name')}</Label>
                        <p className="mt-0.5 text-[12px] font-medium">{selectedDevice.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-[9px]">{t('Model')}</Label>
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{selectedDevice.model}</p>
                        </div>
                        <div>
                            <Label className="text-[9px]">{t('Zone')}</Label>
                            <p className="mt-0.5 text-[11px]">{selectedDevice.zone ?? '—'}</p>
                        </div>
                    </div>
                    <div className="h-px bg-border" />
                    <div>
                        <Label className="text-[9px]">{t('Status')}</Label>
                        <div className="mt-1 flex items-center gap-2 text-[12px]">
                            <span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald-500' : 'bg-rose-500')} />
                            {online ? t('Online') : t('Offline')}
                            {selectedDevice.last_reading_at && (
                                <span className="font-mono text-[10px] text-muted-foreground"> · {formatTimeAgo(selectedDevice.last_reading_at)}</span>
                            )}
                        </div>
                    </div>
                    {selectedDevice.battery_pct != null && (
                        <div>
                            <Label className="text-[9px]">{t('Battery')}</Label>
                            <div className="mt-1 flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
                                    <div className={cn('h-full rounded-full', selectedDevice.battery_pct < 20 ? 'bg-rose-500' : selectedDevice.battery_pct < 50 ? 'bg-amber-400' : 'bg-emerald-500')}
                                        style={{ width: `${selectedDevice.battery_pct}%` }} />
                                </div>
                                <span className="font-mono text-[10px]">{selectedDevice.battery_pct}%</span>
                            </div>
                        </div>
                    )}
                    {selectedDevice.floor_x != null && (
                        <div>
                            <Label className="text-[9px]">{t('Position')}</Label>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                                x: {(selectedDevice.floor_x * 100).toFixed(0)}% · y: {(selectedDevice.floor_y! * 100).toFixed(0)}%
                            </p>
                        </div>
                    )}
                    <div className="h-px bg-border" />
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-[10px]" asChild>
                            <Link href={`/devices/${selectedDevice.id}`}>{t('View Details')} ↗</Link>
                        </Button>
                        {selectedDevice.floor_x != null && (
                            <Button variant="outline" size="sm" className="text-[10px] text-rose-600 dark:text-rose-400"
                                onClick={() => setConfirmRemoveDevice(true)}>
                                {t('Remove')}
                            </Button>
                        )}
                    </div>
                    <ConfirmationDialog
                        open={confirmRemoveDevice}
                        onOpenChange={setConfirmRemoveDevice}
                        title={t('Remove Device from Floor')}
                        description={t('Are you sure you want to remove this device from the floor plan?')}
                        itemName={selectedDevice.name}
                        warningMessage={t('The device will be unplaced but not deleted. You can place it again later.')}
                        onConfirm={() => { onDeviceRemoveFromFloor(selectedDevice.id); setConfirmRemoveDevice(false); }}
                        actionLabel={t('Remove')}
                    />
                </div>
            </div>
        );
    }

    return null;
}
