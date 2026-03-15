import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, WorkOrder } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Camera, CheckCircle2, Clock, MessageSquare, Play, Send, Upload, User, XCircle } from 'lucide-react';

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

    function updateStatus(action: string) {
        router.put(`/work-orders/${wo.id}/status`, { action }, { preserveScroll: true });
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
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.get('/work-orders')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{wo.title}</h1>
                            <Badge variant={priorityVariants[wo.priority] ?? 'outline'}>{wo.priority}</Badge>
                            <Badge variant={statusVariants[wo.status] ?? 'outline'}>{wo.status.replace('_', ' ')}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            #{wo.id} · {wo.site?.name} · {t('Created')} {new Date(wo.created_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Status actions */}
                    <div className="flex gap-2">
                        {wo.status === 'open' && (
                            <Button variant="outline" onClick={() => updateStatus('assign')}>
                                <User className="mr-2 h-4 w-4" />{t('Assign')}
                            </Button>
                        )}
                        {wo.status === 'assigned' && (
                            <Button onClick={() => updateStatus('start')}>
                                <Play className="mr-2 h-4 w-4" />{t('Start')}
                            </Button>
                        )}
                        {wo.status === 'in_progress' && (
                            <Button onClick={() => updateStatus('complete')}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />{t('Complete')}
                            </Button>
                        )}
                        {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                            <Button variant="ghost" onClick={() => updateStatus('cancel')}>
                                <XCircle className="mr-2 h-4 w-4" />{t('Cancel')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        {/* Info card */}
                        <Card>
                            <CardHeader><CardTitle className="text-base">{t('Details')}</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <InfoBlock label={t('Type')} value={wo.type.replace('_', ' ')} />
                                <InfoBlock label={t('Device')} value={wo.device?.name ?? '—'} />
                                <InfoBlock label={t('Assigned To')} value={wo.assigned_user?.name ?? t('Unassigned')} />
                                <InfoBlock label={t('Created By')} value={wo.created_by_user?.name ?? '—'} />
                                {wo.alert && <InfoBlock label={t('Linked Alert')} value={`#${wo.alert.id}`} />}
                            </CardContent>
                            {wo.description && (
                                <CardContent className="border-t pt-4">
                                    <p className="text-sm text-muted-foreground">{wo.description}</p>
                                </CardContent>
                            )}
                        </Card>

                        {/* Photos */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Camera className="h-4 w-4" />{t('Photos')}
                                    </CardTitle>
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
                            </CardHeader>
                            <CardContent>
                                {!wo.photos || wo.photos.length === 0 ? (
                                    <p className="py-4 text-center text-sm text-muted-foreground">{t('No photos yet')}</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {wo.photos.map((photo) => (
                                            <div key={photo.id} className="group relative overflow-hidden rounded-lg border">
                                                <img src={`/storage/${photo.photo_path}`} alt={photo.caption ?? ''} className="aspect-square w-full object-cover" />
                                                {photo.caption && (
                                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5">
                                                        <p className="text-xs text-white truncate">{photo.caption}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Notes */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MessageSquare className="h-4 w-4" />{t('Notes')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {wo.notes && wo.notes.length > 0 && (
                                    <div className="space-y-3">
                                        {wo.notes.map((note) => (
                                            <div key={note.id} className="rounded-lg border p-3">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground">{note.user?.name ?? 'User'}</span>
                                                    <span>·</span>
                                                    <span>{new Date(note.created_at).toLocaleString()}</span>
                                                </div>
                                                <p className="mt-1 text-sm">{note.note}</p>
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
                                        <Button type="submit" size="icon" disabled={noteForm.processing || !noteForm.data.note.trim()}>
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar: Timeline */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">{t('Timeline')}</CardTitle></CardHeader>
                        <CardContent>
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
            </div>
        </AppLayout>
    );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium">{value}</p>
        </div>
    );
}

function TimelineEntry({ icon, label, time, color, isFirst, isLast }: { icon: React.ReactNode; label: string; time?: string; color: string; isFirst?: boolean; isLast?: boolean }) {
    const colors: Record<string, string> = { success: 'bg-emerald-500 text-white', warning: 'bg-amber-500 text-white', info: 'bg-blue-500 text-white', muted: 'bg-muted text-muted-foreground border' };
    return (
        <div className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && <div className="absolute left-[13px] top-7 h-full w-px bg-border" />}
            <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors[color] ?? colors.muted}`}>{icon}</div>
            <div>
                <p className="text-sm font-medium">{label}</p>
                {time && <p className="text-xs text-muted-foreground">{new Date(time).toLocaleString()}</p>}
            </div>
        </div>
    );
}
