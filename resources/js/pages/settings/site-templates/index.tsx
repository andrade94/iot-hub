import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface SiteTemplateRecord {
    id: number;
    name: string;
    description: string | null;
    modules: string[];
    zone_config: { name: string }[] | null;
    recipe_assignments: { zone: string; recipe_id: number }[] | null;
    created_at: string;
    created_by_user?: { name: string };
}

interface Props {
    templates: SiteTemplateRecord[];
    sites: { id: number; name: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/organization' },
    { title: 'Site Templates', href: '#' },
];

export default function SiteTemplatesIndex({ templates, sites }: Props) {
    const { t } = useLang();
    const [deleteTemplate, setDeleteTemplate] = useState<SiteTemplateRecord | null>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Site Templates')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Site Templates')}</h1>
                        <p className="text-sm text-muted-foreground">{t('Save site configurations as templates to speed up onboarding.')}</p>
                    </div>
                    <Can permission="manage site templates">
                        <Button><Plus className="mr-2 h-4 w-4" />{t('Create Template')}</Button>
                    </Can>
                </div>

                {templates.length === 0 ? (
                    <EmptyState icon={Copy} title={t('No site templates')} description={t('Templates capture modules, zones, recipes, and escalation chains from an existing site.')} />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {templates.map((tmpl) => (
                            <Card key={tmpl.id}>
                                <CardHeader>
                                    <CardTitle className="text-base">{tmpl.name}</CardTitle>
                                    {tmpl.description && <p className="text-sm text-muted-foreground">{tmpl.description}</p>}
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex flex-wrap gap-1">
                                        {tmpl.modules.map((m) => (
                                            <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {tmpl.zone_config?.length ?? 0} {t('zones')} &middot;{' '}
                                        {tmpl.recipe_assignments?.length ?? 0} {t('recipes')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Created')} {new Date(tmpl.created_at).toLocaleDateString()} {t('by')} {tmpl.created_by_user?.name}
                                    </p>
                                </CardContent>
                                <CardFooter className="gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setDeleteTemplate(tmpl)}>
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />{t('Delete')}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}

                <ConfirmationDialog
                    open={!!deleteTemplate}
                    onOpenChange={(open) => !open && setDeleteTemplate(null)}
                    title={t('Delete Template')}
                    description={t(`Delete "${deleteTemplate?.name}"? Existing sites using this template are not affected.`)}
                    onConfirm={() => {
                        if (deleteTemplate) {
                            router.delete(`/settings/site-templates/${deleteTemplate.id}`, { preserveScroll: true, onSuccess: () => setDeleteTemplate(null) });
                        }
                    }}
                    actionLabel={t('Delete')}
                />
            </div>
        </AppLayout>
    );
}
