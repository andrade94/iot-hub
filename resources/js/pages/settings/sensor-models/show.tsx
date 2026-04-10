import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface RecipeInfo {
    id: number;
    name: string;
    description: string | null;
    default_rules_count: number;
    devices_count: number;
}

interface SensorModelData {
    id: number;
    name: string;
    label: string;
    manufacturer: string | null;
    description: string | null;
    supported_metrics: string[];
    valid_ranges: Record<string, [number, number]> | null;
    monthly_fee: string | null;
    decoder_class: string | null;
    active: boolean;
    created_at: string;
}

interface Props {
    sensorModel: SensorModelData;
    deviceCount: number;
    recipes: RecipeInfo[];
    metricUnits: Record<string, string>;
}

export default function SensorModelShow({ sensorModel, deviceCount, recipes, metricUnits }: Props) {
    const { t } = useLang();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Settings'), href: '/settings/profile' },
        { title: t('Sensor Models'), href: '/settings/sensor-models' },
        { title: sensorModel.name, href: '#' },
    ];

    const totalRecipeRules = recipes.reduce((sum, r) => sum + r.default_rules_count, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${sensorModel.name} — ${t('Sensor Models')}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between">
                        <div>
                            <button onClick={() => router.get('/settings/sensor-models')}
                                className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                <ArrowLeft className="h-3 w-3" />{t('Sensor Models')}
                            </button>
                            <div className="flex items-center gap-3">
                                <h1 className="font-mono text-[28px] font-bold tracking-tight">{sensorModel.name}</h1>
                                <Badge variant={sensorModel.active ? 'success' : 'outline'} className="text-[9px]">
                                    {sensorModel.active ? t('Active') : t('Inactive')}
                                </Badge>
                            </div>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                {sensorModel.label} · {sensorModel.manufacturer ?? 'Unknown'} · ${Number(sensorModel.monthly_fee ?? 0).toFixed(2)}/mo
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Switch checked={sensorModel.active}
                                onCheckedChange={(active) => router.put(`/settings/sensor-models/${sensorModel.id}`, {
                                    ...sensorModel, active, sort_order: 0,
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
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Metrics')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{sensorModel.supported_metrics.length}</p>
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
                            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">{t('Rules')}</p>
                            <p className="mt-1 font-display text-2xl font-bold">{totalRecipeRules}</p>
                        </div>
                    </div>
                </FadeIn>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
                    {/* ━━ LEFT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <div>
                        {/* Metrics & Ranges */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('METRICS & RANGES')}</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <FadeIn delay={100} duration={400}>
                            <Card className="border-border shadow-none overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border/30">
                                            <th className="text-left px-4 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Metric')}</th>
                                            <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Key')}</th>
                                            <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Min')}</th>
                                            <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Max')}</th>
                                            <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Unit')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sensorModel.supported_metrics.map((metric) => {
                                            const range = sensorModel.valid_ranges?.[metric];
                                            return (
                                                <tr key={metric} className="border-b border-border/20 last:border-b-0">
                                                    <td className="px-4 py-3.5 text-[13px] font-medium">{t(`metric_${metric}`)}</td>
                                                    <td className="px-3 py-3.5 font-mono text-[11px] text-muted-foreground">{metric}</td>
                                                    <td className="px-3 py-3.5 font-mono text-[14px] font-bold">{range?.[0] ?? '—'}</td>
                                                    <td className="px-3 py-3.5 font-mono text-[14px] font-bold">{range?.[1] ?? '—'}</td>
                                                    <td className="px-3 py-3.5 font-mono text-[11px] text-muted-foreground">{metricUnits[metric] ?? ''}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </Card>
                        </FadeIn>

                        {/* Recipes */}
                        <div className="flex items-center gap-4 mt-8 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('RECIPES')}</span>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] text-muted-foreground/50">{recipes.length}</span>
                        </div>

                        <FadeIn delay={150} duration={400}>
                            {recipes.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <p className="text-[13px] text-muted-foreground">{t('No recipes use this sensor model')}</p>
                                </div>
                            ) : (
                                <Card className="border-border shadow-none overflow-hidden">
                                    <div className="divide-y divide-border/20">
                                        {recipes.map((recipe) => (
                                            <div key={recipe.id} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                                onClick={() => router.get(`/recipes/${recipe.id}`)}>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-medium">{recipe.name}</p>
                                                    <p className="text-[10px] text-muted-foreground/60">
                                                        {recipe.default_rules_count} {t('rules')} · {recipe.devices_count} {t('devices')}
                                                        {recipe.description && ` · ${recipe.description}`}
                                                    </p>
                                                </div>
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
                                    { label: t('Model'), value: <span className="font-mono font-bold">{sensorModel.name}</span> },
                                    { label: t('Label'), value: <span className="font-medium">{sensorModel.label}</span> },
                                    { label: t('Manufacturer'), value: sensorModel.manufacturer ?? '—' },
                                    { label: t('Monthly Fee'), value: <span className="font-mono font-semibold">${Number(sensorModel.monthly_fee ?? 0).toFixed(2)}</span> },
                                    { label: t('Decoder'), value: <span className="font-mono text-[10px] text-muted-foreground">{sensorModel.decoder_class ?? '—'}</span> },
                                    { label: t('Metrics'), value: <span className="font-mono">{sensorModel.supported_metrics.length}</span> },
                                    { label: t('Devices'), value: <span className="font-mono font-semibold">{deviceCount}</span> },
                                    { label: t('Recipes'), value: <span className="font-mono">{recipes.length}</span> },
                                    { label: t('Status'), value: <Badge variant={sensorModel.active ? 'success' : 'outline'} className="text-[8px]">{sensorModel.active ? t('Active') : t('Inactive')}</Badge> },
                                    { label: t('Created'), value: <span className="font-mono">{new Date(sensorModel.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span> },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/20 last:border-b-0">
                                        <span className="text-[11px] text-muted-foreground">{item.label}</span>
                                        <span className="text-[11px]">{item.value}</span>
                                    </div>
                                ))}
                            </Card>
                        </FadeIn>

                        {/* Description */}
                        {sensorModel.description && (
                            <FadeIn delay={120} duration={400}>
                                <div className="mt-4 rounded-lg border border-border bg-card p-4">
                                    <p className="font-mono text-[9px] font-semibold tracking-[0.1em] text-muted-foreground/60 mb-2">{t('DESCRIPTION')}</p>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed">{sensorModel.description}</p>
                                </div>
                            </FadeIn>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('Delete Sensor Model')}
                description={`${t('Delete')} "${sensorModel.name}"?`}
                warningMessage={deviceCount > 0
                    ? `${deviceCount} ${t('device(s) still reference this model. Remove them first.')}`
                    : t('This action cannot be undone.')}
                onConfirm={() => {
                    router.delete(`/settings/sensor-models/${sensorModel.id}`, {
                        onSuccess: () => router.get('/settings/sensor-models'),
                    });
                }}
                actionLabel={t('Delete')}
            />

            <SensorModelEditDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                sensorModel={sensorModel}
                metricUnits={metricUnits}
            />
        </AppLayout>
    );
}

/* -- Edit Dialog --------------------------------------------------------- */

const ALL_METRICS = ['temperature', 'humidity', 'co2', 'pm2_5', 'current', 'door_status', 'gas_level', 'gas_alarm', 'distance', 'pressure', 'people_count', 'battery_pct'];

function SensorModelEditDialog({ open, onOpenChange, sensorModel, metricUnits }: {
    open: boolean; onOpenChange: (open: boolean) => void; sensorModel: SensorModelData; metricUnits: Record<string, string>;
}) {
    const { t } = useLang();
    const form = useForm({
        name: sensorModel.name,
        label: sensorModel.label,
        manufacturer: sensorModel.manufacturer ?? 'Milesight',
        description: sensorModel.description ?? '',
        supported_metrics: sensorModel.supported_metrics,
        valid_ranges: sensorModel.valid_ranges ?? {} as Record<string, [number, number]>,
        monthly_fee: sensorModel.monthly_fee ?? '0.00',
        decoder_class: sensorModel.decoder_class ?? '',
        active: sensorModel.active,
        sort_order: 0,
    });

    function toggleMetric(metric: string) {
        const current = form.data.supported_metrics;
        if (current.includes(metric)) {
            form.setData('supported_metrics', current.filter((m) => m !== metric));
            const ranges = { ...form.data.valid_ranges };
            delete ranges[metric];
            form.setData('valid_ranges', ranges);
        } else {
            form.setData('supported_metrics', [...current, metric]);
        }
    }

    function setRange(metric: string, idx: 0 | 1, value: string) {
        const ranges = { ...form.data.valid_ranges };
        if (!ranges[metric]) ranges[metric] = [0, 100] as [number, number];
        ranges[metric] = [...ranges[metric]] as [number, number];
        ranges[metric][idx] = Number(value);
        form.setData('valid_ranges', ranges);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        router.put(`/settings/sensor-models/${sensorModel.id}`, {
            ...form.data,
            description: form.data.description || null,
            monthly_fee: form.data.monthly_fee ? parseFloat(String(form.data.monthly_fee)) : null,
            decoder_class: form.data.decoder_class || null,
        }, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                <DialogHeader>
                    <DialogTitle>{t('Edit Sensor Model')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name + Label */}
                    <div className="grid grid-cols-[1fr_1.5fr] gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Model (SKU)')}</Label>
                            <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)}
                                className="font-mono text-[13px] font-bold" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Label')}</Label>
                            <Input value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} />
                        </div>
                    </div>

                    {/* Manufacturer + Fee */}
                    <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Manufacturer')}</Label>
                            <Input value={form.data.manufacturer} onChange={(e) => form.setData('manufacturer', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Monthly Fee')}</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] font-semibold text-muted-foreground/50">$</span>
                                <Input type="number" step="0.01" min="0" value={form.data.monthly_fee}
                                    onChange={(e) => form.setData('monthly_fee', e.target.value)}
                                    onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) form.setData('monthly_fee', v.toFixed(2)); }}
                                    className="pl-8 font-mono text-[13px] font-bold tabular-nums" />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label className="text-[11px]">{t('Description')}</Label>
                        <Input value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                    </div>

                    {/* Supported Metrics */}
                    <div className="space-y-1.5">
                        <Label className="text-[11px]">{t('Supported Metrics')}</Label>
                        <div className="flex flex-wrap gap-2 rounded-md border border-border p-3">
                            {ALL_METRICS.map((m) => {
                                const isChecked = form.data.supported_metrics.includes(m);
                                return (
                                    <label key={m} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] transition-colors',
                                        isChecked ? 'border-primary bg-primary/5 text-foreground font-medium' : 'border-border text-muted-foreground hover:bg-accent/30')}>
                                        <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleMetric(m)} />
                                        <span className={cn('h-3 w-3 shrink-0 rounded border-2 flex items-center justify-center',
                                            isChecked ? 'border-primary bg-primary' : 'border-muted-foreground/30')}>
                                            {isChecked && <span className="text-[8px] text-primary-foreground font-bold">✓</span>}
                                        </span>
                                        {t(`metric_${m}`)}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Valid Ranges — dynamic per selected metric */}
                    {form.data.supported_metrics.length > 0 && (
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Valid Ranges')}</Label>
                            <div className="rounded-md border border-border overflow-hidden">
                                <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-border/30">
                                    <div className="px-3 py-2 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Metric')}</div>
                                    <div className="px-3 py-2 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Min')}</div>
                                    <div className="px-3 py-2 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Max')}</div>
                                </div>
                                {form.data.supported_metrics.map((metric) => {
                                    const range = form.data.valid_ranges[metric] ?? [0, 100];
                                    return (
                                        <div key={metric} className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-border/20 last:border-b-0 items-center">
                                            <div className="px-3 py-2 text-[11px]">
                                                {t(`metric_${metric}`)} <span className="text-[9px] text-muted-foreground/50">{metricUnits[metric] ?? ''}</span>
                                            </div>
                                            <div className="px-2 py-1.5">
                                                <Input type="number" value={range[0]} onChange={(e) => setRange(metric, 0, e.target.value)}
                                                    className="h-7 text-center font-mono text-[12px] font-semibold" />
                                            </div>
                                            <div className="px-2 py-1.5">
                                                <Input type="number" value={range[1]} onChange={(e) => setRange(metric, 1, e.target.value)}
                                                    className="h-7 text-center font-mono text-[12px] font-semibold" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Decoder + Active */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Decoder')}</Label>
                            <Input value={form.data.decoder_class} onChange={(e) => form.setData('decoder_class', e.target.value)}
                                className="font-mono text-[11px]" placeholder="MilesightDecoder" />
                        </div>
                        <div className="flex items-end gap-3 pb-1">
                            <Switch checked={form.data.active} onCheckedChange={(v) => form.setData('active', v)} />
                            <Label className="text-[11px]">{t('Active')}</Label>
                        </div>
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
