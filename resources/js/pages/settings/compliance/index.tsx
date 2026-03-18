import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CalendarCheck, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ComplianceEvent {
    id: number;
    site_id: number;
    type: string;
    title: string;
    description: string | null;
    due_date: string;
    status: string;
    completed_at: string | null;
    completed_by: string | null;
    site?: { id: number; name: string };
}

interface Props {
    events: Record<string, ComplianceEvent[]>;
    sites: { id: number; name: string }[];
    types: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Compliance', href: '#' },
];

const TYPE_BADGE_VARIANTS: Record<string, 'destructive' | 'warning' | 'info' | 'outline' | 'secondary'> = {
    cofepris_audit: 'destructive',
    certificate_renewal: 'warning',
    calibration: 'info',
    inspection: 'outline',
    permit_renewal: 'secondary',
};

const STATUS_BADGE_VARIANTS: Record<string, 'outline' | 'destructive' | 'success' | 'secondary'> = {
    upcoming: 'outline',
    overdue: 'destructive',
    completed: 'success',
    cancelled: 'secondary',
};

export default function ComplianceIndex({ events, sites, types }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [editEvent, setEditEvent] = useState<ComplianceEvent | null>(null);
    const [deleteEvent, setDeleteEvent] = useState<ComplianceEvent | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [filterSite, setFilterSite] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const allEvents = Object.values(events).flat();
    const totalCount = allEvents.length;

    const filteredEvents: Record<string, ComplianceEvent[]> = {};
    for (const [month, monthEvents] of Object.entries(events)) {
        const filtered = monthEvents.filter((e) => {
            if (filterSite !== 'all' && e.site_id.toString() !== filterSite) return false;
            if (filterType !== 'all' && e.type !== filterType) return false;
            if (filterStatus !== 'all' && e.status !== filterStatus) return false;
            return true;
        });
        if (filtered.length > 0) {
            filteredEvents[month] = filtered;
        }
    }

    function handleDelete() {
        if (!deleteEvent) return;
        setDeleting(true);
        router.delete(`/settings/compliance/${deleteEvent.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteEvent(null);
            },
        });
    }

    function handleComplete(event: ComplianceEvent) {
        router.post(`/settings/compliance/${event.id}/complete`, {}, { preserveScroll: true });
    }

    function formatMonth(month: string): string {
        return new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Compliance Calendar')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Compliance Calendar')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {totalCount} {t('event(s)')}
                        </p>
                    </div>
                    <Dialog open={showCreate} onOpenChange={setShowCreate}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add Event')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{t('Create Compliance Event')}</DialogTitle>
                            </DialogHeader>
                            <EventForm
                                sites={sites}
                                types={types}
                                onSuccess={() => setShowCreate(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                        <Select value={filterSite} onValueChange={setFilterSite}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('All Sites')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Sites')}</SelectItem>
                                {sites.map((site) => (
                                    <SelectItem key={site.id} value={site.id.toString()}>
                                        {site.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('All Types')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Types')}</SelectItem>
                                {types.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type.replace(/_/g, ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('All Statuses')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                <SelectItem value="upcoming">{t('Upcoming')}</SelectItem>
                                <SelectItem value="overdue">{t('Overdue')}</SelectItem>
                                <SelectItem value="completed">{t('Completed')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Events grouped by month */}
                {Object.keys(filteredEvents).length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-sidebar-border/70 p-12 dark:border-sidebar-border">
                        <div className="text-center">
                            <CalendarCheck className="mx-auto h-10 w-10 text-muted-foreground/50" />
                            <p className="mt-3 text-muted-foreground">{t('No compliance events scheduled')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(filteredEvents).map(([month, monthEvents]) => (
                            <div key={month} className="space-y-3">
                                <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
                                <div className="space-y-2">
                                    {monthEvents.map((event) => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            onComplete={() => handleComplete(event)}
                                            onEdit={() => setEditEvent(event)}
                                            onDelete={() => setDeleteEvent(event)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editEvent} onOpenChange={(open) => !open && setEditEvent(null)}>
                <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Edit Compliance Event')}</DialogTitle>
                    </DialogHeader>
                    {editEvent && (
                        <EventForm
                            event={editEvent}
                            sites={sites}
                            types={types}
                            onSuccess={() => setEditEvent(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmationDialog
                open={!!deleteEvent}
                onOpenChange={(open) => !open && setDeleteEvent(null)}
                title={t('Delete Compliance Event')}
                description={`${t('Are you sure you want to delete')} "${deleteEvent?.title}"?`}
                warningMessage={t('This compliance event will be permanently removed.')}
                loading={deleting}
                onConfirm={handleDelete}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

function EventCard({
    event,
    onComplete,
    onEdit,
    onDelete,
}: {
    event: ComplianceEvent;
    onComplete: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const daysUntilDue = Math.ceil((new Date(event.due_date).getTime() - Date.now()) / 86400000);

    return (
        <Card>
            <CardContent className="flex items-center gap-4 p-4">
                <Badge variant={TYPE_BADGE_VARIANTS[event.type] ?? 'outline'} className="text-xs">
                    {event.type.replace(/_/g, ' ')}
                </Badge>
                <div className="min-w-0 flex-1">
                    <p className="font-medium">{event.title}</p>
                    {event.site && (
                        <p className="text-sm text-muted-foreground">{event.site.name}</p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-sm">{new Date(event.due_date).toLocaleDateString()}</p>
                    <p className={`text-xs font-medium ${getDaysColor(daysUntilDue)}`}>
                        {formatDaysUntilDue(daysUntilDue)}
                    </p>
                </div>
                <Badge variant={STATUS_BADGE_VARIANTS[event.status] ?? 'outline'} className="text-xs">
                    {event.status}
                </Badge>
                <div className="flex gap-1">
                    {event.status !== 'completed' && event.status !== 'cancelled' && (
                        <Button variant="ghost" size="icon-sm" title="Complete" onClick={onComplete}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" title="Edit" onClick={onEdit}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive" title="Delete" onClick={onDelete}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function getDaysColor(days: number): string {
    if (days < 0) return 'text-destructive';
    if (days < 7) return 'text-red-500';
    if (days <= 30) return 'text-amber-500';
    return 'text-emerald-500';
}

function formatDaysUntilDue(days: number): string {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    return `${days}d remaining`;
}

function EventForm({
    event,
    sites,
    types,
    onSuccess,
}: {
    event?: ComplianceEvent;
    sites: { id: number; name: string }[];
    types: string[];
    onSuccess: () => void;
}) {
    const { t } = useLang();
    const isEdit = !!event;

    const form = useForm({
        title: event?.title ?? '',
        type: event?.type ?? '',
        site_id: event?.site_id?.toString() ?? '',
        due_date: event?.due_date ?? '',
        description: event?.description ?? '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        form.transform((data) => ({
            ...data,
            site_id: Number(data.site_id),
        }));

        if (isEdit) {
            form.put(`/settings/compliance/${event!.id}`, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            form.post('/settings/compliance', {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    onSuccess();
                },
            });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>{t('Title')}</Label>
                <Input
                    value={form.data.title}
                    onChange={(e) => form.setData('title', e.target.value)}
                    placeholder={t('e.g. Annual COFEPRIS Audit')}
                    required
                />
                <InputError message={form.errors.title} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Type')}</Label>
                <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('Select type')} />
                    </SelectTrigger>
                    <SelectContent>
                        {types.map((type) => (
                            <SelectItem key={type} value={type}>
                                {type.replace(/_/g, ' ')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.type} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Site')}</Label>
                <Select value={form.data.site_id} onValueChange={(v) => form.setData('site_id', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('Select site')} />
                    </SelectTrigger>
                    <SelectContent>
                        {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id.toString()}>
                                {site.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.site_id} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Due Date')}</Label>
                <Input
                    type="date"
                    value={form.data.due_date}
                    onChange={(e) => form.setData('due_date', e.target.value)}
                    required
                />
                <InputError message={form.errors.due_date} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Description')}</Label>
                <Textarea
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    placeholder={t('Optional notes about this event...')}
                    rows={3}
                />
                <InputError message={form.errors.description} />
            </div>

            <Button type="submit" disabled={form.processing} className="w-full">
                {isEdit ? t('Update Event') : t('Create Event')}
            </Button>
        </form>
    );
}
