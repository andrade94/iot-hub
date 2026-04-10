import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ModuleInfo {
    slug: string;
    name: string;
    recipes_count: number;
    required_sensor_models: string[];
}

interface OrgInfo {
    id: number;
    name: string;
    slug: string;
    sites_count: number;
}

interface SegmentData {
    id: number;
    name: string;
    label: string;
    description: string | null;
    suggested_modules: string[];
    icon: string | null;
    color: string | null;
    active: boolean;
    created_at: string;
}

interface Props {
    segment: SegmentData;
    modules: ModuleInfo[];
    organizations: OrgInfo[];
}

const moduleEmojis: Record<string, string> = {
    cold_chain: '🧊', energy: '⚡', compliance: '📋', industrial: '🏭',
    iaq: '🌬️', safety: '🛡️', people: '👥',
};

export default function SegmentShow({ segment, modules, organizations }: Props) {
    const { t } = useLang();
    const [deleteOpen, setDeleteOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Settings'), href: '/settings/profile' },
        { title: t('Segments'), href: '/settings/segments' },
        { title: segment.label, href: '#' },
    ];

    const suggestedModules = modules.filter((m) => segment.suggested_modules.includes(m.slug));
    const totalRecipes = suggestedModules.reduce((sum, m) => sum + m.recipes_count, 0);
    const allSensors = [...new Set(suggestedModules.flatMap((m) => m.required_sensor_models))];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${segment.label} — ${t('Segments')}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between">
                        <div>
                            <button onClick={() => router.get('/settings/segments')}
                                className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                <ArrowLeft className="h-3 w-3" />{t('Segments')}
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                                    style={{ backgroundColor: segment.color ? `${segment.color}15` : undefined }}>
                                    {segment.icon || '📡'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="font-display text-[28px] font-bold tracking-tight">{segment.label}</h1>
                                        <Badge variant={segment.active ? 'success' : 'outline'} className="text-[9px]">
                                            {segment.active ? t('Active') : t('Inactive')}
                                        </Badge>
                                    </div>
                                    <p className="mt-0.5 text-[13px] text-muted-foreground">{segment.description}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Switch checked={segment.active}
                                onCheckedChange={(active) => router.put(`/settings/segments/${segment.id}`, {
                                    ...segment, active, suggested_modules: segment.suggested_modules, suggested_sensor_models: [],
                                }, { preserveScroll: true })} />
                            <Button variant="outline" size="sm" className="text-[11px]"
                                onClick={() => router.get('/settings/segments')}>
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
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Organizations')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{organizations.length}</p>
                        </div>
                        <div className="flex-1 border-l border-border px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Modules')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{suggestedModules.length}</p>
                        </div>
                        <div className="flex-1 border-l border-border px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Recipes')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{totalRecipes}</p>
                        </div>
                        <div className="flex-1 border-l border-border px-5 py-3">
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Sensors')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{allSensors.length}</p>
                        </div>
                    </div>
                </FadeIn>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
                    {/* ━━ LEFT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <div>
                        {/* Suggested Modules */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('SUGGESTED MODULES')}</span>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] text-muted-foreground/50">{suggestedModules.length}</span>
                        </div>

                        <FadeIn delay={100} duration={400}>
                            {suggestedModules.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <p className="text-[13px] text-muted-foreground">{t('No modules suggested for this segment')}</p>
                                </div>
                            ) : (
                                <Card className="border-border shadow-none overflow-hidden">
                                    <div className="divide-y divide-border/20">
                                        {suggestedModules.map((mod) => (
                                            <div key={mod.slug} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                                onClick={() => router.get('/settings/modules-catalog')}>
                                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/30 text-base">
                                                    {moduleEmojis[mod.slug] ?? '📡'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-medium">{mod.name}</p>
                                                    <p className="text-[10px] text-muted-foreground/60">
                                                        {mod.recipes_count} {t('recipes')} · {mod.required_sensor_models.join(', ')}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {mod.required_sensor_models.map((s) => (
                                                        <Badge key={s} variant="outline" className="font-mono text-[8px]">{s}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </FadeIn>

                        {/* Organizations */}
                        <div className="flex items-center gap-4 mt-8 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('ORGANIZATIONS')}</span>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] text-muted-foreground/50">{organizations.length}</span>
                        </div>

                        <FadeIn delay={150} duration={400}>
                            {organizations.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <p className="text-[13px] text-muted-foreground">{t('No organizations in this segment')}</p>
                                </div>
                            ) : (
                                <Card className="border-border shadow-none overflow-hidden">
                                    <div className="divide-y divide-border/20">
                                        {organizations.map((org) => (
                                            <div key={org.id} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                                onClick={() => router.get(`/settings/organizations/${org.id}`)}>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-medium">{org.name}</p>
                                                    <p className="font-mono text-[9px] text-muted-foreground/60">{org.slug}</p>
                                                </div>
                                                <span className="font-mono text-[11px] text-muted-foreground">{org.sites_count} {t('sites')}</span>
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
                                    { label: t('Segment ID'), value: <span className="font-mono font-medium">#{segment.id}</span> },
                                    { label: t('Slug'), value: <span className="font-mono text-muted-foreground">{segment.name}</span> },
                                    { label: t('Status'), value: <Badge variant={segment.active ? 'success' : 'outline'} className="text-[8px]">{segment.active ? t('Active') : t('Inactive')}</Badge> },
                                    { label: t('Modules'), value: <span className="font-mono">{suggestedModules.length}</span> },
                                    { label: t('Required Sensors'), value: (
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {allSensors.length > 0
                                                ? allSensors.map((s) => <Badge key={s} variant="outline" className="font-mono text-[8px]">{s}</Badge>)
                                                : <span className="text-muted-foreground">—</span>}
                                        </div>
                                    ) },
                                    { label: t('Organizations'), value: <span className="font-mono font-semibold">{organizations.length}</span> },
                                    { label: t('Color'), value: segment.color ? (
                                        <div className="flex items-center gap-2">
                                            <span className="h-4 w-4 rounded" style={{ backgroundColor: segment.color }} />
                                            <span className="font-mono text-[10px] text-muted-foreground">{segment.color}</span>
                                        </div>
                                    ) : <span className="text-muted-foreground">—</span> },
                                    { label: t('Created'), value: <span className="font-mono">{new Date(segment.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span> },
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
                title={t('Delete Segment')}
                description={`${t('Delete')} "${segment.label}"?`}
                warningMessage={organizations.length > 0
                    ? `${organizations.length} ${t('organization(s) still reference this segment.')}`
                    : t('This action cannot be undone. The segment will be permanently removed.')}
                onConfirm={() => {
                    router.delete(`/settings/segments/${segment.id}`, {
                        onSuccess: () => router.get('/settings/segments'),
                    });
                }}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}
