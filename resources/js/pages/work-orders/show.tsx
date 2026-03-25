import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DetailCard } from '@/components/ui/detail-card';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
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
    Play,
    Send,
    Upload,
    User,
    XCircle,
} from 'lucide-react';

interface Props {
    workOrder: WorkOrder;
}

export default function WorkOrderShow({ workOrder: wo }: Props) {
    const { t } = useLang();
    const noteForm = useForm({ note: '' });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Work Orders', href: '/work-orders' },
        { title: wo.title, href: '#' },
    ];

    const STATUS_MAP: Record<string, string> = { assign: 'assigned', start: 'in_progress', complete: 'completed', cancel: 'cancelled' };

    function updateStatus(action: string) {
        router.put(`/work-orders/${wo.id}/status`, { status: STATUS_MAP[action] ?? action }, { preserveScroll: true });
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
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        <span className="font-mono tabular-nums">#{wo.id}</span>
                                        {' '}&middot; {wo.site?.name} &middot; {t('Created')}{' '}
                                        <span className="font-mono tabular-nums">
                                            {new Date(wo.created_at).toLocaleDateString()}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Status actions */}
                            <div className="flex shrink-0 gap-2">
                                {wo.status === 'open' && (
                                    <Can permission="manage work orders">
                                        <Button variant="outline" onClick={() => updateStatus('assign')}>
                                            <User className="mr-2 h-4 w-4" />{t('Assign')}
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
                                        <Button onClick={() => updateStatus('complete')}>
                                            <CheckCircle2 className="mr-2 h-4 w-4" />{t('Complete')}
                                        </Button>
                                    </Can>
                                )}
                                {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                    <Can permission="manage work orders">
                                        <Button variant="ghost" onClick={() => updateStatus('cancel')}>
                                            <XCircle className="mr-2 h-4 w-4" />{t('Cancel')}
                                        </Button>
                                    </Can>
                                )}
                            </div>
                        </div>
                    </div>
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
                                        { label: t('Device'), value: wo.device?.name ?? '—' },
                                        { label: t('Assigned To'), value: wo.assigned_user?.name ?? t('Unassigned') },
                                        { label: t('Created By'), value: wo.created_by_user?.name ?? '—' },
                                        ...(wo.alert ? [{ label: t('Linked Alert'), value: <span className="font-mono tabular-nums">#{wo.alert.id}</span> }] : []),
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
                                    {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                        <Button variant="outline" size="sm" onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0];
                                                if (file) {
                                                    const formData = new FormData();
                                                    formData.append('photo', file);
                                                    router.post(`/work-orders/${wo.id}/photos`, formData as Record<string, unknown>, { preserveScroll: true });
                                                }
                                            };
                                            input.click();
                                        }}>
                                            <Upload className="mr-1.5 h-3.5 w-3.5" />{t('Upload')}
                                        </Button>
                                    )}
                                </div>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-6">
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
                                        {wo.status !== 'open' && <TimelineEntry icon={<User className="h-3.5 w-3.5" />} label={t('Assigned')} color="warning" />}
                                        {(wo.status === 'in_progress' || wo.status === 'completed') && <TimelineEntry icon={<Play className="h-3.5 w-3.5" />} label={t('Started')} color="info" />}
                                        {wo.status === 'completed' && <TimelineEntry icon={<CheckCircle2 className="h-3.5 w-3.5" />} label={t('Completed')} color="success" isLast />}
                                        {wo.status === 'cancelled' && <TimelineEntry icon={<XCircle className="h-3.5 w-3.5" />} label={t('Cancelled')} color="muted" isLast />}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </FadeIn>
                </div>
            </div>
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
