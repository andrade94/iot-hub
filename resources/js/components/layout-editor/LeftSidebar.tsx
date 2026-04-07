import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';
import type { ZoneBoundary } from '@/types';
import { isDeviceOnline } from '@/utils/device';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FloorPlanWithDevices, LayoutDevice } from './types';

interface LeftSidebarProps {
    devices: LayoutDevice[];
    zoneBoundaries: ZoneBoundary[];
    floorPlans: FloorPlanWithDevices[];
    activeFloorId: number | null;
    selectedDeviceId: number | null;
    selectedZoneId: number | null;
    onDeviceSelect: (id: number | null) => void;
    onZoneSelect: (id: number | null) => void;
    onStartDrawZone: () => void;
}

export function LeftSidebar({
    devices, zoneBoundaries, floorPlans, activeFloorId,
    selectedDeviceId, selectedZoneId,
    onDeviceSelect, onZoneSelect, onStartDrawZone,
}: LeftSidebarProps) {
    const { t } = useLang();
    const [deviceSearch, setDeviceSearch] = useState('');

    const unplaced = useMemo(() => devices.filter((d) => d.floor_x == null), [devices]);
    const placed = useMemo(() => devices.filter((d) => d.floor_x != null), [devices]);

    const filteredPlaced = useMemo(() => {
        if (!deviceSearch.trim()) return placed;
        const q = deviceSearch.toLowerCase();
        return placed.filter((d) => d.name.toLowerCase().includes(q) || d.model.toLowerCase().includes(q));
    }, [placed, deviceSearch]);

    const zonesOnFloor = useMemo(() =>
        zoneBoundaries.filter((z) => z.floor_plan_id === activeFloorId),
    [zoneBoundaries, activeFloorId]);

    return (
        <div className="flex h-full flex-col border-r border-border bg-card">
            <Tabs defaultValue="devices" className="flex h-full flex-col">
                <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0">
                    <TabsTrigger value="devices" className="flex-1 rounded-none border-b-2 border-transparent py-2 text-[11px] data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        {t('Devices')}
                    </TabsTrigger>
                    <TabsTrigger value="zones" className="flex-1 rounded-none border-b-2 border-transparent py-2 text-[11px] data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        {t('Zones')}
                    </TabsTrigger>
                    <TabsTrigger value="floors" className="flex-1 rounded-none border-b-2 border-transparent py-2 text-[11px] data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        {t('Floors')}
                    </TabsTrigger>
                </TabsList>

                {/* ── Devices Tab ── */}
                <TabsContent value="devices" className="mt-0 flex-1 overflow-hidden">
                    <div className="border-b border-border p-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                            <Input value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)}
                                placeholder={t('Search devices...')} className="h-7 pl-8 text-[11px]" />
                        </div>
                    </div>
                    <ScrollArea className="flex-1 p-2">
                        {unplaced.length > 0 && (
                            <>
                                <p className="mb-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
                                    {t('Unplaced')} ({unplaced.length})
                                </p>
                                {unplaced.map((d) => (
                                    <DeviceCard key={d.id} device={d} selected={selectedDeviceId === d.id}
                                        onClick={() => onDeviceSelect(d.id)} unplaced />
                                ))}
                            </>
                        )}
                        <p className="mb-1.5 mt-3 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
                            {t('Placed')} ({filteredPlaced.length})
                        </p>
                        {filteredPlaced.map((d) => (
                            <DeviceCard key={d.id} device={d} selected={selectedDeviceId === d.id}
                                onClick={() => onDeviceSelect(d.id)} />
                        ))}
                    </ScrollArea>
                </TabsContent>

                {/* ── Zones Tab ── */}
                <TabsContent value="zones" className="mt-0 flex-1 overflow-hidden">
                    <div className="border-b border-border p-2">
                        <Button variant="outline" size="sm" className="w-full text-[10px]" onClick={onStartDrawZone}>
                            <Plus className="mr-1 h-3 w-3" />{t('Draw New Zone')}
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-2">
                        {zonesOnFloor.length === 0 ? (
                            <p className="py-8 text-center text-[12px] text-muted-foreground">{t('No zones defined yet')}</p>
                        ) : (
                            zonesOnFloor.map((z) => {
                                const devicesInZone = devices.filter((d) => d.zone === z.name && d.floor_id === activeFloorId);
                                return (
                                    <button key={z.id} onClick={() => onZoneSelect(z.id)}
                                        className={cn('flex w-full items-center gap-2 rounded-md border px-3 py-2 mb-1 text-left transition-colors',
                                            selectedZoneId === z.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30')}>
                                        <div className="h-5 w-[3px] rounded-full" style={{ backgroundColor: z.color }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-semibold truncate">{z.name}</p>
                                            <p className="font-mono text-[9px] text-muted-foreground/60">{devicesInZone.length} {t('devices')}</p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </ScrollArea>
                </TabsContent>

                {/* ── Floors Tab ── */}
                <TabsContent value="floors" className="mt-0 flex-1 overflow-hidden">
                    <ScrollArea className="flex-1 p-2">
                        {floorPlans.map((fp) => (
                            <div key={fp.id} className={cn('rounded-md border p-3 mb-2 cursor-pointer transition-colors',
                                activeFloorId === fp.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30')}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[12px] font-semibold">{fp.name}</p>
                                        <p className="font-mono text-[9px] text-muted-foreground/60">
                                            {t('Floor')} {fp.floor_number} · {fp.devices?.length ?? 0} {t('devices')}
                                        </p>
                                    </div>
                                    {activeFloorId === fp.id && (
                                        <Badge variant="outline" className="text-[8px] text-emerald-600 dark:text-emerald-400">{t('Active')}</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}

/* -- Device Card -- */

function DeviceCard({ device, selected, onClick, unplaced }: {
    device: LayoutDevice; selected: boolean; onClick: () => void; unplaced?: boolean;
}) {
    const online = isDeviceOnline(device.last_reading_at);
    return (
        <button onClick={onClick}
            className={cn('flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 mb-1 text-left transition-colors',
                selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30')}>
            <span className={cn('h-[7px] w-[7px] shrink-0 rounded-full',
                unplaced ? 'border-2 border-dashed border-amber-400 bg-transparent'
                : online ? 'bg-emerald-500' : 'bg-rose-500')} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">{device.name}</p>
                <p className="truncate font-mono text-[9px] text-muted-foreground/60">
                    {device.zone ?? 'No zone'} · {device.model}
                </p>
            </div>
            {unplaced && <span className="font-mono text-[8px] text-amber-500">drag</span>}
        </button>
    );
}
