import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { FormSection } from '@/components/ui/form-section';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { AlertRule, BreadcrumbItem, Device, Site } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Cpu,
    Pencil,
    Plus,
    ShieldAlert,
    Trash2,
} from 'lucide-react';

interface Props {
    site: Site;
    rule: AlertRule;
    devices: Pick<Device, 'id' | 'name' | 'model' | 'zone'>[];
}

interface ConditionRow {
    metric: string;
    condition: string;
    threshold: string;
    duration_minutes: string;
    severity: string;
}

const SEVERITY_COLORS: Record<string, string> = {
    critical: 'text-red-600 dark:text-red-400',
    high: 'text-orange-600 dark:text-orange-400',
    medium: 'text-amber-600 dark:text-amber-400',
    low: 'text-blue-600 dark:text-blue-400',
};

export default function AlertRuleEdit({ site, rule, devices }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Alert Rules', href: `/sites/${site.id}/rules` },
        { title: rule.name, href: `/sites/${site.id}/rules/${rule.id}` },
        { title: 'Edit', href: '#' },
    ];

    const form = useForm<{
        name: string;
        severity: string;
        type: string;
        cooldown_minutes: number;
        device_id: string;
        conditions: ConditionRow[];
    }>({
        name: rule.name,
        severity: rule.severity,
        type: rule.type ?? 'simple',
        cooldown_minutes: rule.cooldown_minutes ?? 30,
        device_id: rule.device_id ? String(rule.device_id) : '',
        conditions: (rule.conditions ?? []).map((c) => ({
            metric: c.metric,
            condition: c.condition,
            threshold: String(c.threshold),
            duration_minutes: String(c.duration_minutes),
            severity: c.severity,
        })),
    });

    function addCondition() {
        form.setData('conditions', [
            ...form.data.conditions,
            { metric: '', condition: 'above', threshold: '', duration_minutes: '0', severity: 'medium' },
        ]);
    }

    function removeCondition(index: number) {
        if (form.data.conditions.length <= 1) return;
        form.setData(
            'conditions',
            form.data.conditions.filter((_, i) => i !== index),
        );
    }

    function updateCondition(index: number, field: keyof ConditionRow, value: string) {
        const updated = [...form.data.conditions];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('conditions', updated);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            ...form.data,
            device_id: form.data.device_id || null,
            cooldown_minutes: Number(form.data.cooldown_minutes),
            conditions: form.data.conditions.map((c) => ({
                ...c,
                threshold: Number(c.threshold),
                duration_minutes: Number(c.duration_minutes),
            })),
        };
        router.put(`/sites/${site.id}/rules/${rule.id}`, payload);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Edit')} ${rule.name} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start gap-4 p-6 md:p-8">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.get(`/sites/${site.id}/rules/${rule.id}`)}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Rule Builder')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Edit Rule')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {rule.name} · {site.name}
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ── Rule Settings ────────────────────────────── */}
                    <FadeIn delay={75} duration={400}>
                        <FormSection icon={ShieldAlert} title={t('Rule Settings')} description={t('Configure the alert rule')} className="shadow-elevation-1">
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="sm:col-span-2 lg:col-span-3">
                                    <Label htmlFor="name">{t('Rule Name')} *</Label>
                                    <Input
                                        id="name"
                                        className="mt-1.5"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        required
                                    />
                                    {form.errors.name && (
                                        <p className="mt-1 text-xs text-destructive">{form.errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <Label>{t('Severity')}</Label>
                                    <Select
                                        value={form.data.severity}
                                        onValueChange={(v) => form.setData('severity', v)}
                                    >
                                        <SelectTrigger className="mt-1.5">
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

                                <div>
                                    <Label>{t('Type')}</Label>
                                    <Select
                                        value={form.data.type}
                                        onValueChange={(v) => form.setData('type', v)}
                                    >
                                        <SelectTrigger className="mt-1.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="simple">{t('Simple')}</SelectItem>
                                            <SelectItem value="correlation">{t('Correlation')}</SelectItem>
                                            <SelectItem value="baseline">{t('Baseline')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="cooldown">{t('Cooldown (minutes)')}</Label>
                                    <Input
                                        id="cooldown"
                                        type="number"
                                        className="mt-1.5 font-mono"
                                        min={0}
                                        max={1440}
                                        value={form.data.cooldown_minutes}
                                        onChange={(e) =>
                                            form.setData('cooldown_minutes', Number(e.target.value))
                                        }
                                    />
                                </div>

                                <div className="sm:col-span-2 lg:col-span-3">
                                    <Label>{t('Device Scope')}</Label>
                                    <Select
                                        value={form.data.device_id || 'all'}
                                        onValueChange={(v) =>
                                            form.setData('device_id', v === 'all' ? '' : v)
                                        }
                                    >
                                        <SelectTrigger className="mt-1.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                <div className="flex items-center gap-2">
                                                    <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {t('All devices')}
                                                </div>
                                            </SelectItem>
                                            {devices.map((d) => (
                                                <SelectItem key={d.id} value={String(d.id)}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{d.name}</span>
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {d.model}
                                                        </span>
                                                        {d.zone && (
                                                            <span className="text-xs text-muted-foreground">
                                                                · {d.zone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </FormSection>
                    </FadeIn>

                    {/* ── Conditions ───────────────────────────────── */}
                    <FadeIn delay={150} duration={400}>
                        <div className="flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Conditions')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                            <Badge variant="outline" className="font-mono tabular-nums">
                                {form.data.conditions.length}
                            </Badge>
                        </div>
                        <div className="mt-2 space-y-3">
                            {form.data.conditions.map((cond, idx) => (
                                <Card key={idx} className="shadow-elevation-1">
                                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                                        <CardTitle className="text-sm">
                                            {t('Condition')} {idx + 1}
                                            {cond.severity && (
                                                <span
                                                    className={`ml-2 text-xs ${SEVERITY_COLORS[cond.severity] ?? ''}`}
                                                >
                                                    ({cond.severity})
                                                </span>
                                            )}
                                        </CardTitle>
                                        {form.data.conditions.length > 1 && (
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
                                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                                                    updateCondition(
                                                        idx,
                                                        'duration_minutes',
                                                        e.target.value,
                                                    )
                                                }
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
                                {t('Add Condition')}
                            </Button>
                        </div>
                    </FadeIn>

                    {/* ── Submit ───────────────────────────────────── */}
                    <FadeIn delay={225} duration={400}>
                        <div className="flex items-center justify-end gap-3 border-t pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.get(`/sites/${site.id}/rules/${rule.id}`)}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {form.processing ? t('Saving...') : t('Save Changes')}
                            </Button>
                        </div>
                    </FadeIn>
                </form>
            </div>
        </AppLayout>
    );
}
