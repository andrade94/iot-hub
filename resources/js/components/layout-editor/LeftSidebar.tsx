import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';
import type { ZoneBoundary } from '@/types';
import { isDeviceOnline } from '@/utils/device';
import { useForm } from '@inertiajs/react';
import { ImageIcon, Plus, Search, Upload, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { FloorPlanWithDevices, LayoutDevice } from './types';

interface LeftSidebarProps {
    siteId: number;
    devices: LayoutDevice[];
    zoneBoundaries: ZoneBoundary[];
    floorPlans: FloorPlanWithDevices[];
    activeFloorId: number | null;
    selectedDeviceId: number | null;
    selectedZoneId: number | null;
    onDeviceSelect: (id: number | null) => void;
    onDevicePlace: (id: number) => void;
    onZoneSelect: (id: number | null) => void;
    onFloorChange: (id: number) => void;
    onFloorDelete: (id: number) => void;
    onStartDrawZone: () => void;
}

export function LeftSidebar({
    siteId, devices, zoneBoundaries, floorPlans, activeFloorId,
    selectedDeviceId, selectedZoneId,
    onDeviceSelect, onDevicePlace, onZoneSelect, onFloorChange, onFloorDelete, onStartDrawZone,
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
                                        onClick={() => onDevicePlace(d.id)} unplaced />
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
                            <FloorCard key={fp.id} floorPlan={fp} isActive={activeFloorId === fp.id}
                                siteId={siteId} onClick={() => onFloorChange(fp.id)} onDelete={() => onFloorDelete(fp.id)} />
                        ))}
                        <FloorUploadDialog siteId={siteId} existingFloors={floorPlans} />
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

/* -- Floor Card with Delete -- */

function FloorCard({ floorPlan, isActive, siteId, onClick, onDelete }: {
    floorPlan: FloorPlanWithDevices; isActive: boolean; siteId: number; onClick: () => void; onDelete: () => void;
}) {
    const { t } = useLang();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const replaceInputRef = useRef<HTMLInputElement>(null);
    const isBlank = floorPlan.image_path?.includes('blank-floor');

    function handleReplaceImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        formData.append('_method', 'PUT');
        fetch(`/sites/${siteId}/floor-plans/${floorPlan.id}`, {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        }).then(() => window.location.reload());
    }

    return (
        <>
            <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={handleReplaceImage} />
            <div onClick={onClick}
                className={cn('group rounded-md border p-3 mb-2 cursor-pointer transition-colors',
                    isActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30')}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[12px] font-semibold">{floorPlan.name}</p>
                        <p className="font-mono text-[9px] text-muted-foreground/60">
                            {t('Floor')} {floorPlan.floor_number} · {floorPlan.devices?.length ?? 0} {t('devices')}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {isActive && !isBlank && (
                            <Badge variant="outline" className="text-[8px] text-emerald-600 dark:text-emerald-400">{t('Active')}</Badge>
                        )}
                        {isBlank && (
                            <Badge variant="outline" className="text-[8px] text-amber-600 dark:text-amber-400">{t('Blank')}</Badge>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); replaceInputRef.current?.click(); }}
                            className="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-accent hover:text-foreground group-hover:flex"
                            title={t('Replace Image')}>
                            <Upload className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                            className="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-rose-500 group-hover:flex">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
            <ConfirmationDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={t('Delete Floor Plan')}
                description={t('Are you sure you want to delete this floor plan?')}
                itemName={floorPlan.name}
                warningMessage={`${floorPlan.devices?.length ?? 0} ${t('device(s) will be unplaced from this floor')}`}
                onConfirm={() => { onDelete(); setConfirmDelete(false); }}
            />
        </>
    );
}

/* -- Floor Stack Visualization -- */

function FloorStack({ existingFloors, newFloorNumber, newFloorName }: {
    existingFloors: FloorPlanWithDevices[]; newFloorNumber: number; newFloorName: string;
}) {
    const { t } = useLang();

    // Build a sorted list of all floors including the new one
    const allFloors = useMemo(() => {
        const items: { number: number; name: string; isNew: boolean; devices?: number }[] = [
            ...existingFloors.map((fp) => ({
                number: fp.floor_number,
                name: fp.name,
                isNew: false,
                devices: fp.devices?.length ?? 0,
            })),
            { number: newFloorNumber, name: newFloorName || t('New floor'), isNew: true },
        ];
        return items.sort((a, b) => b.number - a.number); // highest first
    }, [existingFloors, newFloorNumber, newFloorName, t]);

    return (
        <div className="mt-1.5 space-y-1">
            {allFloors.map((floor, i) => (
                <div key={`${floor.number}-${floor.isNew ? 'new' : i}`}
                    className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-1.5',
                        floor.isNew
                            ? 'border-2 border-dashed border-primary/40 bg-primary/5'
                            : 'border border-border bg-muted/20',
                    )}>
                    <span className={cn('font-mono text-[11px] font-bold tabular-nums', floor.isNew ? 'text-primary' : 'text-muted-foreground')}>
                        {floor.number}
                    </span>
                    <span className={cn('flex-1 truncate text-[11px]', floor.isNew ? 'font-medium text-primary' : 'text-muted-foreground')}>
                        {floor.name}
                    </span>
                    {floor.isNew ? (
                        <span className="font-mono text-[9px] text-primary/60">{t('new')}</span>
                    ) : (
                        <span className="font-mono text-[9px] text-muted-foreground/50">{floor.devices} {t('devices')}</span>
                    )}
                </div>
            ))}
        </div>
    );
}

/* -- Floor Upload Dialog -- */

function FloorUploadDialog({ siteId, existingFloors }: { siteId: number; existingFloors: FloorPlanWithDevices[] }) {
    const { t } = useLang();
    const [open, setOpen] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const nextFloorNumber = useMemo(() => {
        if (existingFloors.length === 0) return 1;
        return Math.max(...existingFloors.map((fp) => fp.floor_number)) + 1;
    }, [existingFloors]);

    const form = useForm<{ name: string; floor_number: string; image: File | null }>({
        name: '', floor_number: String(nextFloorNumber), image: null,
    });

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) return;
        form.setData('image', file);
        // Auto-fill name from filename if empty
        if (!form.data.name) {
            const nameFromFile = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
            form.setData('name', nameFromFile.charAt(0).toUpperCase() + nameFromFile.slice(1));
        }
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    }, [form]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const clearImage = useCallback(() => {
        form.setData('image', null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [form]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.data.name) return;
        form.post(`/sites/${siteId}/floor-plans`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setPreview(null);
                setOpen(false);
            },
        });
    }

    function handleClose() {
        setOpen(false);
        form.reset();
        setPreview(null);
    }

    return (
        <>
            <button onClick={() => setOpen(true)}
                className="flex w-full flex-col items-center gap-2 rounded-md border-2 border-dashed border-border py-6 text-center transition-colors hover:border-primary/30 hover:bg-accent/20">
                <Plus className="h-5 w-5 text-muted-foreground/40" />
                <span className="text-[11px] font-medium text-muted-foreground">{t('Add Floor Plan')}</span>
            </button>

            <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('Upload Floor Plan')}</DialogTitle>
                        <DialogDescription>{t('Upload an image of your floor plan to place devices and define zones')}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Drop zone / Preview */}
                        {!preview ? (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    'flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed py-12 transition-colors',
                                    dragOver
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/30 hover:bg-accent/10',
                                )}
                            >
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                                    <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[13px] font-medium">{t('Drag & drop your floor plan image')}</p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">{t('or click to browse')}</p>
                                </div>
                                <p className="font-mono text-[9px] text-muted-foreground/50">PNG, JPG, SVG — Max 10MB</p>
                                <p className="mt-2 text-[10px] text-muted-foreground/40">{t('or skip to create a blank canvas')}</p>
                            </div>
                        ) : (
                            <div className="relative overflow-hidden rounded-lg border border-border">
                                <img src={preview} alt="Preview" className="h-auto max-h-[240px] w-full object-contain bg-muted/20" />
                                <button type="button" onClick={clearImage}
                                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 border border-border shadow-sm transition-colors hover:bg-background">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                                <div className="border-t border-border bg-card/50 px-3 py-1.5">
                                    <p className="truncate font-mono text-[10px] text-muted-foreground">{form.data.image?.name}</p>
                                </div>
                            </div>
                        )}

                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                        {/* Fields */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px]">{t('Floor Name')}</Label>
                                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder={existingFloors.length === 0 ? t('e.g. Ground Floor') : t('e.g. Floor 2')}
                                    className="text-[12px]" autoFocus />
                                {form.errors.name && <p className="text-[10px] text-destructive">{form.errors.name}</p>}
                            </div>

                            {/* Floor position — visual stack with new floor interleaved */}
                            <div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px]">{t('Floor Position')}</Label>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => form.setData('floor_number', String(Number(form.data.floor_number) - 1))}
                                            className="flex h-6 w-6 items-center justify-center rounded border border-border text-[12px] text-muted-foreground transition-colors hover:bg-accent">−</button>
                                        <span className="w-8 text-center font-mono text-[12px] font-bold">{form.data.floor_number}</span>
                                        <button type="button" onClick={() => form.setData('floor_number', String(Number(form.data.floor_number) + 1))}
                                            className="flex h-6 w-6 items-center justify-center rounded border border-border text-[12px] text-muted-foreground transition-colors hover:bg-accent">+</button>
                                    </div>
                                </div>
                                {existingFloors.length > 0 && (
                                    <FloorStack existingFloors={existingFloors} newFloorNumber={Number(form.data.floor_number)} newFloorName={form.data.name} />
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose}>{t('Cancel')}</Button>
                            <Button type="submit" disabled={form.processing || !form.data.name.trim()}>
                                {form.data.image ? (
                                    <><Upload className="mr-1.5 h-3.5 w-3.5" />{form.processing ? t('Uploading...') : t('Upload Floor Plan')}</>
                                ) : (
                                    <>{form.processing ? t('Creating...') : t('Create Blank Floor')}</>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
