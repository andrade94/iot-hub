import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, IntegrationConfigRecord } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Clock, Database, FileSpreadsheet, RefreshCw } from 'lucide-react';

interface Props {
    integrations: IntegrationConfigRecord[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Integrations', href: '#' },
];

const integrationMeta: Record<string, { name: string; description: string; icon: React.ReactNode }> = {
    sap: {
        name: 'SAP',
        description: 'Export sensor readings and reports in SAP-compatible CSV/XML formats via SFTP',
        icon: <Database className="h-6 w-6 text-blue-600" />,
    },
    contpaq: {
        name: 'CONTPAQi',
        description: 'Export invoices and billing data in CONTPAQ-compatible format',
        icon: <FileSpreadsheet className="h-6 w-6 text-emerald-600" />,
    },
};

export default function IntegrationsPage({ integrations }: Props) {
    const { t } = useLang();

    // Build a map of existing configs
    const configMap = new Map(integrations.map((c) => [c.type, c]));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Integrations')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Integrations')}</h1>
                    <p className="text-sm text-muted-foreground">{t('Connect with external ERP systems')}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries(integrationMeta).map(([type, meta]) => {
                        const config = configMap.get(type);
                        return (
                            <IntegrationCard
                                key={type}
                                type={type}
                                meta={meta}
                                config={config ?? null}
                            />
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}

function IntegrationCard({
    type,
    meta,
    config,
}: {
    type: string;
    meta: { name: string; description: string; icon: React.ReactNode };
    config: IntegrationConfigRecord | null;
}) {
    const { t } = useLang();
    const isActive = config?.active ?? false;

    const form = useForm({
        type,
        schedule_cron: config?.schedule_cron ?? '',
        active: isActive,
    });

    function toggleActive() {
        const newActive = !form.data.active;
        form.setData('active', newActive);
        router.post('/settings/integrations', { type, active: newActive, schedule_cron: form.data.schedule_cron }, { preserveScroll: true });
    }

    function saveSchedule(e: React.FormEvent) {
        e.preventDefault();
        form.post('/settings/integrations', { preserveScroll: true });
    }

    return (
        <Card className={!isActive ? 'opacity-70' : ''}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {meta.icon}
                        <div>
                            <CardTitle className="text-base">{meta.name}</CardTitle>
                            {isActive && <Badge variant="success" className="mt-1 text-xs">{t('Connected')}</Badge>}
                        </div>
                    </div>
                    <Switch checked={isActive} onCheckedChange={toggleActive} />
                </div>
                <CardDescription>{meta.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isActive && (
                    <>
                        <form onSubmit={saveSchedule} className="flex items-end gap-3">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">{t('Schedule (cron)')}</Label>
                                <Input
                                    value={form.data.schedule_cron}
                                    onChange={(e) => form.setData('schedule_cron', e.target.value)}
                                    placeholder="0 6 * * *"
                                    className="font-mono text-xs"
                                />
                            </div>
                            <Button type="submit" size="sm" variant="outline" disabled={form.processing}>
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />{t('Save')}
                            </Button>
                        </form>

                        {config?.last_export_at && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {t('Last export')}: {new Date(config.last_export_at).toLocaleString()}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
