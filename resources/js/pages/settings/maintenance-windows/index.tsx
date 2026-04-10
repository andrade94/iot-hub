import { Can } from '@/components/Can';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TimeInput } from '@/components/ui/time-input';
import InputError from '@/components/input-error';
import { useValidatedForm } from '@/hooks/use-validated-form';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { maintenanceWindowSchema, type MaintenanceWindowFormData } from '@/utils/schemas';
import { Head, router } from '@inertiajs/react';
import { Clock, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { useState } from 'react';

interface SiteOption {
    id: number;
    name: string;
    zones: string[];
}

interface MaintenanceWindowRecord {
    id: number;
    site_id: number;
    zone: string | null;
    title: string;
    recurrence: string;
    day_of_week: number | null;
    start_time: string;
    duration_minutes: number;
    suppress_alerts: boolean;
    site?: { id: number; name: string; timezone: string };
    created_by_user?: { id: number; name: string };
}

interface Props {
    windows: MaintenanceWindowRecord[];
    sites: SiteOption[];
    filters?: { site_id: string | null };
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/organization' },
    { title: 'Maintenance Windows', href: '#' },
];

function renderWindowCard(
    w: MaintenanceWindowRecord,
    t: (key: string) => string,
    setEditWindow: (w: MaintenanceWindowRecord) => void,
    setDeleteWindow: (w: MaintenanceWindowRecord) => void,
) {
    return (
        <Card key={w.id} className="shadow-elevation-1">
            <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Wrench className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-medium">{w.title}</p>
                            {w.suppress_alerts && isWindowActiveNow(w) && (
                                <Badge variant="warning" className="text-xs">
                                    {t('Active now')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {w.site?.name}
                            {w.zone && <> &middot; {w.zone}</>}
                            {!w.zone && <> &middot; <span className="italic">{t('Entire site')}</span></>}
                        </p>
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                            {formatSchedule(w)} &middot; <span className="font-medium text-foreground">{w.duration_minutes}</span> {t('min')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Can permission="manage maintenance windows">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{t('Suppress')}</span>
                            <Switch
                                checked={w.suppress_alerts}
                                onCheckedChange={(checked) => {
                                    router.put(
                                        `/settings/maintenance-windows/${w.id}`,
                                        { ...w, suppress_alerts: checked, site_id: undefined } as Record<string, unknown>,
                                        { preserveScroll: true },
                                    );
                                }}
                            />
                        </div>
                    </Can>
                    <Can permission="manage maintenance windows">
                        <Button variant="ghost" size="icon" onClick={() => setEditWindow(w)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteWindow(w)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </Can>
                </div>
            </CardContent>
        </Card>
    );
}

export function MaintenanceWindowsSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="mt-3 h-8 w-44" />
                        <Skeleton className="mt-2 h-4 w-72" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                </div>
            </div>
            {/* Section Divider */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <div className="h-px flex-1 bg-border" />
                <Skeleton className="h-3 w-6" />
            </div>
            {/* Window items */}
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-3 w-28" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-5 w-9 rounded-full" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function MaintenanceWindowsIndex({ windows, sites, filters }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [editWindow, setEditWindow] = useState<MaintenanceWindowRecord | null>(null);
    const [deleteWindow, setDeleteWindow] = useState<MaintenanceWindowRecord | null>(null);
    const currentSiteId = filters?.site_id ?? '';

    function applySiteFilter(siteId: string) {
        router.get('/settings/maintenance-windows', siteId && siteId !== 'all' ? { site_id: siteId } : {}, { preserveState: true, replace: true });
    }

    // Group by site when no filter is active
    const groupedWindows = !currentSiteId
        ? windows.reduce<Record<string, { site: { id: number; name: string } | undefined; items: MaintenanceWindowRecord[] }>>((acc, w) => {
              const key = String(w.site_id);
              if (!acc[key]) acc[key] = { site: w.site, items: [] };
              acc[key].items.push(w);
              return acc;
          }, {})
        : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Maintenance Windows')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-center justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Maintenance Windows')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Scheduled Downtime')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Schedule downtime periods to suppress alerts during planned maintenance.')}
                                </p>
                            </div>
                            <Can permission="manage maintenance windows">
                                <Button onClick={() => setShowCreate(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('Add Window')}
                                </Button>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Site Filter ─────────────────────────────────── */}
                {sites.length > 1 && (
                    <FadeIn delay={60} duration={400}>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground">{t('Site')}:</span>
                            <Select value={currentSiteId || 'all'} onValueChange={applySiteFilter}>
                                <SelectTrigger className="h-8 w-[200px] text-[12px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All sites')}</SelectItem>
                                    {sites.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {currentSiteId && (
                                <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={() => applySiteFilter('all')}>
                                    {t('Clear')}
                                </Button>
                            )}
                        </div>
                    </FadeIn>
                )}

                {/* ── Content ─────────────────────────────────────── */}
                {windows.length === 0 ? (
                    <FadeIn delay={150} duration={500}>
                        <EmptyState
                            icon={Clock}
                            title={t('No maintenance windows')}
                            description={t('Schedule regular maintenance windows to prevent false alerts during planned downtime.')}
                            action={
                                <Can permission="manage maintenance windows">
                                    <Button onClick={() => setShowCreate(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Add Window')}
                                    </Button>
                                </Can>
                            }
                        />
                    </FadeIn>
                ) : groupedWindows ? (
                    <div className="space-y-6">
                        {Object.entries(groupedWindows).map(([siteId, group], groupIdx) => (
                            <FadeIn key={siteId} delay={75 + groupIdx * 40} duration={400}>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {group.site?.name ?? t('Unknown site')}
                                        </p>
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                            {group.items.length}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {group.items.map((w) => renderWindowCard(w, t, setEditWindow, setDeleteWindow))}
                                    </div>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                ) : (
                    <>
                        <FadeIn delay={75} duration={400}>
                            <div className="flex items-center gap-3">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Active Windows')}
                                </p>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {windows.length}
                                </span>
                            </div>
                        </FadeIn>
                        <div className="space-y-3">
                            {windows.map((w, index) => (
                                <FadeIn key={w.id} delay={150 + index * 50} duration={400}>
                                    {renderWindowCard(w, t, setEditWindow, setDeleteWindow)}
                                </FadeIn>
                            ))}
                        </div>
                    </>
                )}

                {/* Create Dialog */}
                <WindowFormDialog
                    open={showCreate}
                    onOpenChange={setShowCreate}
                    sites={sites}
                    title={t('Add Maintenance Window')}
                    description={t('Schedule a recurring or one-time maintenance window.')}
                />

                {/* Edit Dialog */}
                {editWindow && (
                    <WindowFormDialog
                        open={!!editWindow}
                        onOpenChange={(open) => !open && setEditWindow(null)}
                        sites={sites}
                        title={t('Edit Maintenance Window')}
                        description={t('Update the maintenance window schedule.')}
                        window={editWindow}
                    />
                )}

                {/* Delete Confirmation */}
                <ConfirmationDialog
                    open={!!deleteWindow}
                    onOpenChange={(open) => !open && setDeleteWindow(null)}
                    title={t('Delete Maintenance Window')}
                    description={t(`Are you sure you want to delete "${deleteWindow?.title}"? Alerts will no longer be suppressed during this period.`)}
                    warningMessage={t('This action cannot be undone.')}
                    onConfirm={() => {
                        if (deleteWindow) {
                            router.delete(`/settings/maintenance-windows/${deleteWindow.id}`, {
                                preserveScroll: true,
                                onSuccess: () => setDeleteWindow(null),
                            });
                        }
                    }}
                    actionLabel={t('Delete')}
                />
            </div>
        </AppLayout>
    );
}

/* ── Form Dialog ────────────────────────────────── */

function WindowFormDialog({
    open,
    onOpenChange,
    sites,
    title,
    description,
    window,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sites: SiteOption[];
    title: string;
    description: string;
    window?: MaintenanceWindowRecord;
}) {
    const { t } = useLang();

    const form = useValidatedForm<MaintenanceWindowFormData>(maintenanceWindowSchema, {
        site_id: window?.site_id?.toString() ?? '',
        zone: window?.zone ?? '',
        title: window?.title ?? '',
        recurrence: window?.recurrence ?? 'weekly',
        day_of_week: window?.day_of_week?.toString() ?? '',
        start_time: window?.start_time ?? '',
        duration_minutes: window?.duration_minutes?.toString() ?? '60',
        suppress_alerts: window?.suppress_alerts ?? true,
    });

    const selectedSite = sites.find((s) => s.id === Number(form.data.site_id));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (window) {
            form.put(`/settings/maintenance-windows/${window.id}`, {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
            });
        } else {
            form.post('/settings/maintenance-windows', {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    onOpenChange(false);
                },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Site */}
                    {!window && (
                        <div className="grid gap-2">
                            <Label>{t('Site')}</Label>
                            <Select value={form.data.site_id} onValueChange={(v) => form.setData('site_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select site')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {sites.map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.site_id} />
                        </div>
                    )}

                    {/* Zone */}
                    <div className="grid gap-2">
                        <Label>{t('Zone')} <span className="text-muted-foreground text-xs">({t('optional — leave empty for entire site')})</span></Label>
                        <Select value={form.data.zone || '__all__'} onValueChange={(v) => form.setData('zone', v === '__all__' ? '' : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Entire site')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">{t('Entire site')}</SelectItem>
                                {selectedSite?.zones.map((z) => (
                                    <SelectItem key={z} value={z}>
                                        {z}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Title */}
                    <div className="grid gap-2">
                        <Label>{t('Title')}</Label>
                        <Input
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            placeholder={t('e.g., Walk-in cooler cleaning')}
                        />
                        <InputError message={form.errors.title} />
                    </div>

                    {/* Recurrence + Day */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Recurrence')}</Label>
                            <Select value={form.data.recurrence} onValueChange={(v) => form.setData('recurrence', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="once">{t('Once')}</SelectItem>
                                    <SelectItem value="daily">{t('Daily')}</SelectItem>
                                    <SelectItem value="weekly">{t('Weekly')}</SelectItem>
                                    <SelectItem value="monthly">{t('Monthly (1st)')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {form.data.recurrence === 'weekly' && (
                            <div className="grid gap-2">
                                <Label>{t('Day of week')}</Label>
                                <Select value={form.data.day_of_week} onValueChange={(v) => form.setData('day_of_week', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select day')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAYS.map((day, i) => (
                                            <SelectItem key={i} value={i.toString()}>
                                                {t(day)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Start time + Duration */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Start time')}</Label>
                            <TimeInput
                                value={form.data.start_time || '00:00'}
                                onChange={(v) => form.setData('start_time', v)}
                            />
                            <div className="flex flex-wrap gap-1.5">
                                {['06:00', '08:00', '12:00', '14:00', '18:00', '22:00'].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => form.setData('start_time', preset)}
                                        className={`rounded-md border px-2 py-0.5 font-mono text-[10px] tabular-nums transition-colors ${
                                            form.data.start_time === preset
                                                ? 'border-primary/40 bg-primary/10 text-primary'
                                                : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                            <InputError message={form.errors.start_time} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Duration (minutes)')}</Label>
                            <Input
                                type="number"
                                min={15}
                                max={480}
                                value={form.data.duration_minutes}
                                onChange={(e) => form.setData('duration_minutes', e.target.value)}
                                className="font-mono tabular-nums"
                            />
                            <div className="flex flex-wrap gap-1.5">
                                {[30, 60, 120, 240, 480].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => form.setData('duration_minutes', String(preset))}
                                        className={`rounded-md border px-2 py-0.5 font-mono text-[10px] tabular-nums transition-colors ${
                                            Number(form.data.duration_minutes) === preset
                                                ? 'border-primary/40 bg-primary/10 text-primary'
                                                : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                        }`}
                                    >
                                        {preset < 60 ? `${preset}m` : `${preset / 60}h`}
                                    </button>
                                ))}
                            </div>
                            <InputError message={form.errors.duration_minutes} />
                        </div>
                    </div>

                    {/* Suppress toggle */}
                    <div className="flex items-center gap-3">
                        <Switch
                            id="suppress"
                            checked={form.data.suppress_alerts}
                            onCheckedChange={(v) => form.setData('suppress_alerts', v)}
                        />
                        <Label htmlFor="suppress">{t('Suppress alerts during this window')}</Label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? t('Saving...') : window ? t('Update') : t('Create')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* ── Helpers ─────────────────────────────────────── */

function formatSchedule(w: MaintenanceWindowRecord): string {
    const time = w.start_time.slice(0, 5);
    switch (w.recurrence) {
        case 'daily':
            return `Daily at ${time}`;
        case 'weekly':
            return `${DAYS[w.day_of_week ?? 0]}s at ${time}`;
        case 'monthly':
            return `Monthly (1st) at ${time}`;
        default:
            return `Once at ${time}`;
    }
}

function isWindowActiveNow(w: MaintenanceWindowRecord): boolean {
    const now = new Date();
    const [h, m] = w.start_time.split(':').map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + w.duration_minutes * 60000);

    if (now < start || now > end) return false;

    if (w.recurrence === 'weekly' && w.day_of_week !== null) {
        return now.getDay() === w.day_of_week;
    }

    return true;
}
