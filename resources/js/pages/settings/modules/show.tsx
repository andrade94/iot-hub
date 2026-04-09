import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Module, Recipe } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface SiteInfo {
    id: number;
    name: string;
    status: string;
    activated_at: string;
}

interface Props {
    module: Module & { recipes?: Recipe[] };
    sites: SiteInfo[];
    monthlyRevenue: string;
    deviceCount: number;
}

const moduleEmojis: Record<string, string> = {
    cold_chain: '🧊', energy: '⚡', compliance: '📋', industrial: '🏭',
    iaq: '🌬️', safety: '🛡️', people: '👥',
};

const severityVariant: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
    critical: 'destructive', high: 'warning', medium: 'info', low: 'outline',
};

export default function ModuleShow({ module, sites, monthlyRevenue, deviceCount }: Props) {
    const { t } = useLang();
    const [deleteOpen, setDeleteOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Settings'), href: '/settings/profile' },
        { title: t('Modules'), href: '/settings/modules-catalog' },
        { title: module.name, href: '#' },
    ];

    const emoji = moduleEmojis[module.slug] ?? '📡';
    const recipes = module.recipes ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${module.name} — ${t('Modules')}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between">
                        <div>
                            <button onClick={() => router.get('/settings/modules-catalog')}
                                className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                <ArrowLeft className="h-3 w-3" />{t('Modules')}
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                                    style={{ backgroundColor: module.color ? `${module.color}15` : undefined }}>
                                    {emoji}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="font-display text-[28px] font-bold tracking-tight">{module.name}</h1>
                                        <Badge variant={module.active ? 'success' : 'outline'} className="text-[9px]">
                                            {module.active ? t('Active') : t('Inactive')}
                                        </Badge>
                                    </div>
                                    <p className="mt-0.5 text-[13px] text-muted-foreground">{module.description}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Switch checked={module.active}
                                onCheckedChange={(active) => router.put(`/settings/modules-catalog/${module.id}`, { ...module, active }, { preserveScroll: true })} />
                            <Button variant="outline" size="sm" className="text-[11px]"
                                onClick={() => router.get('/settings/modules-catalog')}>
                                <Pencil className="mr-1 h-3 w-3" />{t('Edit')}
                            </Button>
                            <Button variant="outline" size="sm" className="text-[11px] text-rose-600 dark:text-rose-400 border-rose-200/40 dark:border-rose-800/40"
                                onClick={() => setDeleteOpen(true)}>
                                <Trash2 className="mr-1 h-3 w-3" />{t('Delete')}
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ SUMMARY STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={400}>
                    <div className="mt-6 flex gap-3 overflow-hidden rounded-lg border border-border bg-card">
                        <div className="flex-1 px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Sites')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{sites.length}</p>
                        </div>
                        <div className="flex-1 border-l border-border px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Devices')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{deviceCount}</p>
                        </div>
                        <div className="flex-1 border-l border-border px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Recipes')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{recipes.length}</p>
                        </div>
                        <div className="flex-1 border-l border-border px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Revenue')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">${monthlyRevenue}<span className="text-[12px] font-normal text-muted-foreground">/mo</span></p>
                        </div>
                    </div>
                </FadeIn>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
                    {/* ━━ LEFT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <div>
                        {/* Recipes */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('RECIPES')}</span>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] text-muted-foreground/50">{recipes.length}</span>
                        </div>

                        <FadeIn delay={100} duration={400}>
                            {recipes.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <p className="text-[13px] text-muted-foreground">{t('No recipes for this module')}</p>
                                    <Button variant="outline" size="sm" className="text-[11px]" asChild>
                                        <Link href="/recipes">{t('Go to Recipes')}</Link>
                                    </Button>
                                </div>
                            ) : (
                                <Card className="border-border shadow-none overflow-hidden">
                                    <div className="divide-y divide-border/20">
                                        {recipes.map((recipe) => (
                                            <div key={recipe.id} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                                onClick={() => router.get(`/recipes/${recipe.id}`)}>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[13px] font-medium">{recipe.name}</p>
                                                        <Badge variant="outline" className="font-mono text-[8px]">{recipe.sensor_model}</Badge>
                                                    </div>
                                                    <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                                                        {recipe.default_rules.length} {t('rules')} · {(recipe as any).devices_count ?? 0} {t('devices')}
                                                        {recipe.description && ` · ${recipe.description}`}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1 flex-wrap justify-end max-w-[200px]">
                                                    {recipe.default_rules.slice(0, 2).map((rule, i) => (
                                                        <Badge key={i} variant={severityVariant[rule.severity] ?? 'outline'} className="text-[8px]">
                                                            {t(`metric_${rule.metric}`)} {rule.condition} {rule.threshold}
                                                        </Badge>
                                                    ))}
                                                    {recipe.default_rules.length > 2 && (
                                                        <Badge variant="outline" className="text-[8px]">+{recipe.default_rules.length - 2}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </FadeIn>

                        {/* Sites Using This Module */}
                        <div className="flex items-center gap-4 mt-8 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('SITES')}</span>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] text-muted-foreground/50">{sites.length}</span>
                        </div>

                        <FadeIn delay={150} duration={400}>
                            {sites.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <p className="text-[13px] text-muted-foreground">{t('No sites have activated this module')}</p>
                                </div>
                            ) : (
                                <Card className="border-border shadow-none overflow-hidden">
                                    <div className="divide-y divide-border/20">
                                        {sites.map((site) => (
                                            <div key={site.id} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                                onClick={() => router.get(`/sites/${site.id}`)}>
                                                <span className={cn('h-2 w-2 shrink-0 rounded-full',
                                                    site.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-medium">{site.name}</p>
                                                    <p className="font-mono text-[9px] text-muted-foreground/60">
                                                        {t('Activated')}: {new Date(site.activated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </p>
                                                </div>
                                                <Badge variant={site.status === 'active' ? 'success' : 'outline'} className="text-[8px] capitalize">
                                                    {site.status}
                                                </Badge>
                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                    ${Number(module.monthly_fee ?? 0).toLocaleString()}/mo
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </FadeIn>
                    </div>

                    {/* ━━ RIGHT: DETAILS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('DETAILS')}</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <FadeIn delay={100} duration={400}>
                            <Card className="border-border shadow-none overflow-hidden">
                                {[
                                    { label: t('Module ID'), value: <span className="font-mono font-medium">#{module.id}</span> },
                                    { label: t('Slug'), value: <span className="font-mono text-muted-foreground">{module.slug}</span> },
                                    { label: t('Status'), value: <Badge variant={module.active ? 'success' : 'outline'} className="text-[8px]">{module.active ? t('Active') : t('Inactive')}</Badge> },
                                    { label: t('Monthly Fee'), value: <span className="font-mono font-semibold">${Number(module.monthly_fee ?? 0).toFixed(2)}</span> },
                                    { label: t('Required Sensors'), value: (
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {(module.required_sensor_models ?? []).length > 0
                                                ? (module.required_sensor_models ?? []).map((s) => (
                                                    <Badge key={s} variant="outline" className="font-mono text-[8px]">{s}</Badge>
                                                ))
                                                : <span className="text-muted-foreground">—</span>}
                                        </div>
                                    ) },
                                    { label: t('Report Types'), value: (
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {(module.report_types ?? []).length > 0
                                                ? (module.report_types ?? []).map((r) => (
                                                    <Badge key={r} variant="outline" className="text-[8px]">{t(`report_${r}`)}</Badge>
                                                ))
                                                : <span className="text-muted-foreground">—</span>}
                                        </div>
                                    ) },
                                    { label: t('Color'), value: module.color ? (
                                        <div className="flex items-center gap-2">
                                            <span className="h-4 w-4 rounded" style={{ backgroundColor: module.color }} />
                                            <span className="font-mono text-[10px] text-muted-foreground">{module.color}</span>
                                        </div>
                                    ) : <span className="text-muted-foreground">—</span> },
                                    { label: t('Created'), value: <span className="font-mono">{new Date(module.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span> },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/20 last:border-b-0">
                                        <span className="text-[11px] text-muted-foreground">{item.label}</span>
                                        <span className="text-[11px]">{item.value}</span>
                                    </div>
                                ))}
                            </Card>
                        </FadeIn>
                    </div>
                </div>
            </div>

            <ConfirmationDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('Delete Module')}
                description={`${t('Delete')} "${module.name}"?`}
                warningMessage={sites.length > 0
                    ? `${sites.length} ${t('site(s) still use this module. Remove them first.')}`
                    : t('This action cannot be undone. The module will be permanently removed.')}
                onConfirm={() => {
                    router.delete(`/settings/modules-catalog/${module.id}`, {
                        onSuccess: () => router.get('/settings/modules-catalog'),
                    });
                }}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}
