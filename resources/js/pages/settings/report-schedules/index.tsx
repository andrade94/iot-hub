import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import InputError from '@/components/input-error';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

interface ReportScheduleRecord {
    id: number;
    type: string;
    frequency: string;
    day_of_week: number | null;
    time: string;
    recipients_json: string[];
    active: boolean;
    site?: { id: number; name: string } | null;
}

interface Props {
    schedules: ReportScheduleRecord[];
    sites: { id: number; name: string }[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TYPE_COLORS: Record<string, string> = {
    temperature_compliance: 'default',
    energy_summary: 'success',
    alert_summary: 'warning',
    executive_overview: 'secondary',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/organization' },
    { title: 'Report Schedules', href: '#' },
];

export function ReportSchedulesSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="mt-3 h-8 w-44" />
                        <Skeleton className="mt-2 h-4 w-36" />
                    </div>
                    <Skeleton className="h-9 w-32" />
                </div>
            </div>
            {/* Section Divider */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <div className="h-px flex-1 bg-border" />
            </div>
            {/* Schedule items */}
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="space-y-1">
                                    <Skeleton className="h-5 w-32 rounded-full" />
                                    <Skeleton className="h-3 w-40" />
                                    <Skeleton className="h-3 w-28" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-5 w-9 rounded-full" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ReportSchedulesIndex({ schedules, sites }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [deleteSchedule, setDeleteSchedule] = useState<ReportScheduleRecord | null>(null);
    const reportScheduleSchema = z.object({
        type: z.string().min(1, 'Report type is required'),
        site_id: z.string(),
        frequency: z.string().min(1, 'Frequency is required'),
        day_of_week: z.string(),
        time: z.string().min(1, 'Time is required'),
        recipients_json: z.array(z.string().email('Valid email is required')).min(1, 'At least one recipient is required'),
    });

    const createForm = useValidatedForm(reportScheduleSchema, {
        type: 'temperature_compliance',
        site_id: '',
        frequency: 'weekly',
        day_of_week: '1',
        time: '08:00',
        recipients_json: [''],
    });

    const activeCount = schedules.filter((s) => s.active).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Report Schedules')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-center justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Report Schedules')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Automated Reports')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium tabular-nums text-foreground">{activeCount}</span>{' '}
                                    {t('active')}{' / '}
                                    <span className="font-mono font-medium tabular-nums text-foreground">{schedules.length}</span>{' '}
                                    {t('total schedules')}
                                </p>
                            </div>
                            <Can permission="manage report schedules">
                                <Button onClick={() => setShowCreate(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('Add Schedule')}
                                </Button>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Section Divider ─────────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div className="flex items-center gap-3">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('All Schedules')}
                        </p>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>

                {/* ── Content ─────────────────────────────────────── */}
                {schedules.length === 0 ? (
                    <FadeIn delay={150} duration={500}>
                        <EmptyState
                            icon={Calendar}
                            title={t('No report schedules')}
                            description={t('Automated reports ensure compliance without manual action.')}
                        />
                    </FadeIn>
                ) : (
                    <div className="space-y-3">
                        {schedules.map((s, index) => (
                            <FadeIn key={s.id} delay={150 + index * 50} duration={400}>
                                <Card className="shadow-elevation-1">
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={(TYPE_COLORS[s.type] as 'default') ?? 'outline'}>
                                                        {s.type.replace(/_/g, ' ')}
                                                    </Badge>
                                                    {!s.active && (
                                                        <Badge variant="outline" className="text-xs text-muted-foreground">
                                                            {t('Paused')}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {s.site?.name ?? t('Organization-wide')} &middot;{' '}
                                                    <span className="font-mono tabular-nums">
                                                        {s.frequency === 'weekly' ? `${DAYS[s.day_of_week ?? 0]}s` : s.frequency}{' '}
                                                        {t('at')} {s.time}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {s.recipients_json.join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Can permission="manage report schedules">
                                                <Switch
                                                    checked={s.active}
                                                    onCheckedChange={(checked) => {
                                                        router.put(
                                                            `/settings/report-schedules/${s.id}`,
                                                            { ...s, active: checked, site_id: s.site?.id } as Record<string, unknown>,
                                                            { preserveScroll: true },
                                                        );
                                                    }}
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteSchedule(s)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </Can>
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                )}

                {/* ── Create Schedule Dialog ──────────────────────── */}
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('Add Report Schedule')}</DialogTitle>
                            <DialogDescription>{t('Configure automated report delivery.')}</DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                createForm.submit('post', '/settings/report-schedules', {
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        createForm.reset();
                                        setShowCreate(false);
                                    },
                                });
                            }}
                            className="space-y-4"
                        >
                            <div className="grid gap-2">
                                <Label>{t('Report Type')}</Label>
                                <Select value={createForm.data.type} onValueChange={(v) => createForm.setData('type', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="temperature_compliance">{t('Temperature Compliance')}</SelectItem>
                                        <SelectItem value="energy_summary">{t('Energy Summary')}</SelectItem>
                                        <SelectItem value="alert_summary">{t('Alert Summary')}</SelectItem>
                                        <SelectItem value="executive_overview">{t('Executive Overview')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>{t('Frequency')}</Label>
                                    <Select value={createForm.data.frequency} onValueChange={(v) => createForm.setData('frequency', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">{t('Daily')}</SelectItem>
                                            <SelectItem value="weekly">{t('Weekly')}</SelectItem>
                                            <SelectItem value="monthly">{t('Monthly')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Time')}</Label>
                                    <Input
                                        type="time"
                                        value={createForm.data.time}
                                        onChange={(e) => createForm.setData('time', e.target.value)}
                                        className="font-mono tabular-nums"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Recipient Email')}</Label>
                                <Input
                                    type="email"
                                    value={createForm.data.recipients_json[0]}
                                    onChange={(e) => createForm.setData('recipients_json', [e.target.value])}
                                    placeholder="admin@example.com"
                                />
                                <InputError message={createForm.errors.recipients_json} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={createForm.processing}>
                                    {t('Create')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <ConfirmationDialog
                    open={!!deleteSchedule}
                    onOpenChange={(open) => !open && setDeleteSchedule(null)}
                    title={t('Delete Schedule')}
                    description={t('This schedule will stop sending reports.')}
                    onConfirm={() => {
                        if (deleteSchedule) {
                            router.delete(`/settings/report-schedules/${deleteSchedule.id}`, {
                                preserveScroll: true,
                                onSuccess: () => setDeleteSchedule(null),
                            });
                        }
                    }}
                    actionLabel={t('Delete')}
                />
            </div>
        </AppLayout>
    );
}
