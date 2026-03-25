import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Module, Site } from '@/types';
import { Head, router } from '@inertiajs/react';

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
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative p-6 md:p-8">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Modules')}
                            </p>
                            <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                {t('Modules')}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {site.name} —{' '}
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                    {activatedModuleIds.length}
                                </span>
                                /
                                <span className="font-mono tabular-nums">
                                    {modules.length}
                                </span>{' '}
                                {t('active')}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Module Cards ────────────────────────────────── */}
                <FadeIn delay={100} duration={500}>
                    <div>
                        <div className="mb-3 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Available Modules')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {modules.map((mod, idx) => {
                                const isActive = activeSet.has(mod.id);
                                return (
                                    <FadeIn key={mod.id} delay={150 + idx * 80} duration={500}>
                                        <Card
                                            className={`shadow-elevation-1 transition-opacity ${!isActive ? 'opacity-60' : ''}`}
                                        >
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">
                                                            {moduleEmojis[mod.slug] ?? '📡'}
                                                        </span>
                                                        <div>
                                                            <CardTitle className="text-base">{mod.name}</CardTitle>
                                                            {isActive && (
                                                                <Badge variant="success" className="mt-1 text-xs">
                                                                    {t('Active')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Can permission="manage org settings">
                                                        <Switch
                                                            checked={isActive}
                                                            onCheckedChange={() => toggleModule(mod.id)}
                                                        />
                                                    </Can>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">{mod.description}</p>
                                                {mod.recipes && mod.recipes.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                                                            {t('Recipes')} (
                                                            <span className="font-mono tabular-nums">
                                                                {mod.recipes.length}
                                                            </span>
                                                            )
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {mod.recipes.slice(0, 4).map((r) => (
                                                                <Badge
                                                                    key={r.id}
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    {r.name}
                                                                </Badge>
                                                            ))}
                                                            {mod.recipes.length > 4 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    +
                                                                    <span className="font-mono tabular-nums">
                                                                        {mod.recipes.length - 4}
                                                                    </span>
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
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
