import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Copy, Plus, Rocket, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

interface SiteTemplateRecord {
    id: number;
    name: string;
    description: string | null;
    modules: string[];
    zone_config: { name: string }[] | null;
    recipe_assignments: { zone: string; recipe_id: number }[] | null;
    alert_rules: { name: string }[] | null;
    maintenance_windows: { title: string; zone: string | null }[] | null;
    escalation_structure: unknown;
    created_at: string;
    created_by_user?: { name: string };
}

interface SiteOption {
    id: number;
    name: string;
    has_escalation_chain: boolean;
}

interface Props {
    templates: SiteTemplateRecord[];
    sites: SiteOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/organization' },
    { title: 'Site Templates', href: '#' },
];

export default function SiteTemplatesIndex({ templates, sites }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTemplate, setDeleteTemplate] = useState<SiteTemplateRecord | null>(null);
    const [applyTemplate, setApplyTemplate] = useState<SiteTemplateRecord | null>(null);
    const [applySiteId, setApplySiteId] = useState<string>('');
    const [applyProcessing, setApplyProcessing] = useState(false);

    const applyTargetSite = sites.find((s) => s.id.toString() === applySiteId);
    const escalationConflict = !!(
        applyTemplate &&
        applyTemplate.escalation_structure &&
        applyTargetSite?.has_escalation_chain
    );

    const siteTemplateSchema = z.object({
        source_site_id: z.string().min(1, 'Source site is required'),
        name: z.string().min(1, 'Template name is required'),
        description: z.string(),
    });

    const createForm = useValidatedForm(siteTemplateSchema, { source_site_id: '', name: '', description: '' });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Site Templates')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-center justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Site Templates')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Configuration Blueprints')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium tabular-nums text-foreground">{templates.length}</span>{' '}
                                    {t('template(s) saved')}
                                </p>
                            </div>
                            <Can permission="manage site templates">
                                <Button onClick={() => setShowCreate(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('Create Template')}
                                </Button>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Section Divider ─────────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div className="flex items-center gap-3">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('All Templates')}
                        </p>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>

                {/* ── Content ─────────────────────────────────────── */}
                {templates.length === 0 ? (
                    <FadeIn delay={150} duration={500}>
                        <EmptyState
                            icon={Copy}
                            title={t('No site templates')}
                            description={t('Templates capture modules, zones, recipes, and escalation chains from an existing site.')}
                        />
                    </FadeIn>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {templates.map((tmpl, index) => (
                            <FadeIn key={tmpl.id} delay={150 + index * 75} duration={400}>
                                <Card className="flex h-full flex-col shadow-elevation-1">
                                    <CardHeader>
                                        <CardTitle className="text-base">{tmpl.name}</CardTitle>
                                        {tmpl.description && (
                                            <p className="text-sm text-muted-foreground">{tmpl.description}</p>
                                        )}
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-2">
                                        <div className="flex flex-wrap gap-1">
                                            {tmpl.modules.map((m) => (
                                                <Badge key={m} variant="outline" className="text-xs">
                                                    {m}
                                                </Badge>
                                            ))}
                                        </div>
                                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                                            <span className="font-medium text-foreground">{tmpl.zone_config?.length ?? 0}</span> {t('zones')} &middot;{' '}
                                            <span className="font-medium text-foreground">{tmpl.recipe_assignments?.length ?? 0}</span> {t('recipes')} &middot;{' '}
                                            <span className="font-medium text-foreground">{tmpl.alert_rules?.length ?? 0}</span> {t('rules')} &middot;{' '}
                                            <span className="font-medium text-foreground">{tmpl.maintenance_windows?.length ?? 0}</span> {t('windows')}
                                        </p>
                                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                                            {t('Created')} {new Date(tmpl.created_at).toLocaleDateString()} {t('by')} {tmpl.created_by_user?.name}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="gap-2">
                                        <Can permission="manage site templates">
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setApplyTemplate(tmpl);
                                                    setApplySiteId('');
                                                }}
                                            >
                                                <Rocket className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Apply')}
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setDeleteTemplate(tmpl)}>
                                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Delete')}
                                            </Button>
                                        </Can>
                                    </CardFooter>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                )}

                {/* ── Create Template Dialog ──────────────────────── */}
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('Create Site Template')}</DialogTitle>
                            <DialogDescription>{t('Capture configuration from an existing site.')}</DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                createForm.submit('post', '/settings/site-templates', {
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        createForm.reset();
                                        setShowCreate(false);
                                    },
                                });
                            }}
                            className="space-y-4"
                        >
                            <div className="grid gap-2">
                                <Label>{t('Source Site')}</Label>
                                <Select value={createForm.data.source_site_id} onValueChange={(v) => createForm.setData('source_site_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select site')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sites.map((s) => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={createForm.errors.source_site_id} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Template Name')}</Label>
                                <Input
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    placeholder={t('e.g., Standard Cold Chain Store')}
                                />
                                <InputError message={createForm.errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Description')}</Label>
                                <Textarea
                                    value={createForm.data.description}
                                    onChange={(e) => createForm.setData('description', e.target.value)}
                                    placeholder={t('Optional description...')}
                                    rows={2}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={createForm.processing}>
                                    {t('Create Template')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ── Apply Template Dialog ──────────────────────── */}
                <Dialog open={!!applyTemplate} onOpenChange={(open) => !open && setApplyTemplate(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('Apply Template')}</DialogTitle>
                            <DialogDescription>
                                {applyTemplate && (
                                    <>
                                        {t('Apply')} <strong className="text-foreground">{applyTemplate.name}</strong> {t('to a target site.')}
                                    </>
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        {applyTemplate && (
                            <div className="space-y-4">
                                {/* Preview: what will be applied */}
                                <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-[11px]">
                                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
                                        {t('Will be applied')}
                                    </p>
                                    <ul className="mt-2 space-y-1 text-muted-foreground">
                                        <li>
                                            <span className="font-mono tabular-nums text-foreground">{applyTemplate.modules.length}</span>{' '}
                                            {t('module(s)')}
                                        </li>
                                        <li>
                                            <span className="font-mono tabular-nums text-foreground">{applyTemplate.alert_rules?.length ?? 0}</span>{' '}
                                            {t('alert rule(s)')}{' '}
                                            <span className="text-muted-foreground/60">({t('skipped if same name exists')})</span>
                                        </li>
                                        <li>
                                            <span className="font-mono tabular-nums text-foreground">{applyTemplate.maintenance_windows?.length ?? 0}</span>{' '}
                                            {t('maintenance window(s)')}
                                        </li>
                                        <li>
                                            {applyTemplate.escalation_structure ? (
                                                <span className="text-foreground">{t('Escalation chain')}</span>
                                            ) : (
                                                <span className="text-muted-foreground/60">{t('No escalation chain to apply')}</span>
                                            )}
                                        </li>
                                    </ul>
                                </div>

                                <div className="grid gap-2">
                                    <Label>{t('Target Site')}</Label>
                                    <Select value={applySiteId} onValueChange={setApplySiteId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select site')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sites.map((s) => (
                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                    {s.name}
                                                    {s.has_escalation_chain && (
                                                        <span className="ml-2 text-[9px] text-amber-500">
                                                            ({t('has chain')})
                                                        </span>
                                                    )}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Conflict warning */}
                                {escalationConflict && (
                                    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-[11px]">
                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                                        <div className="text-amber-700 dark:text-amber-400">
                                            <p className="font-medium">{t('Existing escalation chain will be replaced.')}</p>
                                            <p className="mt-0.5 text-muted-foreground">
                                                {t('The target site already has an escalation chain. Applying this template will overwrite it.')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-1">
                                    <Button type="button" variant="ghost" onClick={() => setApplyTemplate(null)} disabled={applyProcessing}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={!applySiteId || applyProcessing}
                                        onClick={() => {
                                            if (!applyTemplate || !applySiteId) return;
                                            setApplyProcessing(true);
                                            router.post(
                                                `/settings/site-templates/${applyTemplate.id}/apply`,
                                                { site_id: Number(applySiteId) },
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: () => {
                                                        setApplyTemplate(null);
                                                        setApplySiteId('');
                                                    },
                                                    onFinish: () => setApplyProcessing(false),
                                                },
                                            );
                                        }}
                                    >
                                        {applyProcessing ? t('Applying...') : t('Apply Template')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <ConfirmationDialog
                    open={!!deleteTemplate}
                    onOpenChange={(open) => !open && setDeleteTemplate(null)}
                    title={t('Delete Template')}
                    description={t(`Delete "${deleteTemplate?.name}"? Existing sites using this template are not affected.`)}
                    warningMessage={t('This cannot be undone.')}
                    onConfirm={() => {
                        if (deleteTemplate) {
                            router.delete(`/settings/site-templates/${deleteTemplate.id}`, {
                                preserveScroll: true,
                                onSuccess: () => setDeleteTemplate(null),
                            });
                        }
                    }}
                    actionLabel={t('Delete')}
                />
            </div>
        </AppLayout>
    );
}
