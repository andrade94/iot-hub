import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { AlertRule, BreadcrumbItem, Device, Site } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, X } from 'lucide-react';

interface AvailableMetric {
    key: string;
    unit: string;
}

interface Props {
    site: Site;
    rule: AlertRule;
    devices: Pick<Device, 'id' | 'name' | 'model' | 'zone'>[];
    availableMetrics?: AvailableMetric[];
}

const severityDot: Record<string, string> = {
    critical: 'bg-rose-500', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-blue-400',
};

const severityVariant: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
    critical: 'destructive', high: 'warning', medium: 'info', low: 'outline',
};

export default function AlertRuleEdit({ site, rule, devices, availableMetrics = [] }: Props) {
    const { t } = useLang();

    const form = useForm({
        name: rule.name,
        severity: rule.severity,
        cooldown_minutes: rule.cooldown_minutes,
        device_id: rule.device_id ? String(rule.device_id) : '',
        active: rule.active,
        conditions: rule.conditions.map((c) => ({
            metric: c.metric,
            condition: c.condition,
            threshold: String(c.threshold),
            duration_minutes: String(c.duration_minutes),
            severity: c.severity,
        })),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: t('Alert Rules'), href: `/sites/${site.id}/rules` },
        { title: rule.name, href: `/sites/${site.id}/rules/${rule.id}` },
        { title: t('Edit'), href: '#' },
    ];

    function addCondition() {
        form.setData('conditions', [
            ...form.data.conditions,
            { metric: '', condition: 'above', threshold: '', duration_minutes: '0', severity: form.data.severity },
        ]);
    }

    function removeCondition(idx: number) {
        form.setData('conditions', form.data.conditions.filter((_, i) => i !== idx));
    }

    function updateCondition(idx: number, field: string, value: string) {
        const updated = [...form.data.conditions];
        updated[idx] = { ...updated[idx], [field]: value };
        form.setData('conditions', updated);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            ...form.data,
            device_id: form.data.device_id || null,
            conditions: form.data.conditions.map((c) => ({
                ...c,
                threshold: Number(c.threshold),
                duration_minutes: Number(c.duration_minutes),
                severity: form.data.severity,
            })),
        };
        router.put(`/sites/${site.id}/rules/${rule.id}`, payload);
    }

    const metricUnits = Object.fromEntries(availableMetrics.map((m) => [m.key, m.unit]));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Edit')} ${rule.name} — ${site.name}`} />
            <form onSubmit={handleSubmit}>
                <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
                    {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <FadeIn direction="down" duration={400}>
                        <div className="flex items-start justify-between">
                            <div>
                                <button type="button" onClick={() => router.get(`/sites/${site.id}/rules/${rule.id}`)}
                                    className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                    <ArrowLeft className="h-3 w-3" />{rule.name}
                                </button>
                                <h1 className="font-display text-[28px] font-bold tracking-tight">{t('Edit Alert Rule')}</h1>
                                <p className="mt-1 text-[13px] text-muted-foreground">{site.name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-muted-foreground">{t('Active')}</span>
                                <Switch checked={form.data.active} onCheckedChange={(v) => form.setData('active', v)} />
                                <Button type="button" variant="outline" size="sm" className="text-[11px]"
                                    onClick={() => router.get(`/sites/${site.id}/rules/${rule.id}`)}>{t('Cancel')}</Button>
                                <Button type="submit" size="sm" className="text-[11px]" disabled={form.processing || !form.data.name.trim()}>
                                    {t('Save Changes')}
                                </Button>
                            </div>
                        </div>
                    </FadeIn>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                        {/* ━━ LEFT: FORM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                        <div>
                            <FadeIn delay={50} duration={400}>
                                <Card className="border-border shadow-none">
                                    <CardContent className="p-5 space-y-5">
                                        <div>
                                            <Label className="text-[11px]">{t('Rule Name')}</Label>
                                            <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)}
                                                className="mt-1 text-[13px] font-medium" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-[11px]">{t('Severity')}</Label>
                                                <Select value={form.data.severity} onValueChange={(v) => form.setData('severity', v as typeof form.data.severity)}>
                                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {['critical', 'high', 'medium', 'low'].map((s) => (
                                                            <SelectItem key={s} value={s}>
                                                                <span className="flex items-center gap-2">
                                                                    <span className={cn('h-2 w-2 rounded-full', severityDot[s])} />
                                                                    <span className="capitalize">{t(s)}</span>
                                                                </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-[11px]">{t('Cooldown')}</Label>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <Input type="number" min={0} max={1440} value={form.data.cooldown_minutes}
                                                        onChange={(e) => form.setData('cooldown_minutes', Number(e.target.value))}
                                                        className="font-mono text-[12px]" />
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">min</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-[11px]">{t('Device Scope')}</Label>
                                            <Select value={form.data.device_id || 'all'} onValueChange={(v) => form.setData('device_id', v === 'all' ? '' : v)}>
                                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('All devices at this site')}</SelectItem>
                                                    {devices.map((d) => (
                                                        <SelectItem key={d.id} value={String(d.id)}>
                                                            {d.name} <span className="text-muted-foreground">· {d.model}</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>

                            {/* ━━ CONDITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                            <div className="my-7 flex items-center gap-4">
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('CONDITIONS')}</span>
                                <div className="h-px flex-1 bg-border" />
                            </div>

                            {form.data.conditions.map((cond, idx) => (
                                <div key={idx}>
                                    {idx > 0 && (
                                        <div className="flex items-center justify-center py-1">
                                            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-0.5 font-mono text-[9px] font-semibold tracking-[0.1em] text-primary">AND</span>
                                        </div>
                                    )}
                                    <Card className="border-border shadow-none mb-2">
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 items-end">
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground/60">{t('Metric')}</Label>
                                                    <Input value={cond.metric} onChange={(e) => updateCondition(idx, 'metric', e.target.value)}
                                                        placeholder="temperature" className="mt-1 font-mono text-[11px]" list={`metrics-${idx}`} />
                                                    <datalist id={`metrics-${idx}`}>
                                                        {availableMetrics.map((m) => (
                                                            <option key={m.key} value={m.key}>{m.key} ({m.unit})</option>
                                                        ))}
                                                    </datalist>
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground/60">{t('Condition')}</Label>
                                                    <Select value={cond.condition} onValueChange={(v) => updateCondition(idx, 'condition', v)}>
                                                        <SelectTrigger className="mt-1 text-[11px]"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="above">{t('Above')}</SelectItem>
                                                            <SelectItem value="below">{t('Below')}</SelectItem>
                                                            <SelectItem value="equals">{t('Equals')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground/60">{t('Threshold')}</Label>
                                                    <div className="relative mt-1">
                                                        <Input type="number" step="any" value={cond.threshold}
                                                            onChange={(e) => updateCondition(idx, 'threshold', e.target.value)}
                                                            className="font-mono text-[13px] font-bold pr-8" />
                                                        {cond.metric && metricUnits[cond.metric] && (
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/50">
                                                                {metricUnits[cond.metric]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground/60">{t('For at least')}</Label>
                                                    <div className="mt-1 flex items-center gap-1">
                                                        <Input type="number" min={0} value={cond.duration_minutes}
                                                            onChange={(e) => updateCondition(idx, 'duration_minutes', e.target.value)}
                                                            className="font-mono text-[12px]" />
                                                        <span className="text-[9px] text-muted-foreground/50 whitespace-nowrap">min</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <button type="button" onClick={() => removeCondition(idx)}
                                                        disabled={form.data.conditions.length === 1}
                                                        className="flex h-9 w-9 items-center justify-center rounded border border-transparent text-muted-foreground/30 transition-colors hover:text-rose-500 disabled:opacity-20">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}

                            <button type="button" onClick={addCondition}
                                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-3 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
                                <Plus className="h-3 w-3" />{t('Add Condition')}
                            </button>
                        </div>

                        {/* ━━ RIGHT: LIVE PREVIEW ━━━━━━━━━━━━━━━━━━━━━━ */}
                        <div>
                            <FadeIn delay={100} duration={400}>
                                <div className="sticky top-24">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('PREVIEW')}</span>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>

                                    <div className="rounded-lg border border-primary/15 bg-primary/[0.03] p-5">
                                        <p className="font-mono text-[9px] font-semibold tracking-[0.1em] text-primary/70 mb-3">{t('THIS RULE WILL TRIGGER WHEN:')}</p>
                                        {form.data.conditions.map((cond, idx) => (
                                            <div key={idx}>
                                                {idx > 0 && (
                                                    <div className="flex items-center gap-2 py-1.5">
                                                        <div className="h-px flex-1 bg-primary/10" />
                                                        <span className="font-mono text-[8px] font-semibold text-primary/50">AND</span>
                                                        <div className="h-px flex-1 bg-primary/10" />
                                                    </div>
                                                )}
                                                <p className="text-[13px] leading-relaxed">
                                                    <span className="font-mono font-semibold text-primary">{cond.metric || '___'}</span>{' '}
                                                    is <span className="font-medium">{cond.condition}</span>{' '}
                                                    <span className="font-mono text-[15px] font-bold text-rose-500">{cond.threshold || '?'}</span>
                                                    {cond.metric && metricUnits[cond.metric] && <span className="text-[10px] text-muted-foreground ml-0.5">{metricUnits[cond.metric]}</span>}
                                                    {Number(cond.duration_minutes) > 0 && (
                                                        <span className="text-muted-foreground"> for at least <span className="font-mono font-medium text-foreground">{cond.duration_minutes}</span> min</span>
                                                    )}
                                                </p>
                                            </div>
                                        ))}
                                        <div className="mt-4 border-t border-primary/10 pt-3 space-y-1 text-[11px] text-muted-foreground">
                                            <p>On <span className="text-foreground">{form.data.device_id ? devices.find((d) => String(d.id) === form.data.device_id)?.name : t('all devices')}</span></p>
                                            <p>Severity: <Badge variant={severityVariant[form.data.severity]} className="text-[8px] ml-1 capitalize">{form.data.severity}</Badge></p>
                                            <p>Cooldown: <span className="font-mono text-foreground">{form.data.cooldown_minutes} min</span></p>
                                        </div>
                                    </div>
                                </div>
                            </FadeIn>
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
