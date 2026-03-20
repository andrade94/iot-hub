import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
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
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Data Export')}</h1>
                    <p className="text-sm text-muted-foreground">{t('Download your organization data for compliance (LFPDPPP) or backup purposes.')}</p>
                </div>

                {/* Request form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileDown className="h-4 w-4" />
                            {t('Request Export')}
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
                                    <Input type="date" value={form.data.date_from} onChange={(e) => form.setData('date_from', e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('To')}</Label>
                                    <Input type="date" value={form.data.date_to} onChange={(e) => form.setData('date_to', e.target.value)} />
                                </div>
                            </div>
                            <Button type="submit" disabled={form.processing || hasActiveExport}>
                                {hasActiveExport ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('Export in progress...')}</>
                                ) : (
                                    <><Download className="mr-2 h-4 w-4" />{t('Request Export')}</>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Previous exports */}
                {exportList.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Export History')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {exportList.map((exp) => (
                                    <div key={exp.id} className="flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={STATUS_VARIANTS[exp.status] as 'default' ?? 'outline'}>{exp.status}</Badge>
                                                <span className="text-sm text-muted-foreground">{new Date(exp.created_at).toLocaleDateString()}</span>
                                            </div>
                                            {exp.file_size && (
                                                <p className="text-xs text-muted-foreground">{(exp.file_size / 1024 / 1024).toFixed(1)} MB</p>
                                            )}
                                            {exp.error && <p className="text-xs text-destructive">{exp.error}</p>}
                                        </div>
                                        {exp.status === 'completed' && (
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={`/exports/download?path=${exp.id}`}>
                                                    <Download className="mr-1.5 h-3.5 w-3.5" />{t('Download')}
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
