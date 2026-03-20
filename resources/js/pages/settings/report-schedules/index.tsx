import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/switch';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

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

export default function ReportSchedulesIndex({ schedules, sites }: Props) {
    const { t } = useLang();
    const [deleteSchedule, setDeleteSchedule] = useState<ReportScheduleRecord | null>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Report Schedules')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Report Schedules')}</h1>
                        <p className="text-sm text-muted-foreground">{t('Automate compliance and operational report delivery.')}</p>
                    </div>
                    <Can permission="manage report schedules">
                        <Button><Plus className="mr-2 h-4 w-4" />{t('Add Schedule')}</Button>
                    </Can>
                </div>

                {schedules.length === 0 ? (
                    <EmptyState icon={Calendar} title={t('No report schedules')} description={t('Automated reports ensure compliance without manual action.')} />
                ) : (
                    <div className="space-y-3">
                        {schedules.map((s) => (
                            <Card key={s.id}>
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                            <Calendar className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={TYPE_COLORS[s.type] as 'default' ?? 'outline'}>
                                                    {s.type.replace(/_/g, ' ')}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {s.site?.name ?? t('Organization-wide')} &middot;{' '}
                                                {s.frequency === 'weekly' ? `${DAYS[s.day_of_week ?? 0]}s` : s.frequency} at {s.time}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {s.recipients_json.join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={s.active}
                                            onCheckedChange={(checked) => {
                                                router.put(`/settings/report-schedules/${s.id}`, { ...s, active: checked, site_id: s.site?.id } as Record<string, unknown>, { preserveScroll: true });
                                            }}
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteSchedule(s)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <ConfirmationDialog
                    open={!!deleteSchedule}
                    onOpenChange={(open) => !open && setDeleteSchedule(null)}
                    title={t('Delete Schedule')}
                    description={t('This schedule will stop sending reports.')}
                    onConfirm={() => {
                        if (deleteSchedule) {
                            router.delete(`/settings/report-schedules/${deleteSchedule.id}`, { preserveScroll: true, onSuccess: () => setDeleteSchedule(null) });
                        }
                    }}
                    actionLabel={t('Delete')}
                />
            </div>
        </AppLayout>
    );
}
