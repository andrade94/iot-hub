import { Can } from '@/components/Can';
import { CompletionDialog } from '@/components/work-orders/completion-dialog';
import { CreateWorkOrderDialog } from '@/components/work-orders/create-work-order-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, WorkOrder } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Camera,
    CheckCircle2,
    Clock,
    FileText,
    ImagePlus,
    MessageSquare,
    Pencil,
    Play,
    Send,
    Trash2,
    Upload,
    User,
    XCircle,
} from 'lucide-react';
import { type ReactNode, useMemo, useRef, useState } from 'react';

/* ── Types ──────────────────────────────────────────────────── */

interface TechnicianOption {
    id: number;
    name: string;
}

interface Props {
    workOrder: WorkOrder & {
        status_duration?: string;
        is_overdue?: boolean;
        open_hours?: number;
        corrective_actions?: Array<{ id: number; description: string }>;
    };
    technicians?: TechnicianOption[];
    statusTransitions?: Record<string, string | null>;
}

/* ── Helpers ────────────────────────────────────────────────── */

const PRIORITY_STYLE: Record<string, string> = {
    urgent: 'bg-rose-500/15 text-rose-500 border-rose-500/25',
    high: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
    medium: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/25',
    low: 'bg-muted text-muted-foreground border-border',
};

const STATUS_STYLE: Record<string, string> = {
    open: 'bg-muted/50 text-muted-foreground border-border',
    assigned: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
    in_progress: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/25',
    completed: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
    cancelled: 'bg-muted/50 text-muted-foreground/60 border-border',
};

const SLA_HOURS: Record<string, number> = { urgent: 2, high: 4, medium: 24, low: 72 };

function translateStatus(status: string, t: (k: string) => string): string {
    const map: Record<string, string> = {
        open: t('Open'),
        assigned: t('Assigned'),
        in_progress: t('In Progress'),
        completed: t('Completed'),
        cancelled: t('Cancelled'),
    };
    return map[status] ?? status;
}

function translatePriority(priority: string, t: (k: string) => string): string {
    const map: Record<string, string> = {
        urgent: t('Urgent'),
        high: t('High'),
        medium: t('Medium'),
        low: t('Low'),
    };
    return map[priority] ?? priority;
}

function translateType(type: string, t: (k: string) => string): string {
    const map: Record<string, string> = {
        battery_replace: t('Battery replace'),
        sensor_replace: t('Sensor replace'),
        maintenance: t('Maintenance'),
        inspection: t('Inspection'),
        install: t('Install'),
    };
    return map[type] ?? type;
}

/* ── Feed item types for the unified activity stream ────────── */

interface FeedEntry {
    id: string;
    type: 'status' | 'note' | 'photo' | 'sla_warning';
    timestamp: string;
    actor?: string;
    status?: string;
    note?: string;
    photoPath?: string;
    photoCaption?: string | null;
}

function buildFeed(
    wo: Props['workOrder'],
    transitions: Record<string, string | null>,
): FeedEntry[] {
    const entries: FeedEntry[] = [];

    // Status transitions
    if (transitions.open) {
        entries.push({
            id: 'status-open',
            type: 'status',
            timestamp: transitions.open,
            actor: wo.created_by_user?.name,
            status: 'open',
        });
    }
    if (transitions.assigned) {
        entries.push({
            id: 'status-assigned',
            type: 'status',
            timestamp: transitions.assigned,
            actor: wo.assigned_user?.name,
            status: 'assigned',
        });
    }
    if (transitions.in_progress) {
        entries.push({
            id: 'status-started',
            type: 'status',
            timestamp: transitions.in_progress,
            actor: wo.assigned_user?.name,
            status: 'in_progress',
        });
    }
    if (transitions.completed) {
        entries.push({
            id: 'status-completed',
            type: 'status',
            timestamp: transitions.completed,
            actor: wo.assigned_user?.name,
            status: 'completed',
        });
    }

    // Notes
    wo.notes?.forEach((note) => {
        entries.push({
            id: `note-${note.id}`,
            type: 'note',
            timestamp: note.created_at,
            actor: note.user?.name ?? 'User',
            note: note.note,
        });
    });

    // Photos
    wo.photos?.forEach((photo) => {
        entries.push({
            id: `photo-${photo.id}`,
            type: 'photo',
            timestamp: photo.uploaded_at ?? wo.created_at,
            actor: undefined,
            photoPath: photo.photo_path,
            photoCaption: photo.caption,
        });
    });

    // SLA warning (inject if overdue)
    if (wo.is_overdue) {
        const slaHours = SLA_HOURS[wo.priority] ?? 24;
        const slaBreachTime = new Date(new Date(wo.created_at).getTime() + slaHours * 3600 * 1000).toISOString();
        entries.push({
            id: 'sla-warning',
            type: 'sla_warning',
            timestamp: slaBreachTime,
        });
    }

    // Sort chronologically, newest first
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return entries;
}

/* ── Main Component ─────────────────────────────────────────── */

export default function WorkOrderShow({ workOrder: wo, technicians = [], statusTransitions = {} }: Props) {
    const { t } = useLang();
    const noteForm = useForm({ note: '' });
    const [showAssign, setShowAssign] = useState(false);
    const [assignTechId, setAssignTechId] = useState<string>('');
    const [showEdit, setShowEdit] = useState(false);
    const [showComplete, setShowComplete] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [photoCaption, setPhotoCaption] = useState('');
    const photoInputRef = useRef<HTMLInputElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Work Orders', href: '/work-orders' },
        { title: wo.title, href: '#' },
    ];

    const isTerminal = wo.status === 'completed' || wo.status === 'cancelled';
    const isActionable = wo.status === 'open' || wo.status === 'assigned' || wo.status === 'in_progress';

    const feed = useMemo(() => buildFeed(wo, statusTransitions), [wo, statusTransitions]);

    function updateStatus(action: string) {
        const STATUS_MAP: Record<string, string> = { assign: 'assigned', start: 'in_progress', cancel: 'cancelled' };
        router.put(`/work-orders/${wo.id}/status`, { status: STATUS_MAP[action] ?? action }, { preserveScroll: true });
    }

    function confirmCancelWO() {
        router.put(`/work-orders/${wo.id}/status`, { status: 'cancelled' }, {
            preserveScroll: true,
            onSuccess: () => setConfirmCancel(false),
        });
    }

    function deleteWO() {
        router.delete(`/work-orders/${wo.id}`, { onSuccess: () => setConfirmDelete(false) });
    }

    function uploadPhoto(file: File) {
        const payload: Record<string, File | string> = { photo: file };
        if (photoCaption.trim()) payload.caption = photoCaption.trim();
        router.post(`/work-orders/${wo.id}/photos`, payload, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setPhotoCaption('');
                if (photoInputRef.current) photoInputRef.current.value = '';
            },
        });
    }

    function submitAssign() {
        if (!assignTechId) return;
        router.put(`/work-orders/${wo.id}/status`, {
            status: 'assigned',
            assigned_to: Number(assignTechId),
        }, {
            preserveScroll: true,
            onSuccess: () => { setShowAssign(false); setAssignTechId(''); },
        });
    }

    function submitNote(e: React.FormEvent) {
        e.preventDefault();
        if (!noteForm.data.note.trim()) return;
        noteForm.post(`/work-orders/${wo.id}/notes`, { preserveScroll: true, onSuccess: () => noteForm.reset() });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={wo.title} />
            <div className="mx-auto flex h-full w-full max-w-[900px] flex-1 flex-col gap-5 p-4 md:p-6">

                {/* ── Hero ───────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div
                        className={cn(
                            'relative overflow-hidden rounded-xl border bg-card shadow-elevation-1',
                            wo.is_overdue ? 'border-l-4 border-l-rose-500 border-border/50' : 'border-border/50',
                            isTerminal && 'opacity-80',
                        )}
                    >
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
                            <div className="min-w-0 flex-1">
                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Work Order')} #{wo.id}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.35rem] font-bold leading-tight tracking-tight md:text-[1.75rem]">
                                    {wo.title}
                                </h1>
                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    <span className={cn('inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider', PRIORITY_STYLE[wo.priority])}>
                                        {translatePriority(wo.priority, t)}
                                    </span>
                                    <span className={cn('inline-flex items-center rounded border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider', STATUS_STYLE[wo.status])}>
                                        {translateStatus(wo.status, t)}
                                    </span>
                                    <span className="inline-flex items-center rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                                        {translateType(wo.type, t)}
                                    </span>
                                    {wo.is_overdue && (
                                        <span className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-rose-500">
                                            <Clock className="h-2.5 w-2.5" />
                                            {t('SLA overdue')}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2.5 font-mono text-[11px] text-muted-foreground">
                                    {wo.site?.name}
                                    <span className="mx-1.5 text-border">·</span>
                                    {t('Created')} {new Date(wo.created_at).toLocaleDateString()}
                                    {wo.status_duration && (
                                        <>
                                            <span className="mx-1.5 text-border">·</span>
                                            <span className={wo.is_overdue ? 'font-semibold text-rose-500' : ''}>
                                                {translateStatus(wo.status, t).toLowerCase()} {wo.status_duration}
                                                {wo.is_overdue && ` · SLA ${SLA_HOURS[wo.priority] ?? 24}h`}
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* Actions — state-aware */}
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                {isActionable && (
                                    <Can permission="manage work orders">
                                        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
                                            <Pencil className="mr-1.5 h-3 w-3" />{t('Edit')}
                                        </Button>
                                    </Can>
                                )}
                                {(wo.status === 'open' || wo.status === 'assigned') && (
                                    <Can permission="manage work orders">
                                        <Button variant="outline" size="sm" onClick={() => setShowAssign(true)}>
                                            <User className="mr-1.5 h-3 w-3" />
                                            {wo.status === 'assigned' ? t('Reassign') : t('Assign')}
                                        </Button>
                                    </Can>
                                )}
                                {wo.status === 'assigned' && (
                                    <Can permission="complete work orders">
                                        <Button size="sm" onClick={() => updateStatus('start')}>
                                            <Play className="mr-1.5 h-3 w-3" />{t('Start')}
                                        </Button>
                                    </Can>
                                )}
                                {wo.status === 'in_progress' && (
                                    <Can permission="complete work orders">
                                        <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setShowComplete(true)}>
                                            <CheckCircle2 className="mr-1.5 h-3 w-3" />{t('Complete')}
                                        </Button>
                                    </Can>
                                )}
                                {isActionable && (
                                    <Can permission="manage work orders">
                                        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirmCancel(true)}>
                                            <XCircle className="mr-1.5 h-3 w-3" />{t('Cancel')}
                                        </Button>
                                    </Can>
                                )}
                                <Can permission="manage work orders">
                                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-rose-500" onClick={() => setConfirmDelete(true)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </Can>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Description ────────────────────────────────── */}
                {wo.description && (
                    <FadeIn delay={50} duration={400}>
                        <Card className="border-l-[3px] border-l-cyan-500 shadow-elevation-1">
                            <CardContent className="p-5">
                                <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Work instructions')}
                                </p>
                                <p className="text-[13px] leading-relaxed text-muted-foreground">
                                    {wo.description}
                                </p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* ── Metadata strip ─────────────────────────────── */}
                <FadeIn delay={100} duration={400}>
                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
                        <MetaCell label={t('Type')} value={translateType(wo.type, t)} />
                        <MetaCell label={t('Priority')} value={translatePriority(wo.priority, t)} tone={wo.priority} />
                        <MetaCell
                            label={t('Device')}
                            value={
                                wo.device ? (
                                    <Link href={`/devices/${wo.device.id}`} className="text-cyan-500 hover:underline">
                                        {wo.device.name} →
                                    </Link>
                                ) : '—'
                            }
                        />
                        <MetaCell label={t('Site')} value={wo.site?.name ?? '—'} />
                        <MetaCell label={t('Assigned To')} value={wo.assigned_user?.name ?? t('Unassigned')} muted={!wo.assigned_user} />
                        <MetaCell label={t('Created By')} value={wo.created_by_user?.name ?? '—'} />
                    </div>
                </FadeIn>

                {/* ── Linked alert ───────────────────────────────── */}
                {wo.alert && (
                    <FadeIn delay={120} duration={400}>
                        <Link
                            href={`/alerts/${wo.alert.id}`}
                            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-elevation-1 transition-colors hover:bg-muted/30"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-base font-bold text-rose-500">
                                !
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-medium">
                                    {t('Linked Alert')} · #{wo.alert.id}
                                </p>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                    {wo.alert.severity} · {wo.alert.status}
                                </p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </Link>
                    </FadeIn>
                )}

                {/* ── Photos ─────────────────────────────────────── */}
                <FadeIn delay={140} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    <Camera className="mr-1.5 inline-block h-3 w-3 align-[-0.125em]" />
                                    {t('Photos')}
                                </p>
                                {wo.photos && wo.photos.length > 0 && (
                                    <span className="font-mono text-[9px] text-muted-foreground/60">{wo.photos.length}</span>
                                )}
                                <div className="h-px flex-1 bg-border/50" />
                            </div>

                            {wo.photos && wo.photos.length > 0 && (
                                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                                    {wo.photos.map((photo) => (
                                        <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                                            <img
                                                src={`/storage/${photo.photo_path}`}
                                                alt={photo.caption ?? ''}
                                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                            />
                                            {photo.caption && (
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
                                                    <p className="truncate text-[10px] text-white">{photo.caption}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isTerminal ? (
                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                                >
                                    <ImagePlus className="h-3.5 w-3.5" />
                                    {wo.photos && wo.photos.length > 0 ? t('Add another photo') : t('Add photo evidence')}
                                </button>
                            ) : (
                                (!wo.photos || wo.photos.length === 0) && (
                                    <p className="py-2 text-center text-[11px] text-muted-foreground">{t('No photos')}</p>
                                )
                            )}
                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadPhoto(file);
                                }}
                            />
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* ── Activity feed ──────────────────────────────── */}
                <FadeIn delay={180} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-5">
                            <div className="mb-4 flex items-center gap-2">
                                <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Activity')}
                                </p>
                                <span className="font-mono text-[9px] text-muted-foreground/60">
                                    {feed.length} {feed.length === 1 ? t('event') : t('events')}
                                </span>
                                <div className="h-px flex-1 bg-border/50" />
                            </div>

                            <div className="relative">
                                {/* Vertical line */}
                                <div className="absolute bottom-4 left-[14px] top-4 w-px bg-border/40" />

                                <div className="space-y-1">
                                    {feed.map((entry) => (
                                        <FeedItem key={entry.id} entry={entry} wo={wo} t={t} />
                                    ))}
                                </div>
                            </div>

                            {/* Note input */}
                            {!isTerminal && (
                                <form onSubmit={submitNote} className="mt-4 flex gap-2 border-t border-border/50 pt-4">
                                    <Input
                                        placeholder={t('Add a note...')}
                                        value={noteForm.data.note}
                                        onChange={(e) => noteForm.setData('note', e.target.value)}
                                        className="flex-1 text-xs"
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        disabled={noteForm.processing || !noteForm.data.note.trim()}
                                        className="shrink-0"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>

            {/* ── Dialogs ────────────────────────────────────── */}

            <Dialog open={showAssign} onOpenChange={setShowAssign}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{wo.status === 'assigned' ? t('Reassign Work Order') : t('Assign Work Order')}</DialogTitle>
                        <DialogDescription>{t('Select a technician to handle this task.')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Label className="text-[11px]">{t('Technician')}</Label>
                        <Select value={assignTechId} onValueChange={setAssignTechId}>
                            <SelectTrigger><SelectValue placeholder={t('Select a technician')} /></SelectTrigger>
                            <SelectContent>
                                {technicians.length === 0 ? (
                                    <SelectItem value="__none" disabled>{t('No technicians available')}</SelectItem>
                                ) : technicians.map((tech) => (
                                    <SelectItem key={tech.id} value={String(tech.id)}>{tech.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {wo.assigned_user && (
                            <p className="text-[11px] text-muted-foreground">
                                {t('Currently assigned to')}: <strong>{wo.assigned_user.name}</strong>
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssign(false)}>{t('Cancel')}</Button>
                        <Button onClick={submitAssign} disabled={!assignTechId}>{t('Assign')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CreateWorkOrderDialog
                open={showEdit}
                onOpenChange={setShowEdit}
                mode="edit"
                workOrderId={wo.id}
                sites={[]}
                devices={[]}
                defaults={{ title: wo.title, description: wo.description ?? '', type: wo.type, priority: wo.priority }}
            />

            <CompletionDialog
                open={showComplete}
                onOpenChange={setShowComplete}
                workOrderId={wo.id}
                workOrderTitle={wo.title}
            />

            <ConfirmationDialog
                open={confirmCancel}
                onOpenChange={setConfirmCancel}
                title={t('Cancel this work order?')}
                description={t('This will mark the work order as cancelled and stop any further action on it.')}
                warningMessage={t('Cancelled work orders are terminal and cannot be reopened.')}
                actionLabel={t('Cancel Work Order')}
                onConfirm={confirmCancelWO}
            />

            <ConfirmationDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={t('Delete this work order?')}
                description={t('The work order will be permanently removed along with its notes and photos.')}
                warningMessage={t('This action cannot be undone.')}
                actionLabel={t('Delete Permanently')}
                onConfirm={deleteWO}
            />
        </AppLayout>
    );
}

/* ── Metadata cell ──────────────────────────────────────────── */

function MetaCell({
    label,
    value,
    tone,
    muted: isMuted,
}: {
    label: string;
    value: ReactNode;
    tone?: string;
    muted?: boolean;
}) {
    const toneClass = tone === 'urgent' ? 'text-rose-500' : tone === 'high' ? 'text-amber-500' : tone === 'medium' ? 'text-cyan-500' : '';

    return (
        <div className="bg-card px-4 py-3">
            <p className="font-mono text-[8px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {label}
            </p>
            <p className={cn('mt-1 text-[13px] font-medium', isMuted ? 'text-muted-foreground' : toneClass || 'text-foreground')}>
                {value}
            </p>
        </div>
    );
}

/* ── Feed item ──────────────────────────────────────────────── */

function FeedItem({
    entry,
    wo,
    t,
}: {
    entry: FeedEntry;
    wo: Props['workOrder'];
    t: (k: string) => string;
}) {
    const dotStyle = {
        status: entry.status === 'open'
            ? 'bg-muted/50 text-muted-foreground border-border'
            : entry.status === 'assigned'
              ? 'bg-amber-500/15 text-amber-500 border-amber-500/25'
              : entry.status === 'in_progress'
                ? 'bg-cyan-500/15 text-cyan-500 border-cyan-500/25'
                : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
        note: 'bg-muted/50 text-muted-foreground border-border',
        photo: 'bg-violet-500/15 text-violet-500 border-violet-500/25',
        sla_warning: 'bg-rose-500/15 text-rose-500 border-rose-500/25',
    }[entry.type];

    const icon = {
        status: entry.status === 'open'
            ? <Clock className="h-3 w-3" />
            : entry.status === 'assigned'
              ? <User className="h-3 w-3" />
              : entry.status === 'in_progress'
                ? <Play className="h-3 w-3" />
                : <CheckCircle2 className="h-3 w-3" />,
        note: <MessageSquare className="h-3 w-3" />,
        photo: <Camera className="h-3 w-3" />,
        sla_warning: <AlertTriangle className="h-3 w-3" />,
    }[entry.type];

    const actionText = {
        status: {
            open: t('created the work order'),
            assigned: t('was assigned'),
            in_progress: t('started work'),
            completed: t('completed the work order'),
        }[entry.status ?? 'open'] ?? '',
        note: t('added a note'),
        photo: t('uploaded a photo'),
        sla_warning: '',
    }[entry.type];

    return (
        <div className="relative flex gap-3 py-2.5">
            <div className={cn('relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border', dotStyle)}>
                {icon}
            </div>
            <div className="min-w-0 flex-1 pt-1">
                {entry.type === 'sla_warning' ? (
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-3.5 py-2.5">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rose-500">
                            {t('SLA Overdue')}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            {t('Open for')} <strong className="text-rose-500">{wo.status_duration}</strong> {t('without completion.')}{' '}
                            {wo.priority === 'urgent' && t('Urgent WOs should be resolved within 2 hours.')}
                            {wo.priority === 'high' && t('High-priority WOs should be resolved within 4 hours.')}
                            {wo.priority === 'medium' && t('Medium-priority WOs should be resolved within 24 hours.')}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 text-[12px]">
                            {entry.actor && <span className="font-semibold">{entry.actor}</span>}
                            <span className="text-muted-foreground">{actionText}</span>
                            <span className="ml-auto font-mono text-[9px] text-muted-foreground/50">
                                {formatTimeAgo(entry.timestamp)}
                            </span>
                        </div>
                        {entry.type === 'note' && entry.note && (
                            <div className="mt-2 rounded-lg border border-border/50 bg-muted/20 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
                                {entry.note}
                            </div>
                        )}
                        {entry.type === 'photo' && entry.photoPath && (
                            <div className="mt-2">
                                <img
                                    src={`/storage/${entry.photoPath}`}
                                    alt={entry.photoCaption ?? ''}
                                    className="max-w-[200px] rounded-lg border border-border"
                                />
                                {entry.photoCaption && (
                                    <p className="mt-1 font-mono text-[9px] text-muted-foreground">"{entry.photoCaption}"</p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
