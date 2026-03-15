import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Module, Site } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Layers } from 'lucide-react';

interface Props {
    site: Site;
    modules: Module[];
    activatedModuleIds: number[];
}

const moduleEmojis: Record<string, string> = {
    cold_chain: '🧊',
    energy: '⚡',
    compliance: '📋',
    industrial: '🏭',
    iaq: '🌬️',
    safety: '🛡️',
    people: '👥',
};

export default function ModulesPage({ site, modules, activatedModuleIds }: Props) {
    const { t } = useLang();
    const activeSet = new Set(activatedModuleIds);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Modules', href: '#' },
    ];

    function toggleModule(moduleId: number) {
        router.post(`/sites/${site.id}/modules/${moduleId}/toggle`, {}, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Modules')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Modules')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {site.name} — {activatedModuleIds.length}/{modules.length} {t('active')}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {modules.map((mod) => {
                        const isActive = activeSet.has(mod.id);
                        return (
                            <Card key={mod.id} className={!isActive ? 'opacity-60' : ''}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{moduleEmojis[mod.slug] ?? '📡'}</span>
                                            <div>
                                                <CardTitle className="text-base">{mod.name}</CardTitle>
                                                {isActive && (
                                                    <Badge variant="success" className="mt-1 text-xs">{t('Active')}</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <Switch checked={isActive} onCheckedChange={() => toggleModule(mod.id)} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{mod.description}</p>
                                    {mod.recipes && mod.recipes.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                                {t('Recipes')} ({mod.recipes.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {mod.recipes.slice(0, 4).map((r) => (
                                                    <Badge key={r.id} variant="outline" className="text-xs">
                                                        {r.name}
                                                    </Badge>
                                                ))}
                                                {mod.recipes.length > 4 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{mod.recipes.length - 4}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
