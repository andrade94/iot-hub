import { Can } from '@/components/Can';
import { CompletionDialog } from '@/components/work-orders/completion-dialog';
import { CreateWorkOrderDialog } from '@/components/work-orders/create-work-order-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DetailCard } from '@/components/ui/detail-card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, WorkOrder } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    Clock,
    MessageSquare,
    Pencil,
    Play,
    Send,
    Trash2,
    Upload,
    User,
    XCircle,
} from 'lucide-react';
import { useRef, useState } from 'react';

interface TechnicianOption {
    id: number;
    name: string;
}

interface Props {
    workOrder: WorkOrder & {
        status_duration?: string;
        is_overdue?: boolean;
        open_hours?: number;
    };
    technicians?: TechnicianOption[];
    statusTransitions?: Record<string, string | null>;
}

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

    const STATUS_MAP: Record<string, string> = { assign: 'assigned', start: 'in_progress', cancel: 'cancelled' };

    function updateStatus(action: string) {
        router.put(`/work-orders/${wo.id}/status`, { status: STATUS_MAP[action] ?? action }, { preserveScroll: true });
    }

    function confirmCancelWO() {
        router.put(`/work-orders/${wo.id}/status`, { status: 'cancelled' }, {
            preserveScroll: true,
            onSuccess: () => setConfirmCancel(false),
        });
    }

    function deleteWO() {
        router.delete(`/work-orders/${wo.id}`, {
            onSuccess: () => setConfirmDelete(false),
        });
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
            onSuccess: () => {
                setShowAssign(false);
                setAssignTechId('');
            },
        });
    }

    function submitNote(e: React.FormEvent) {
        e.preventDefault();
        if (!noteForm.data.note.trim()) return;
        noteForm.post(`/work-orders/${wo.id}/notes`, { preserveScroll: true, onSuccess: () => noteForm.reset() });
    }

    const priorityVariants: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = { urgent: 'destructive', high: 'warning', medium: 'info', low: 'outline' };
    const statusVariants: Record<string, 'destructive' | 'warning' | 'success' | 'info' | 'outline'> = { open: 'destructive', assigned: 'warning', in_progress: 'info', completed: 'success', cancelled: 'outline' };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={wo.title} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between md:p-8">
                            <div className="flex items-start gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mt-1 shrink-0"
                                    onClick={() => router.get('/work-orders')}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div>
                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Work Order')}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                                        <h1 className="font-display text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                            {wo.title}
                                        </h1>
                                        <Badge variant={priorityVariants[wo.priority] ?? 'outline'}>
                                            {wo.priority}
                                        </Badge>
                                        <Badge variant={statusVariants[wo.status] ?? 'outline'}>
                                            {wo.status.replace('_', ' ')}
                                        </Badge>
                                        {wo.is_overdue && (
                                            <Badge variant="destructive" className="font-semibold">
                                                <Clock className="mr-1 h-3 w-3" /> {t('SLA overdue')}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        <span className="font-mono tabular-nums">#{wo.id}</span>
                                        {' '}&middot; {wo.site?.name} &middot; {t('Created')}{' '}
                                        <span className="font-mono tabular-nums">
                                            {new Date(wo.created_at).toLocaleDateString()}
                                        </span>
                                        {wo.status_duration && (
                                            <>
                                                {' '}&middot; <span className={wo.is_overdue ? 'font-semibold text-rose-500' : ''}>
                                                    {wo.status.replace('_', ' ')} {wo.status_duration}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Status actions */}
                            <div className="flex flex-wrap shrink-0 gap-2">
                                {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                    <Can permission="manage work orders">
                                        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} title={t('Edit work order')}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            {t('Edit')}
                                        </Button>
                                    </Can>
                                )}
                                {(wo.status === 'open' || wo.status === 'assigned') && (
                                    <Can permission="manage work orders">
                                        <Button variant="outline" onClick={() => setShowAssign(true)}>
                                            <User className="mr-2 h-4 w-4" />
                                            {wo.status === 'assigned' ? t('Reassign') : t('Assign')}
                                        </Button>
                                    </Can>
                                )}
                                {wo.status === 'assigned' && (
                                    <Can permission="complete work orders">
                                        <Button onClick={() => updateStatus('start')}>
                                            <Play className="mr-2 h-4 w-4" />{t('Start')}
                                        </Button>
                                    </Can>
                                )}
                                {wo.status === 'in_progress' && (
                                    <Can permission="complete work orders">
                                        <Button onClick={() => setShowComplete(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                            <CheckCircle2 className="mr-2 h-4 w-4" />{t('Complete')}
                                        </Button>
                                    </Can>
                                )}
                                {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                    <Can permission="manage work orders">
                                        <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
                                            <XCircle className="mr-2 h-4 w-4" />{t('Cancel')}
                                        </Button>
                                    </Can>
                                )}
                                <Can permission="manage work orders">
                                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-muted-foreground hover:text-rose-500" title={t('Delete work order')}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </Can>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* Status flow visualization */}
                <FadeIn delay={50} duration={400}>
                    <StatusFlow
                        status={wo.status}
                        statusDuration={wo.status_duration}
                        isOverdue={wo.is_overdue ?? false}
                        transitions={statusTransitions}
                        t={t}
                    />
                </FadeIn>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        {/* ── DETAILS ─────────────────────────────── */}
                        <FadeIn delay={60} duration={400}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Details')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <DetailCard
                                    className="shadow-elevation-1"
                                    items={[
                                        { label: t('Type'), value: wo.type.replace('_', ' ') },
                                        {
                                            label: t('Device'),
                                            value: wo.device ? (
                                                <button
                                                    type="button"
                                                    onClick={() => router.get(`/devices/${wo.device!.id}`)}
                                                    className="text-primary hover:underline"
                                                >
                                                    {wo.device.name} &rarr;
                                                </button>
                                            ) : '—',
                                        },
                                        { label: t('Assigned To'), value: wo.assigned_user?.name ?? t('Unassigned') },
                                        { label: t('Created By'), value: wo.created_by_user?.name ?? '—' },
                                    ]}
                                />
                                {wo.description && (
                                    <Card className="shadow-elevation-1">
                                        <CardContent className="p-6">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {wo.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Linked Alert Card */}
                                {wo.alert && (
                                    <Card
                                        className="shadow-elevation-1 cursor-pointer transition-colors hover:bg-muted/30"
                                        onClick={() => router.get(`/alerts/${wo.alert!.id}`)}
                                    >
                                        <CardContent className="flex items-center gap-3 p-4">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-lg text-rose-500">
                                                !
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-medium">
                                                    {t('Linked Alert')} &middot; #{wo.alert.id}
                                                </p>
                                                <p className="font-mono text-[10px] text-muted-foreground/70">
                                                    {wo.alert.severity} &middot; {wo.alert.status}
                                                </p>
                                            </div>
                                            <Badge variant={wo.alert.status === 'active' ? 'destructive' : wo.alert.status === 'acknowledged' ? 'warning' : 'success'}>
                                                {wo.alert.status}
                                            </Badge>
                                            <span className="text-muted-foreground">&rarr;</span>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </FadeIn>

                        {/* ── PHOTOS ──────────────────────────────── */}
                        <FadeIn delay={120} duration={400}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        <Camera className="mr-1.5 inline-block h-3.5 w-3.5 align-[-0.125em]" />
                                        {t('Photos')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                    {wo.photos && wo.photos.length > 0 && (
                                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                            {wo.photos.length}
                                        </span>
                                    )}
                                </div>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="space-y-4 p-6">
                                        {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                            <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-3">
                                                <Input
                                                    value={photoCaption}
                                                    onChange={(e) => setPhotoCaption(e.target.value)}
                                                    placeholder={t('Caption (optional)')}
                                                    className="flex-1 min-w-[180px] text-[11px]"
                                                    maxLength={255}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => photoInputRef.current?.click()}
                                                >
                                                    <Upload className="mr-1.5 h-3.5 w-3.5" />{t('Choose photo')}
                                                </Button>
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
                                            </div>
                                        )}
                                        {!wo.photos || wo.photos.length === 0 ? (
                                            <p className="py-4 text-center text-sm text-muted-foreground">
                                                {t('No photos yet')}
                                            </p>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                {wo.photos.map((photo) => (
                                                    <div
                                                        key={photo.id}
                                                        className="group relative overflow-hidden rounded-lg border"
                                                    >
                                                        <img
                                                            src={`/storage/${photo.photo_path}`}
                                                            alt={photo.caption ?? ''}
                                                            className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                        />
                                                        {photo.caption && (
                                                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5">
                                                                <p className="truncate text-xs text-white">
                                                                    {photo.caption}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </FadeIn>

                        {/* ── NOTES ───────────────────────────────── */}
                        <FadeIn delay={180} duration={400}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        <MessageSquare className="mr-1.5 inline-block h-3.5 w-3.5 align-[-0.125em]" />
                                        {t('Notes')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                    {wo.notes && wo.notes.length > 0 && (
                                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                            {wo.notes.length}
                                        </span>
                                    )}
                                </div>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="space-y-4 p-6">
                                        {wo.notes && wo.notes.length > 0 && (
                                            <div className="space-y-3">
                                                {wo.notes.map((note) => (
                                                    <div
                                                        key={note.id}
                                                        className="rounded-lg border p-3"
                                                    >
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span className="font-medium text-foreground">
                                                                {note.user?.name ?? 'User'}
                                                            </span>
                                                            <span>&middot;</span>
                                                            <span
                                                                className="font-mono tabular-nums"
                                                                title={new Date(note.created_at).toLocaleString()}
                                                            >
                                                                {formatTimeAgo(note.created_at)}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-sm leading-relaxed">
                                                            {note.note}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                            <form onSubmit={submitNote} className="flex gap-2">
                                                <Input
                                                    placeholder={t('Add a note...')}
                                                    value={noteForm.data.note}
                                                    onChange={(e) => noteForm.setData('note', e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    type="submit"
                                                    size="icon"
                                                    disabled={noteForm.processing || !noteForm.data.note.trim()}
                                                >
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                            </form>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </FadeIn>
                    </div>

                    <div className="space-y-6">
                        {/* ── TIMELINE (Sidebar) ──────────────────────── */}
                        <FadeIn delay={240} duration={400}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Timeline')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-6">
                                        <div className="space-y-0">
                                            <TimelineEntry icon={<Clock className="h-3.5 w-3.5" />} label={t('Created')} time={wo.created_at} color="muted" isFirst />
                                            {wo.status !== 'open' && (
                                                <TimelineEntry
                                                    icon={<User className="h-3.5 w-3.5" />}
                                                    label={t('Assigned')}
                                                    time={statusTransitions.assigned ?? undefined}
                                                    color="warning"
                                                />
                                            )}
                                            {(wo.status === 'in_progress' || wo.status === 'completed') && (
                                                <TimelineEntry
                                                    icon={<Play className="h-3.5 w-3.5" />}
                                                    label={t('Started')}
                                                    time={statusTransitions.in_progress ?? undefined}
                                                    color="info"
                                                />
                                            )}
                                            {wo.status === 'completed' && (
                                                <TimelineEntry
                                                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                                    label={t('Completed')}
                                                    time={statusTransitions.completed ?? undefined}
                                                    color="success"
                                                    isLast
                                                />
                                            )}
                                            {wo.status === 'cancelled' && <TimelineEntry icon={<XCircle className="h-3.5 w-3.5" />} label={t('Cancelled')} color="muted" isLast />}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </FadeIn>

                        {/* ── SLA Warning ──────────────────────────── */}
                        {wo.is_overdue && (
                            <FadeIn delay={280} duration={400}>
                                <Card className="border-rose-500/25 bg-rose-500/[0.06] shadow-elevation-1">
                                    <CardContent className="p-4">
                                        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rose-500">
                                            &#9888; {t('SLA Overdue')}
                                        </p>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {t('Open for')} <strong className="text-rose-500">{wo.status_duration}</strong> {t('without completion.')}{' '}
                                            {wo.priority === 'urgent' && t('Urgent WOs should be resolved within 2 hours.')}
                                            {wo.priority === 'high' && t('High-priority WOs should be resolved within 4 hours.')}
                                            {wo.priority === 'medium' && t('Medium-priority WOs should be resolved within 24 hours.')}
                                        </p>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        )}
                    </div>
                </div>
            </div>

            {/* Assign Technician Dialog */}
            <Dialog open={showAssign} onOpenChange={setShowAssign}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{wo.status === 'assigned' ? t('Reassign Work Order') : t('Assign Work Order')}</DialogTitle>
                        <DialogDescription>
                            {t('Select a technician to handle this task.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Label className="text-[11px]">{t('Technician')}</Label>
                        <Select value={assignTechId} onValueChange={setAssignTechId}>
                            <SelectTrigger><SelectValue placeholder={t('Select a technician')} /></SelectTrigger>
                            <SelectContent>
                                {technicians.length === 0 ? (
                                    <SelectItem value="__none" disabled>{t('No technicians available')}</SelectItem>
                                ) : (
                                    technicians.map((tech) => (
                                        <SelectItem key={tech.id} value={String(tech.id)}>{tech.name}</SelectItem>
                                    ))
                                )}
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
                        <Button onClick={submitAssign} disabled={!assignTechId}>
                            {t('Assign')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Work Order Dialog */}
            <CreateWorkOrderDialog
                open={showEdit}
                onOpenChange={setShowEdit}
                mode="edit"
                workOrderId={wo.id}
                sites={[]}
                devices={[]}
                defaults={{
                    title: wo.title,
                    description: wo.description ?? '',
                    type: wo.type,
                    priority: wo.priority,
                }}
            />

            {/* Completion Dialog */}
            <CompletionDialog
                open={showComplete}
                onOpenChange={setShowComplete}
                workOrderId={wo.id}
                workOrderTitle={wo.title}
            />

            {/* Confirm cancel */}
            <ConfirmationDialog
                open={confirmCancel}
                onOpenChange={setConfirmCancel}
                title={t('Cancel this work order?')}
                description={t('This will mark the work order as cancelled and stop any further action on it.')}
                warningMessage={t('Cancelled work orders are terminal and cannot be reopened.')}
                actionLabel={t('Cancel Work Order')}
                onConfirm={confirmCancelWO}
            />

            {/* Confirm delete */}
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

/* ── TimelineEntry ────────────────────────────────────────────── */

function TimelineEntry({ icon, label, time, color, isFirst, isLast }: { icon: React.ReactNode; label: string; time?: string; color: string; isFirst?: boolean; isLast?: boolean }) {
    const colors: Record<string, string> = { success: 'bg-emerald-500 text-white', warning: 'bg-amber-500 text-white', info: 'bg-blue-500 text-white', muted: 'bg-muted text-muted-foreground border' };
    return (
        <div className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && <div className="absolute left-[13px] top-7 h-full w-px bg-border" />}
            <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors[color] ?? colors.muted}`}>{icon}</div>
            <div>
                <p className="text-sm font-medium">{label}</p>
                {time && (
                    <p
                        className="font-mono text-xs tabular-nums text-muted-foreground"
                        title={new Date(time).toLocaleString()}
                    >
                        {formatTimeAgo(time)}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ── Skeleton ─────────────────────────────────────────────────── */

export function WorkOrderShowSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-64" />
                <Skeleton className="mt-2 h-4 w-48" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-6">
                    {/* Details section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-3 w-16" />
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card>
                            <CardContent className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="rounded-lg border p-3">
                                        <Skeleton className="h-2.5 w-12" />
                                        <Skeleton className="mt-2 h-4 w-20" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Photos section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-3 w-14" />
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Notes section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-3 w-12" />
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card>
                            <CardContent className="space-y-3 p-6">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="rounded-lg border p-3">
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-3 w-8" />
                                        </div>
                                        <Skeleton className="mt-2 h-4 w-full" />
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <Skeleton className="h-9 flex-1 rounded-md" />
                                    <Skeleton className="h-9 w-9 rounded-md" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Timeline sidebar */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-16" />
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    <Card>
                        <CardContent className="space-y-4 p-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-7 w-7 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-3 w-12" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

/* ── Status Flow ────────────────────────────────────────────── */

function StatusFlow({ status, statusDuration, isOverdue, transitions, t }: {
    status: string;
    statusDuration?: string;
    isOverdue: boolean;
    transitions: Record<string, string | null>;
    t: (key: string) => string;
}) {
    const steps = [
        { key: 'open', label: t('Open'), icon: '1' },
        { key: 'assigned', label: t('Assigned'), icon: '2' },
        { key: 'in_progress', label: t('In Progress'), icon: '3' },
        { key: 'completed', label: t('Completed'), icon: '4' },
    ];

    const currentIdx = (() => {
        if (status === 'cancelled') return -1;
        if (status === 'completed') return 3;
        if (status === 'in_progress') return 2;
        if (status === 'assigned') return 1;
        return 0;
    })();

    return (
        <Card className="shadow-elevation-1">
            <CardContent className="flex items-center gap-0 p-4">
                {steps.map((step, i) => {
                    const isDone = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    const transitionAt = transitions[step.key];
                    return (
                        <div key={step.key} className="flex flex-1 items-center gap-2 text-[11px]">
                            <div className="flex flex-1 items-center gap-2">
                                <div
                                    className={`flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] font-mono text-[10px] font-semibold ${
                                        isDone
                                            ? 'border-emerald-500 bg-emerald-500 text-background'
                                            : isCurrent
                                              ? isOverdue
                                                ? 'border-rose-500 text-rose-500'
                                                : 'border-amber-500 text-amber-500'
                                              : 'border-border text-muted-foreground/50'
                                    }`}
                                >
                                    {isDone ? '\u2713' : step.icon}
                                </div>
                                <div>
                                    <div
                                        className={
                                            isDone
                                                ? 'text-emerald-500'
                                                : isCurrent
                                                  ? isOverdue
                                                    ? 'font-semibold text-rose-500'
                                                    : 'font-semibold text-amber-500'
                                                  : 'text-muted-foreground/50'
                                        }
                                    >
                                        {step.label}
                                    </div>
                                    {transitionAt && (isDone || isCurrent) && (
                                        <div
                                            className={`font-mono text-[9px] ${isCurrent && isOverdue ? 'font-semibold text-rose-500' : 'text-muted-foreground/60'}`}
                                            title={new Date(transitionAt).toLocaleString()}
                                        >
                                            {formatTimeAgo(transitionAt)}
                                        </div>
                                    )}
                                    {isCurrent && statusDuration && (
                                        <div className={`font-mono text-[9px] ${isOverdue ? 'font-semibold text-rose-500' : 'text-muted-foreground/70'}`}>
                                            {isOverdue && '\u26a0 '}
                                            {t('in state for')} {statusDuration}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {i < steps.length - 1 && (
                                <div className="px-2 text-base text-muted-foreground/30">&rarr;</div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
