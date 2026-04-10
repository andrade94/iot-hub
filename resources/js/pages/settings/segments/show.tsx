import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
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
    const [editOpen, setEditOpen] = useState(false);

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
                                onClick={() => setEditOpen(true)}>
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

            <SegmentEditDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                segment={segment}
                modules={modules}
            />
        </AppLayout>
    );
}

/* -- Edit Dialog --------------------------------------------------------- */

const moduleEmojisMap: Record<string, string> = {
    cold_chain: '🧊', energy: '⚡', compliance: '📋', industrial: '🏭',
    iaq: '🌬️', safety: '🛡️', people: '👥',
};

function SegmentEditDialog({ open, onOpenChange, segment, modules }: {
    open: boolean; onOpenChange: (open: boolean) => void; segment: SegmentData; modules: ModuleInfo[];
}) {
    const { t } = useLang();
    const form = useForm({
        name: segment.name,
        label: segment.label,
        description: segment.description ?? '',
        suggested_modules: segment.suggested_modules,
        suggested_sensor_models: [] as string[],
        icon: segment.icon ?? '',
        color: segment.color ?? '',
        active: segment.active,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        router.put(`/settings/segments/${segment.id}`, {
            ...form.data,
            description: form.data.description || null,
            icon: form.data.icon || null,
            color: form.data.color || null,
        }, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    }

    function toggleModule(slug: string) {
        const current = form.data.suggested_modules;
        const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
        form.setData('suggested_modules', next);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                <DialogHeader>
                    <DialogTitle>{t('Edit Segment')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('Name')}</Label>
                            <Input value={form.data.label} onChange={(e) => {
                                form.setData('label', e.target.value);
                                const slug = e.target.value.toLowerCase().trim().replace(/[^a-z0-9\s_]/g, '').replace(/[\s]+/g, '_').replace(/_+/g, '_');
                                form.setData('name', slug);
                            }} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Slug')}</Label>
                            <div className="flex h-9 items-center rounded-md border border-border bg-muted/30 px-3">
                                <span className="font-mono text-[12px] text-muted-foreground">{form.data.name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('Description')}</Label>
                        <Textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={2} />
                    </div>

                    <div className="space-y-2">
                        <Label>{t('Suggested Modules')}</Label>
                        <div className="flex flex-wrap gap-2 rounded-md border border-border p-3">
                            {modules.map((mod) => {
                                const isChecked = form.data.suggested_modules.includes(mod.slug);
                                const emoji = moduleEmojisMap[mod.slug] ?? '📡';
                                return (
                                    <label key={mod.slug} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] transition-colors',
                                        isChecked ? 'border-primary bg-primary/5 text-foreground font-medium' : 'border-border text-muted-foreground hover:bg-accent/30')}>
                                        <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleModule(mod.slug)} />
                                        <span className={cn('h-3 w-3 shrink-0 rounded border-2 flex items-center justify-center',
                                            isChecked ? 'border-primary bg-primary' : 'border-muted-foreground/30')}>
                                            {isChecked && <span className="text-[8px] text-primary-foreground font-bold">✓</span>}
                                        </span>
                                        {emoji} {mod.name}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('Icon')}</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20 text-xl">
                                    {form.data.icon || '📡'}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {['🏪', '🏭', '💊', '🏨', '🏢', '🚛', '🧊', '⚡', '🛡️', '🌡️'].map((emoji) => (
                                        <button key={emoji} type="button" onClick={() => form.setData('icon', emoji)}
                                            className={cn('flex h-7 w-7 items-center justify-center rounded text-sm transition-all',
                                                form.data.icon === emoji ? 'bg-primary/15 ring-1 ring-primary' : 'hover:bg-accent/40')}>
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Color')}</Label>
                            <div className="flex items-center gap-3">
                                <input type="color" value={form.data.color || '#06b6d4'}
                                    onChange={(e) => form.setData('color', e.target.value)}
                                    className="h-10 w-10 shrink-0 cursor-pointer appearance-none rounded-lg border border-border bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none" />
                                <div className="flex flex-wrap gap-1">
                                    {['#06b6d4', '#22c55e', '#f59e0b', '#f43f5e', '#8b5cf6', '#3b82f6'].map((c) => (
                                        <button key={c} type="button" onClick={() => form.setData('color', c)}
                                            className={cn('h-6 w-6 rounded-full border-2 transition-all',
                                                form.data.color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-110')}
                                            style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Switch checked={form.data.active} onCheckedChange={(v) => form.setData('active', v)} />
                        <Label>{t('Active')}</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
                        <Button type="submit" disabled={form.processing}>{t('Save Changes')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
