import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DetailCard } from '@/components/ui/detail-card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { AlertRuleCondition, BreadcrumbItem, Recipe, Site, SiteRecipeOverride } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, FlaskConical, Pencil, Plus, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

/* ── Types ────────────────────────────────────────────────────────── */

interface SyncStatusItem {
    site_id: number;
    site_name: string;
    rule_count: number;
    outdated_count: number;
    status: 'synced' | 'outdated' | 'not_generated';
}

interface DeviceItem {
    id: number;
    name: string;
    model: string;
    zone: string | null;
    site_id: number;
    last_reading_at: string | null;
    status: string;
    site?: { id: number; name: string };
}

interface Props {
    recipe: Recipe;
    sites: Pick<Site, 'id' | 'name'>[];
    overrides: SiteRecipeOverride[];
    devices?: DeviceItem[];
    syncStatus?: SyncStatusItem[];
}

interface ConditionRow {
    metric: string;
    condition: string;
    threshold: string;
    duration_minutes: string;
    severity: string;
}

const EMPTY_CONDITION: ConditionRow = {
    metric: '',
    condition: 'above',
    threshold: '',
    duration_minutes: '0',
    severity: 'medium',
};

/* ── Main Component ───────────────────────────────────────────────── */

export default function RecipeShow({ recipe, sites, overrides, devices = [], syncStatus = [] }: Props) {
    const { t } = useLang();
    const { auth } = usePage<{ auth: { roles: string[] } }>().props;
    const isSuperAdmin = auth.roles?.includes('super_admin');

    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    function handleDelete() {
        setDeleteLoading(true);
        router.delete(`/recipes/${recipe.id}`, {
            onFinish: () => {
                setDeleteLoading(false);
                setDeleteOpen(false);
            },
        });
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Recipes', href: '/recipes' },
        { title: recipe.name, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={recipe.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start gap-4 p-6 md:p-8">
                            <Button variant="ghost" size="icon" onClick={() => router.get('/recipes')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex-1">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Recipe Detail')}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                                    <FlaskConical className="h-5 w-5 text-muted-foreground" />
                                    <h1 className="font-display text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                        {recipe.name}
                                    </h1>
                                </div>
                                {recipe.description && (
                                    <p className="mt-1 text-sm text-muted-foreground">{recipe.description}</p>
                                )}
                            </div>
                            {isSuperAdmin && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditOpen(true)}
                                    >
                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                        {t('Edit')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDeleteOpen(true)}
                                    >
                                        <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" />
                                        {t('Delete')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </FadeIn>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        {/* ── DEFAULT RULES section ───────────────── */}
                        <FadeIn delay={100} duration={500}>
                            <div>
                                <div className="mb-3 flex items-center gap-3">
                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Default Rules')}
                                    </p>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <Card className="shadow-elevation-1">
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            {t('Default Alert Rules')} (
                                            <span className="font-mono tabular-nums">
                                                {recipe.default_rules.length}
                                            </span>
                                            )
                                        </CardTitle>
                                    </CardHeader>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Metric')}</TableHead>
                                                <TableHead>{t('Condition')}</TableHead>
                                                <TableHead>{t('Threshold')}</TableHead>
                                                <TableHead>{t('Duration')}</TableHead>
                                                <TableHead>{t('Severity')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recipe.default_rules.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={5}
                                                        className="py-8 text-center text-sm text-muted-foreground"
                                                    >
                                                        {t('No default rules defined')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                recipe.default_rules.map((rule, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{rule.metric}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs">
                                                                {rule.condition}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono font-medium tabular-nums">
                                                            {rule.threshold}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm tabular-nums">
                                                            {rule.duration_minutes > 0
                                                                ? `${rule.duration_minutes} ${t('min')}`
                                                                : t('Instant')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <SeverityBadge severity={rule.severity} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </Card>
                            </div>
                        </FadeIn>

                        {/* ── OVERRIDES section ──────────────────── */}
                        {recipe.editable && sites.length > 0 && (
                            <FadeIn delay={200} duration={500}>
                                <div>
                                    <div className="mb-3 flex items-center gap-3">
                                        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {t('Overrides')}
                                        </p>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <OverrideThresholdsEditor
                                        recipe={recipe}
                                        sites={sites}
                                        overrides={overrides}
                                    />
                                </div>
                            </FadeIn>
                        )}

                        {/* ── Existing overrides ─────────────────── */}
                        {overrides.length > 0 && (
                            <FadeIn delay={300} duration={500}>
                                <ExistingOverrides
                                    overrides={overrides}
                                    sites={sites}
                                    defaultRules={recipe.default_rules}
                                />
                            </FadeIn>
                        )}
                    </div>

                    {/* ── DEVICES USING THIS RECIPE ────────────────── */}
                    {devices.length > 0 && (
                        <FadeIn delay={120} duration={400}>
                            <div className="mb-3 flex items-center gap-3">
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('DEVICES')}</span>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-[10px] text-muted-foreground/50">{devices.length}</span>
                            </div>
                            <Card className="border-border shadow-none overflow-hidden">
                                <div className="divide-y divide-border/20">
                                    {devices.slice(0, 5).map((d) => (
                                        <div key={d.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/30"
                                            onClick={() => router.get(`/devices/${d.id}`)}>
                                            <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${d.last_reading_at && new Date(d.last_reading_at) > new Date(Date.now() - 15 * 60000) ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12px] font-medium">{d.name}</p>
                                                <p className="font-mono text-[9px] text-muted-foreground/60">{d.site?.name}{d.zone ? ` · ${d.zone}` : ''}</p>
                                            </div>
                                            <span className="font-mono text-[10px] text-muted-foreground">{d.model}</span>
                                        </div>
                                    ))}
                                </div>
                                {devices.length > 5 && (
                                    <div className="border-t border-border/20 px-4 py-2 text-center">
                                        <span className="text-[11px] text-muted-foreground">+{devices.length - 5} {t('more devices')}</span>
                                    </div>
                                )}
                            </Card>
                        </FadeIn>
                    )}

                    {/* ── ALERT RULES SYNC STATUS ─────────────────── */}
                    {syncStatus.length > 0 && (
                        <FadeIn delay={150} duration={400}>
                            <div className="mb-3 mt-6 flex items-center gap-3">
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('ALERT RULES STATUS')}</span>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <div className="space-y-2">
                                {syncStatus.map((s) => (
                                    <Card key={s.site_id} className={`border-border shadow-none ${s.status === 'outdated' ? 'border-amber-200/30 dark:border-amber-800/20' : ''}`}>
                                        <div className="flex items-center gap-3 px-4 py-3">
                                            <span className={`h-2 w-2 shrink-0 rounded-full ${
                                                s.status === 'synced' ? 'bg-emerald-500' :
                                                s.status === 'outdated' ? 'bg-amber-400' : 'bg-muted-foreground/30'
                                            }`} />
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[12px] font-medium">{s.site_name}</span>
                                                <span className="ml-2 font-mono text-[9px] text-muted-foreground/60">
                                                    {s.rule_count} {t('rules')}
                                                    {s.status === 'outdated' && ` · ${s.outdated_count} ${t('outdated')}`}
                                                    {s.status === 'not_generated' && ` · ${t('not generated')}`}
                                                </span>
                                            </div>
                                            {s.status === 'synced' && <Badge variant="success" className="text-[8px]">{t('synced')}</Badge>}
                                            {s.status === 'outdated' && (
                                                <Button variant="outline" size="sm" className="h-7 text-[10px] text-amber-600 dark:text-amber-400 border-amber-200/40 dark:border-amber-800/40"
                                                    onClick={() => router.post(`/recipes/${recipe.id}/sync/${s.site_id}`, {}, { preserveScroll: true })}>
                                                    {t('Sync')}
                                                </Button>
                                            )}
                                            {s.status === 'not_generated' && (
                                                <Button variant="outline" size="sm" className="h-7 text-[10px]"
                                                    onClick={() => router.post(`/sites/${s.site_id}/rules/generate`, {}, { preserveScroll: true })}>
                                                    {t('Generate')}
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </FadeIn>
                    )}

                    {/* ── DETAILS sidebar ─────────────────────────── */}
                    <FadeIn delay={150} duration={500}>
                        <div className="space-y-6">
                            <div>
                                <div className="mb-3 flex items-center gap-3">
                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Details')}
                                    </p>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <DetailCard
                                    title={t('Details')}
                                    className="shadow-elevation-1"
                                    items={[
                                        { label: t('Name'), value: recipe.name },
                                        { label: t('Module'), value: recipe.module?.name ?? '--' },
                                        { label: t('Sensor Model'), value: <span className="font-mono tabular-nums">{recipe.sensor_model}</span> },
                                        { label: t('Editable'), value: recipe.editable ? t('Yes') : t('No') },
                                        { label: t('Default Rules'), value: <span className="font-mono tabular-nums">{recipe.default_rules.length}</span> },
                                        { label: t('Devices'), value: <span className="font-mono tabular-nums font-semibold">{devices.length}</span> },
                                        { label: t('Overrides'), value: <span className="font-mono tabular-nums">{overrides.length}</span> },
                                        { label: t('Created'), value: <span className="font-mono tabular-nums">{new Date(recipe.created_at).toLocaleDateString()}</span> },
                                    ]}
                                />
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </div>

            {/* ── Edit Dialog ──────────────────────────────────── */}
            {isSuperAdmin && (
                <RecipeEditDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    recipe={recipe}
                />
            )}

            {/* ── Delete Confirmation ──────────────────────────── */}
            <ConfirmationDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('Delete Recipe')}
                description={`Are you sure you want to delete "${recipe.name}"?`}
                warningMessage={t('This action cannot be undone. Any devices using this recipe will lose their recipe reference.')}
                loading={deleteLoading}
                onConfirm={handleDelete}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

/* ── Recipe Edit Dialog ──────────────────────────────────────────── */

function RecipeEditDialog({
    open,
    onOpenChange,
    recipe,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipe: Recipe;
}) {
    const { t } = useLang();

    // Form state
    const [name, setName] = useState(recipe.name);
    const [sensorModel, setSensorModel] = useState(recipe.sensor_model);
    const [description, setDescription] = useState(recipe.description ?? '');
    const [editable, setEditable] = useState(recipe.editable);
    const [conditions, setConditions] = useState<ConditionRow[]>(
        recipe.default_rules.map((rule) => ({
            metric: rule.metric,
            condition: rule.condition,
            threshold: String(rule.threshold),
            duration_minutes: String(rule.duration_minutes),
            severity: rule.severity,
        })),
    );
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const resetForm = useCallback(() => {
        setName(recipe.name);
        setSensorModel(recipe.sensor_model);
        setDescription(recipe.description ?? '');
        setEditable(recipe.editable);
        setConditions(
            recipe.default_rules.map((rule) => ({
                metric: rule.metric,
                condition: rule.condition,
                threshold: String(rule.threshold),
                duration_minutes: String(rule.duration_minutes),
                severity: rule.severity,
            })),
        );
        setErrors({});
    }, [recipe]);

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (nextOpen) resetForm();
            onOpenChange(nextOpen);
        },
        [onOpenChange, resetForm],
    );

    function addCondition() {
        setConditions((prev) => [...prev, { ...EMPTY_CONDITION }]);
    }

    function removeCondition(index: number) {
        if (conditions.length <= 1) return;
        setConditions((prev) => prev.filter((_, i) => i !== index));
    }

    function updateCondition(index: number, field: keyof ConditionRow, value: string) {
        setConditions((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const payload = {
            name,
            module_id: recipe.module_id,
            sensor_model: sensorModel,
            description: description || null,
            editable,
            default_rules: conditions.map((c) => ({
                metric: c.metric,
                condition: c.condition,
                threshold: Number(c.threshold),
                duration_minutes: Number(c.duration_minutes),
                severity: c.severity,
            })),
        };

        router.put(`/recipes/${recipe.id}`, payload, {
            onSuccess: () => {
                setProcessing(false);
                onOpenChange(false);
            },
            onError: (errs) => {
                setProcessing(false);
                setErrors(errs);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                <DialogHeader>
                    <DialogTitle>{t('Edit Recipe')}</DialogTitle>
                    <DialogDescription>
                        {t('Update the recipe details and default alert rules.')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Fields */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <Label htmlFor="recipe-name">{t('Name')} *</Label>
                            <Input
                                id="recipe-name"
                                className="mt-1.5"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                            )}
                        </div>

                        <div>
                            <Label>{t('Module')}</Label>
                            <Input
                                className="mt-1.5"
                                value={recipe.module?.name ?? '--'}
                                disabled
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('Module cannot be changed after creation.')}
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="sensor-model">{t('Sensor Model')} *</Label>
                            <Input
                                id="sensor-model"
                                className="mt-1.5 font-mono"
                                value={sensorModel}
                                onChange={(e) => setSensorModel(e.target.value)}
                                required
                            />
                            {errors.sensor_model && (
                                <p className="mt-1 text-xs text-destructive">{errors.sensor_model}</p>
                            )}
                        </div>

                        <div className="sm:col-span-2">
                            <Label htmlFor="description">{t('Description')}</Label>
                            <Textarea
                                id="description"
                                className="mt-1.5"
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('Optional description...')}
                            />
                        </div>

                        <div className="flex items-center gap-3 sm:col-span-2">
                            <Switch
                                id="editable-toggle"
                                checked={editable}
                                onCheckedChange={setEditable}
                            />
                            <Label htmlFor="editable-toggle">
                                {t('Allow site-level overrides')}
                            </Label>
                        </div>
                    </div>

                    {/* Conditions / Default Rules */}
                    <div>
                        <div className="mb-3 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Default Rules')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                            <Badge variant="outline" className="font-mono tabular-nums">
                                {conditions.length}
                            </Badge>
                        </div>

                        {errors.default_rules && (
                            <p className="mb-2 text-xs text-destructive">{errors.default_rules}</p>
                        )}

                        <div className="space-y-3">
                            {conditions.map((cond, idx) => (
                                <Card key={idx} className="shadow-sm">
                                    <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
                                        <CardTitle className="text-sm">
                                            {t('Rule')} {idx + 1}
                                        </CardTitle>
                                        {conditions.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => removeCondition(idx)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-5">
                                        <div>
                                            <Label className="text-xs">{t('Metric')}</Label>
                                            <Input
                                                className="mt-1"
                                                value={cond.metric}
                                                onChange={(e) =>
                                                    updateCondition(idx, 'metric', e.target.value)
                                                }
                                                placeholder="temperature"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">{t('Condition')}</Label>
                                            <Select
                                                value={cond.condition}
                                                onValueChange={(v) =>
                                                    updateCondition(idx, 'condition', v)
                                                }
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="above">{t('Above')}</SelectItem>
                                                    <SelectItem value="below">{t('Below')}</SelectItem>
                                                    <SelectItem value="equals">{t('Equals')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">{t('Threshold')}</Label>
                                            <Input
                                                type="number"
                                                step="any"
                                                className="mt-1 font-mono"
                                                value={cond.threshold}
                                                onChange={(e) =>
                                                    updateCondition(idx, 'threshold', e.target.value)
                                                }
                                                placeholder="8"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">{t('Duration (min)')}</Label>
                                            <Input
                                                type="number"
                                                className="mt-1 font-mono"
                                                min={0}
                                                value={cond.duration_minutes}
                                                onChange={(e) =>
                                                    updateCondition(idx, 'duration_minutes', e.target.value)
                                                }
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">{t('Severity')}</Label>
                                            <Select
                                                value={cond.severity}
                                                onValueChange={(v) =>
                                                    updateCondition(idx, 'severity', v)
                                                }
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="critical">{t('Critical')}</SelectItem>
                                                    <SelectItem value="high">{t('High')}</SelectItem>
                                                    <SelectItem value="medium">{t('Medium')}</SelectItem>
                                                    <SelectItem value="low">{t('Low')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-dashed"
                                onClick={addCondition}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add Rule')}
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <FlaskConical className="mr-2 h-4 w-4" />
                            {processing ? t('Saving...') : t('Save Changes')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* ── Override Thresholds Editor ────────────────────────────────── */

function OverrideThresholdsEditor({
    recipe,
    sites,
    overrides,
}: {
    recipe: Recipe;
    sites: Pick<Site, 'id' | 'name'>[];
    overrides: SiteRecipeOverride[];
}) {
    const { t } = useLang();

    const initialRules = recipe.default_rules.map((rule) => ({
        metric: rule.metric,
        condition: rule.condition,
        threshold: String(rule.threshold),
        duration_minutes: String(rule.duration_minutes),
        severity: rule.severity,
    }));

    const form = useForm({
        site_id: '',
        rules: initialRules,
    });

    function handleSiteChange(siteId: string): void {
        form.setData('site_id', siteId);

        const existingOverride = overrides.find((o) => String(o.site_id) === siteId);
        if (existingOverride) {
            form.setData(
                'rules',
                existingOverride.overridden_rules.map((rule) => ({
                    metric: rule.metric,
                    condition: rule.condition,
                    threshold: String(rule.threshold),
                    duration_minutes: String(rule.duration_minutes),
                    severity: rule.severity,
                })),
            );
        } else {
            form.setData('rules', initialRules);
        }
    }

    function handleRuleChange(index: number, field: 'threshold' | 'duration_minutes', value: string): void {
        const updated = [...form.data.rules];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('rules', updated);
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        form.post(`/recipes/${recipe.id}/overrides`, {
            onSuccess: () => form.clearErrors(),
        });
    }

    return (
        <Card className="shadow-elevation-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldAlert className="h-4 w-4" />
                    {t('Override Thresholds')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Site')}</Label>
                        <Select value={form.data.site_id} onValueChange={handleSiteChange}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select a site to override')} />
                            </SelectTrigger>
                            <SelectContent>
                                {sites.map((site) => (
                                    <SelectItem key={site.id} value={String(site.id)}>
                                        {site.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.site_id} />
                    </div>

                    {form.data.site_id && (
                        <>
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Metric')}</TableHead>
                                            <TableHead>{t('Condition')}</TableHead>
                                            <TableHead>{t('Threshold')}</TableHead>
                                            <TableHead>{t('Duration (min)')}</TableHead>
                                            <TableHead>{t('Severity')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {form.data.rules.map((rule, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{rule.metric}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {rule.condition}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        value={rule.threshold}
                                                        onChange={(e) =>
                                                            handleRuleChange(idx, 'threshold', e.target.value)
                                                        }
                                                        className="h-8 w-24 font-mono tabular-nums"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={rule.duration_minutes}
                                                        onChange={(e) =>
                                                            handleRuleChange(idx, 'duration_minutes', e.target.value)
                                                        }
                                                        className="h-8 w-20 font-mono tabular-nums"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <SeverityBadge severity={rule.severity} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <InputError message={form.errors.rules} />

                            <div className="flex justify-end">
                                <Button type="submit" disabled={form.processing}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {form.processing ? t('Saving...') : t('Save Overrides')}
                                </Button>
                            </div>
                        </>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}

/* ── Existing Overrides ───────────────────────────────────────── */

function ExistingOverrides({
    overrides,
    sites,
    defaultRules,
}: {
    overrides: SiteRecipeOverride[];
    sites: Pick<Site, 'id' | 'name'>[];
    defaultRules: AlertRuleCondition[];
}) {
    const { t } = useLang();

    function getSiteName(siteId: number): string {
        return sites.find((s) => s.id === siteId)?.name ?? `Site #${siteId}`;
    }

    function isChanged(override: AlertRuleCondition, ruleIndex: number): boolean {
        const defaultRule = defaultRules[ruleIndex];
        if (!defaultRule) return false;
        return override.threshold !== defaultRule.threshold || override.duration_minutes !== defaultRule.duration_minutes;
    }

    return (
        <Card className="shadow-elevation-1">
            <CardHeader>
                <CardTitle className="text-base">
                    {t('Existing Overrides')} (
                    <span className="font-mono tabular-nums">{overrides.length}</span>)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {overrides.map((override) => (
                    <div key={override.id} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-medium">{getSiteName(override.site_id)}</h4>
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {new Date(override.updated_at).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {override.overridden_rules.map((rule, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{rule.metric}</span>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`font-mono tabular-nums ${isChanged(rule, idx) ? 'font-semibold text-primary' : ''}`}
                                        >
                                            {rule.threshold}
                                        </span>
                                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                            {rule.duration_minutes > 0
                                                ? `${rule.duration_minutes} ${t('min')}`
                                                : t('Instant')}
                                        </span>
                                        <SeverityBadge severity={rule.severity} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

/* ── Severity Badge ───────────────────────────────────────────── */

function SeverityBadge({ severity }: { severity: string }) {
    const variants: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
        critical: 'destructive',
        high: 'warning',
        medium: 'info',
        low: 'outline',
    };
    return (
        <Badge variant={variants[severity] ?? 'outline'} className="text-xs">
            {severity}
        </Badge>
    );
}
