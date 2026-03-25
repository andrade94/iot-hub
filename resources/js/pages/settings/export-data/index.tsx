import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { Download, FileDown, Loader2 } from 'lucide-react';

interface DataExportRecord {
    id: number;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
    date_from: string | null;
    date_to: string | null;
    file_size: number | null;
    completed_at: string | null;
    expires_at: string | null;
    error: string | null;
    created_at: string;
    requested_by_user?: { name: string };
}

interface Props {
    exports: DataExportRecord[];
}

const STATUS_VARIANTS: Record<string, string> = {
    queued: 'secondary',
    processing: 'warning',
    completed: 'success',
    failed: 'destructive',
    expired: 'outline',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/organization' },
    { title: 'Data Export', href: '#' },
];

export default function DataExportIndex({ exports: exportList }: Props) {
    const { t } = useLang();
    const form = useForm({ date_from: '', date_to: '' });

    const hasActiveExport = exportList.some((e) => ['queued', 'processing'].includes(e.status));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/settings/export-data', { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Data Export')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative p-6 md:p-8">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Data Export')}
                            </p>
                            <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                {t('Organization Data')}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t('Download your organization data for compliance (LFPDPPP) or backup purposes.')}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Request Export Section ──────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Request Export')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card className="shadow-elevation-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FileDown className="h-4 w-4" />
                                    {t('New Export')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-4 text-sm text-muted-foreground">
                                    {t('Generates a ZIP file with: sensor readings (CSV), alerts & corrective actions, work orders, compliance events, user list, and invoices.')}
                                </p>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label>{t('From')}</Label>
                                            <DatePicker
                                                date={form.data.date_from ? new Date(form.data.date_from + 'T00:00:00') : undefined}
                                                onDateChange={(d) => form.setData('date_from', d ? format(d, 'yyyy-MM-dd') : '')}
                                                placeholder={t('Select date')}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>{t('To')}</Label>
                                            <DatePicker
                                                date={form.data.date_to ? new Date(form.data.date_to + 'T00:00:00') : undefined}
                                                onDateChange={(d) => form.setData('date_to', d ? format(d, 'yyyy-MM-dd') : '')}
                                                placeholder={t('Select date')}
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={form.processing || hasActiveExport}>
                                        {hasActiveExport ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {t('Export in progress...')}
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-4 w-4" />
                                                {t('Request Export')}
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </FadeIn>

                {/* ── Export History ───────────────────────────────── */}
                {exportList.length > 0 && (
                    <FadeIn delay={150} duration={500}>
                        <div>
                            <div className="mb-2 flex items-center gap-3">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Export History')}
                                </p>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {exportList.length}
                                </span>
                            </div>
                            <Card className="shadow-elevation-1">
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {exportList.map((exp, index) => (
                                            <FadeIn key={exp.id} delay={200 + index * 50} duration={400}>
                                                <div className="flex items-center justify-between p-4">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={(STATUS_VARIANTS[exp.status] as 'default') ?? 'outline'}>
                                                                {exp.status}
                                                            </Badge>
                                                            <span className="font-mono text-sm tabular-nums text-muted-foreground">
                                                                {new Date(exp.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {exp.file_size && (
                                                            <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                                                                <span className="font-medium text-foreground">
                                                                    {(exp.file_size / 1024 / 1024).toFixed(1)}
                                                                </span>{' '}
                                                                MB
                                                            </p>
                                                        )}
                                                        {exp.error && (
                                                            <p className="mt-0.5 text-xs text-destructive">{exp.error}</p>
                                                        )}
                                                    </div>
                                                    {exp.status === 'completed' && (
                                                        <Button variant="outline" size="sm" asChild>
                                                            <a href={`/exports/download?path=${exp.id}`}>
                                                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                                                {t('Download')}
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </FadeIn>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </FadeIn>
                )}
            </div>
        </AppLayout>
    );
}
