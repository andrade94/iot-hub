import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { CanvasPanel } from '@/components/layout-editor/CanvasPanel';
import { LayoutToolbar } from '@/components/layout-editor/LayoutToolbar';
import { LeftSidebar } from '@/components/layout-editor/LeftSidebar';
import { PropertiesPanel } from '@/components/layout-editor/PropertiesPanel';
import { getZoneForPosition } from '@/components/layout-editor/types';
import type { EditorMode, FloorPlanWithDevices, LayoutDevice } from '@/components/layout-editor/types';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Site, ZoneBoundary } from '@/types';
import { isDeviceOnline } from '@/utils/device';
import { Head, router } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
    site: Site;
    floorPlans: FloorPlanWithDevices[];
    allDevices: LayoutDevice[];
    zoneBoundaries: ZoneBoundary[];
}

export default function SiteLayout({ site, floorPlans, allDevices: initialDevices, zoneBoundaries: initialZones }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: t('Sites'), href: '/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: t('Layout'), href: '#' },
    ];

    // ── Editor State ──
    const [activeFloorId, setActiveFloorId] = useState<number | null>(floorPlans[0]?.id ?? null);
    const [editorMode, setEditorMode] = useState<EditorMode>('view');
    const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
    const [placingDeviceId, setPlacingDeviceId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    // ── Local State (mutable copies) ──
    const [devices, setDevices] = useState<LayoutDevice[]>(initialDevices);
    const [zones, setZones] = useState<ZoneBoundary[]>(initialZones);
    const [deletedZoneIds, setDeletedZoneIds] = useState<number[]>([]);
    const [changedDeviceIds, setChangedDeviceIds] = useState<Set<number>>(new Set());
    const hasChanges = changedDeviceIds.size > 0 || zones !== initialZones || deletedZoneIds.length > 0;

    // ── Derived ──
    const activeFloorPlan = useMemo(() => floorPlans.find((fp) => fp.id === activeFloorId) ?? null, [floorPlans, activeFloorId]);
    const selectedZone = useMemo(() => zones.find((z) => z.id === selectedZoneId) ?? null, [zones, selectedZoneId]);
    const selectedDevice = useMemo(() => devices.find((d) => d.id === selectedDeviceId) ?? null, [devices, selectedDeviceId]);
    const devicesInSelectedZone = useMemo(() =>
        selectedZone ? devices.filter((d) => d.zone === selectedZone.name && d.floor_id === activeFloorId) : [],
    [selectedZone, devices, activeFloorId]);

    const stats = useMemo(() => ({
        online: devices.filter((d) => isDeviceOnline(d.last_reading_at)).length,
        offline: devices.filter((d) => !isDeviceOnline(d.last_reading_at)).length,
        alerts: 0,
    }), [devices]);

    // ── Handlers ──
    const handleDevicePlaced = useCallback((deviceId: number, x: number, y: number) => {
        if (!activeFloorId) return;
        const autoZone = getZoneForPosition(x, y, zones, activeFloorId);
        setDevices((prev) => prev.map((d) =>
            d.id === deviceId ? { ...d, floor_id: activeFloorId, floor_x: x, floor_y: y, zone: autoZone ?? d.zone } : d,
        ));
        setChangedDeviceIds((prev) => new Set([...prev, deviceId]));
        setSelectedDeviceId(deviceId);
        setPlacingDeviceId(null);
    }, [activeFloorId, zones]);

    const handleZoneCreated = useCallback((zone: ZoneBoundary) => {
        setZones((prev) => [...prev, zone]);
        setSelectedZoneId(zone.id);
        setEditorMode('select');
    }, []);

    const handleZoneResize = useCallback((updated: ZoneBoundary) => {
        setZones((prev) => prev.map((z) => z.id === updated.id ? updated : z));
    }, []);

    const handleZoneUpdate = useCallback((updated: ZoneBoundary) => {
        setZones((prev) => prev.map((z) => z.id === updated.id ? updated : z));
    }, []);

    // Recalculate device zones whenever zones change
    useEffect(() => {
        setDevices((prev) => {
            let changed = false;
            const result = prev.map((d) => {
                if (d.floor_id == null || d.floor_x == null || d.floor_y == null) return d;
                const newZone = getZoneForPosition(d.floor_x, d.floor_y, zones, d.floor_id);
                // Assign zone if inside one, clear if not inside any
                const resolvedZone = newZone ?? '';
                if (resolvedZone !== (d.zone ?? '')) {
                    changed = true;
                    return { ...d, zone: resolvedZone };
                }
                return d;
            });
            if (!changed) return prev;
            result.forEach((d, i) => {
                if (d !== prev[i]) setChangedDeviceIds((ids) => new Set([...ids, d.id]));
            });
            return result;
        });
    }, [zones]);

    const handleZoneDelete = useCallback((id: number) => {
        setZones((prev) => prev.filter((z) => z.id !== id));
        if (id > 0) setDeletedZoneIds((prev) => [...prev, id]);
        setSelectedZoneId(null);
    }, []);

    const handleDeviceRemoveFromFloor = useCallback((id: number) => {
        setDevices((prev) => prev.map((d) =>
            d.id === id ? { ...d, floor_id: null, floor_x: null, floor_y: null } : d,
        ));
        setChangedDeviceIds((prev) => new Set([...prev, id]));
        setSelectedDeviceId(null);
    }, []);

    const handleDeselect = useCallback(() => {
        setSelectedDeviceId(null);
        setSelectedZoneId(null);
    }, []);

    const handleReset = useCallback(() => {
        setDevices(initialDevices);
        setZones(initialZones);
        setDeletedZoneIds([]);
        setChangedDeviceIds(new Set());
        setSelectedDeviceId(null);
        setSelectedZoneId(null);
    }, [initialDevices, initialZones]);

    const handleFloorDelete = useCallback((floorPlanId: number) => {
        router.delete(`/sites/${site.id}/floor-plans/${floorPlanId}`, {
            preserveScroll: true,
        });
    }, [site.id]);

    const handleSave = useCallback(() => {
        setSaving(true);

        const devicePositions = [...changedDeviceIds].map((id) => {
            const d = devices.find((dev) => dev.id === id);
            if (!d) return null;
            return {
                device_id: d.id,
                floor_id: d.floor_id,
                floor_x: d.floor_x,
                floor_y: d.floor_y,
                zone: d.zone,
            };
        }).filter(Boolean);

        const zoneBoundaries = zones.map((z) => ({
            id: z.id > 0 ? z.id : null,
            floor_plan_id: z.floor_plan_id,
            name: z.name,
            color: z.color,
            x: z.x,
            y: z.y,
            width: z.width,
            height: z.height,
        }));

        router.post(`/sites/${site.id}/layout`, {
            device_positions: devicePositions,
            zone_boundaries: zoneBoundaries,
            deleted_zone_ids: deletedZoneIds,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setChangedDeviceIds(new Set());
                setDeletedZoneIds([]);
            },
            onFinish: () => setSaving(false),
        });
    }, [site.id, devices, zones, deletedZoneIds, changedDeviceIds]);

    // ── Keyboard Shortcuts ──
    const isEditing = editorMode !== 'view';
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            // Toggle edit mode
            if (e.key === 'e' && !e.metaKey && !e.ctrlKey) {
                setEditorMode((prev) => prev === 'view' ? 'select' : 'view');
                return;
            }
            if (e.key === 'Escape') {
                if (editorMode === 'draw-zone') { setEditorMode('select'); return; }
                if (selectedZoneId || selectedDeviceId) { handleDeselect(); return; }
                if (isEditing) { setEditorMode('view'); return; }
            }
            // Edit-mode-only shortcuts
            if (!isEditing) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedZoneId) handleZoneDelete(selectedZoneId);
            }
            if (e.key === 'z' && !e.metaKey && !e.ctrlKey) setEditorMode('draw-zone');
            if (e.key === 'v') setEditorMode('select');
            if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (hasChanges) handleSave(); }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editorMode, isEditing, selectedZoneId, selectedDeviceId, hasChanges, handleDeselect, handleZoneDelete, handleSave]);

    // ── Unsaved changes warning ──
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => { if (hasChanges) e.preventDefault(); };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [hasChanges]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${site.name} — ${t('Layout')}`} />
            <div className="flex h-[calc(100vh-4rem)] flex-col">
                <LayoutToolbar
                    floorPlans={floorPlans}
                    activeFloorId={activeFloorId}
                    onFloorChange={setActiveFloorId}
                    editorMode={editorMode}
                    onModeChange={setEditorMode}
                    hasChanges={hasChanges}
                    saving={saving}
                    onSave={handleSave}
                    onReset={handleReset}
                    onUndo={handleReset}
                    stats={stats}
                />

                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                        <LeftSidebar
                            siteId={site.id}
                            devices={devices}
                            zoneBoundaries={zones}
                            floorPlans={floorPlans}
                            activeFloorId={activeFloorId}
                            selectedDeviceId={selectedDeviceId}
                            selectedZoneId={selectedZoneId}
                            onDeviceSelect={setSelectedDeviceId}
                            onDevicePlace={(id) => { setPlacingDeviceId(id); setEditorMode('select'); }}
                            onZoneSelect={setSelectedZoneId}
                            onFloorChange={setActiveFloorId}
                            onFloorDelete={handleFloorDelete}
                            onStartDrawZone={() => setEditorMode('draw-zone')}
                        />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={55}>
                        <CanvasPanel
                            floorPlan={activeFloorPlan}
                            devices={devices}
                            zoneBoundaries={zones}
                            editorMode={editorMode}
                            selectedZoneId={selectedZoneId}
                            placingDeviceId={placingDeviceId}
                            selectedDeviceId={selectedDeviceId}
                            siteId={site.id}
                            onDevicePlaced={handleDevicePlaced}
                            onPlacementClear={() => setPlacingDeviceId(null)}
                            onZoneSelect={setSelectedZoneId}
                            onZoneCreated={handleZoneCreated}
                            onZoneResize={handleZoneResize}
                        />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
                        <PropertiesPanel
                            selectedZone={selectedZone}
                            selectedDevice={selectedDevice}
                            devicesInZone={devicesInSelectedZone}
                            editable={editorMode !== 'view'}
                            onZoneUpdate={handleZoneUpdate}
                            onZoneDelete={handleZoneDelete}
                            onDeviceRemoveFromFloor={handleDeviceRemoveFromFloor}
                            onDeselect={handleDeselect}
                        />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </AppLayout>
    );
}
