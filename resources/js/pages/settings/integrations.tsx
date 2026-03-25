import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
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
    const activeCount = integrations.filter((c) => c.active).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Integrations')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative p-6 md:p-8">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Integrations')}
                            </p>
                            <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                {t('Integrations')}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t('Connect with external ERP systems')} —{' '}
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                    {activeCount}
                                </span>{' '}
                                {t('active')}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Integration Cards ──────────────────────────── */}
                <FadeIn delay={100} duration={500}>
                    <div>
                        <div className="mb-3 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Connectors')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {Object.entries(integrationMeta).map(([type, meta], idx) => {
                                const config = configMap.get(type);
                                return (
                                    <FadeIn key={type} delay={150 + idx * 80} duration={500}>
                                        <IntegrationCard
                                            type={type}
                                            meta={meta}
                                            config={config ?? null}
                                        />
                                    </FadeIn>
                                );
                            })}
                        </div>
                    </div>
                </FadeIn>
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
        <Card className={`shadow-elevation-1 transition-opacity ${!isActive ? 'opacity-70' : ''}`}>
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
                                    className="font-mono text-xs tabular-nums"
                                />
                            </div>
                            <Button type="submit" size="sm" variant="outline" disabled={form.processing}>
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />{t('Save')}
                            </Button>
                        </form>

                        {config?.last_export_at && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {t('Last export')}:{' '}
                                <span className="font-mono tabular-nums">
                                    {new Date(config.last_export_at).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
