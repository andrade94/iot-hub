import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Module, Site } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    site: Site;
    modules: Module[];
    activatedModuleIds: number[];
    moduleDeviceCounts?: Record<number, number>;
    monthlyTotal?: string;
}

const moduleEmojis: Record<string, string> = {
    cold_chain: '🧊', energy: '⚡', compliance: '📋', industrial: '🏭',
    iaq: '🌬️', safety: '🛡️', people: '👥',
};

const moduleDashboards: Record<string, string> = {
    iaq: 'modules/iaq',
    industrial: 'modules/industrial',
};

export default function ModulesPage({ site, modules, activatedModuleIds, moduleDeviceCounts = {}, monthlyTotal = '0.00' }: Props) {
    const { t } = useLang();
    const activeSet = new Set(activatedModuleIds);
    const [confirmModule, setConfirmModule] = useState<Module | null>(null);
    const confirmIsActive = confirmModule ? activeSet.has(confirmModule.id) : false;

    const activeModules = modules.filter((m) => activeSet.has(m.id));
    const availableModules = modules.filter((m) => !activeSet.has(m.id));

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: t('Modules'), href: '#' },
    ];

    function handleToggle(mod: Module) {
        setConfirmModule(mod);
    }

    function confirmToggle() {
        if (!confirmModule) return;
        router.post(`/sites/${site.id}/modules/${confirmModule.id}/toggle`, {}, {
            preserveScroll: true,
            onFinish: () => setConfirmModule(null),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Modules')} — ${site.name}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div>
                        <button onClick={() => router.get(`/sites/${site.id}?tab=setup`)}
                            className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                            ← {site.name}
                        </button>
                        <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground md:text-[32px]">
                            {t('Modules')}
                        </h1>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                            <span className="font-mono tabular-nums font-medium text-foreground">{activatedModuleIds.length}</span> {t('of')}{' '}
                            <span className="font-mono tabular-nums">{modules.length}</span> {t('modules active')} · {site.name}
                        </p>
                    </div>
                </FadeIn>

                {/* ━━ SUMMARY STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={400}>
                    <div className="mt-6 flex gap-3 overflow-hidden rounded-lg border border-border bg-card">
                        <div className="flex-1 px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Active')}</p>
                            <p className="mt-1 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activatedModuleIds.length}</p>
                        </div>
                        <div className="flex-1 border-l border-border px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Available')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{modules.length}</p>
                        </div>
                        <div className="flex-1 border-l border-border px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Recipes')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{modules.reduce((sum, m) => sum + (m.recipes?.length ?? 0), 0)}</p>
                        </div>
                        <div className="flex-1 border-l border-border px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Monthly')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">${monthlyTotal}</p>
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ ACTIVE MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeModules.length > 0 && (
                    <>
                        <div className="my-7 flex items-center gap-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('ACTIVE MODULES')}</span>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] text-muted-foreground/50">{activeModules.length}</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {activeModules.map((mod, i) => (
                                <FadeIn key={mod.id} delay={100 + i * 40} duration={400}>
                                    <ModuleCard
                                        module={mod}
                                        siteId={site.id}
                                        isActive
                                        matchingDevices={moduleDeviceCounts[mod.id] ?? 0}
                                        onToggle={() => handleToggle(mod)}
                                    />
                                </FadeIn>
                            ))}
                        </div>
                    </>
                )}

                {/* ━━ AVAILABLE MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {availableModules.length > 0 && (
                    <>
                        <div className="my-7 flex items-center gap-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('AVAILABLE MODULES')}</span>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] text-muted-foreground/50">{availableModules.length}</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {availableModules.map((mod, i) => {
                                const matching = moduleDeviceCounts[mod.id] ?? 0;
                                return (
                                    <FadeIn key={mod.id} delay={100 + i * 40} duration={400}>
                                        <ModuleCard
                                            module={mod}
                                            siteId={site.id}
                                            isActive={false}
                                            matchingDevices={matching}
                                            onToggle={() => handleToggle(mod)}
                                        />
                                    </FadeIn>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* ━━ CONFIRMATION DIALOG ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {confirmModule && (
                <ConfirmationDialog
                    open={!!confirmModule}
                    onOpenChange={(open) => !open && setConfirmModule(null)}
                    title={confirmIsActive ? `${t('Deactivate')} ${confirmModule.name}` : `${t('Activate')} ${confirmModule.name}`}
                    description={confirmIsActive
                        ? t('Deactivating this module will remove its alert rules and stop monitoring from its recipes.')
                        : t('Activating this module will create alert rules from its recipes for matching devices.')}
                    itemName={confirmModule.name}
                    warningMessage={confirmIsActive
                        ? t('Existing alerts and historical data will be preserved. You can reactivate at any time.')
                        : `${moduleDeviceCounts[confirmModule.id] ?? 0} ${t('matching device(s) at this site')} · ${confirmModule.recipes?.length ?? 0} ${t('recipes')}`}
                    onConfirm={confirmToggle}
                    actionLabel={confirmIsActive ? t('Deactivate') : t('Activate')}
                />
            )}
        </AppLayout>
    );
}

/* -- Module Card --------------------------------------------------------- */

function ModuleCard({ module, siteId, isActive, matchingDevices, onToggle }: {
    module: Module; siteId: number; isActive: boolean; matchingDevices: number; onToggle: () => void;
}) {
    const { t } = useLang();
    const emoji = moduleEmojis[module.slug] ?? '📡';
    const dashboardPath = moduleDashboards[module.slug];
    const recipeCount = module.recipes?.length ?? 0;
    const sensors = module.required_sensor_models ?? [];

    return (
        <Card className={cn('border-border shadow-none transition-all',
            isActive ? 'border-primary/20' : 'opacity-60 hover:opacity-80')}>
            <CardContent className="p-5">
                <div className="flex items-start gap-4">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl',
                        isActive ? 'bg-primary/10' : 'bg-muted/30')}>
                        {emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className={cn('text-[15px] font-bold', !isActive && 'text-muted-foreground')}>{module.name}</h3>
                            <Switch checked={isActive} onCheckedChange={onToggle} />
                        </div>
                        <p className={cn('mt-1 text-[11px] leading-relaxed', isActive ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                            {module.description}
                        </p>
                    </div>
                </div>

                <div className="mt-4 border-t border-border/30 pt-3">
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
                        <div>
                            <span className="text-muted-foreground/60">{t('Sensors')}:</span>{' '}
                            <span className="font-mono">{sensors.length > 0 ? sensors.join(', ') : '—'}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground/60">{t('Recipes')}:</span>{' '}
                            <span className="font-mono font-medium">{recipeCount}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground/60">{t('Matching')}:</span>{' '}
                            <span className={cn('font-mono font-medium',
                                matchingDevices > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500')}>
                                {matchingDevices}
                            </span>
                            {matchingDevices === 0 && <span className="ml-1 text-[9px] text-rose-500/70">{t('no devices')}</span>}
                        </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-[11px] text-muted-foreground/50">
                            {module.monthly_fee && Number(module.monthly_fee) > 0 ? `$${Number(module.monthly_fee).toLocaleString()}/mo` : t('Free')}
                        </span>
                        <div className="flex items-center gap-2">
                            {isActive && <Badge variant="success" className="text-[8px]">{t('active')}</Badge>}
                            {!isActive && <Badge variant="outline" className="text-[8px]">{t('not active')}</Badge>}
                            {isActive && dashboardPath && (
                                <Link href={`/sites/${siteId}/${dashboardPath}`}
                                    className="text-[10px] text-primary transition-colors hover:text-primary/80">
                                    {t('Dashboard')} →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
