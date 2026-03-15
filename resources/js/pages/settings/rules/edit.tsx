import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { AlertRule, AlertRuleCondition, BreadcrumbItem, Device, Site } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Plus,
    Save,
    Settings2,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';

interface Props {
    site: Site;
    rule?: AlertRule;
    devices: Device[];
}

const METRICS = [
    { value: 'temperature', label: 'Temperature (°C)' },
    { value: 'humidity', label: 'Humidity (%)' },
    { value: 'current', label: 'Current (A)' },
    { value: 'door_status', label: 'Door Status' },
    { value: 'gas_alarm', label: 'Gas Alarm' },
    { value: 'gas_concentration', label: 'Gas Concentration (ppm)' },
    { value: 'co2', label: 'CO2 (ppm)' },
    { value: 'tvoc', label: 'TVOC (ppb)' },
    { value: 'pressure', label: 'Pressure (kPa)' },
    { value: 'distance', label: 'Distance (mm)' },
    { value: 'battery', label: 'Battery (%)' },
];

const emptyCondition: AlertRuleCondition = {
    metric: 'temperature',
    condition: 'above',
    threshold: 0,
    duration_minutes: 10,
    severity: 'high',
};

export default function RuleEdit({ site, rule, devices }: Props) {
    const { t } = useLang();
    const isNew = !rule;

    const [name, setName] = useState(rule?.name ?? '');
    const [severity, setSeverity] = useState(rule?.severity ?? 'high');
    const [deviceId, setDeviceId] = useState(rule?.device_id ? String(rule.device_id) : '');
    const [cooldown, setCooldown] = useState(rule?.cooldown_minutes ?? 30);
    const [active, setActive] = useState(rule?.active ?? true);
    const [conditions, setConditions] = useState<AlertRuleCondition[]>(
        rule?.conditions?.length ? rule.conditions : [{ ...emptyCondition }],
    );
    const [saving, setSaving] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Rules', href: `/sites/${site.id}/rules` },
        { title: isNew ? 'New Rule' : rule.name, href: '#' },
    ];

    function addCondition() {
        setConditions([...conditions, { ...emptyCondition }]);
    }

    function removeCondition(idx: number) {
        setConditions(conditions.filter((_, i) => i !== idx));
    }

    function updateCondition(idx: number, field: keyof AlertRuleCondition, value: string | number) {
        const updated = [...conditions];
        updated[idx] = { ...updated[idx], [field]: value };
        setConditions(updated);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        const data = {
            name,
            severity,
            device_id: deviceId || null,
            cooldown_minutes: cooldown,
            active,
            conditions: conditions.map((c) => ({
                ...c,
                threshold: Number(c.threshold),
                duration_minutes: Number(c.duration_minutes),
            })),
        };

        if (isNew) {
            router.post(`/sites/${site.id}/rules`, data, {
                onFinish: () => setSaving(false),
                onSuccess: () => router.get(`/sites/${site.id}/rules`),
            });
        } else {
            router.put(`/sites/${site.id}/rules/${rule.id}`, data, {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isNew ? t('New Alert Rule') : `${t('Edit')} — ${rule.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.get(`/sites/${site.id}/rules`)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {isNew ? t('New Alert Rule') : t('Edit Rule')}
                        </h1>
                        <p className="text-sm text-muted-foreground">{site.name}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Basic settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Settings2 className="h-4 w-4" />
                                    {t('Rule Settings')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('Rule Name')}</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('e.g. High Temperature Alert')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Overall Severity')}</Label>
                                    <Select value={severity} onValueChange={setSeverity}>
                                        <SelectTrigger>
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
                                <div className="space-y-2">
                                    <Label>{t('Specific Device (optional)')}</Label>
                                    <Select value={deviceId} onValueChange={setDeviceId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All devices in site')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All devices')}</SelectItem>
                                            {devices.map((d) => (
                                                <SelectItem key={d.id} value={String(d.id)}>
                                                    {d.name} ({d.model})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Cooldown (minutes)')}</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={1440}
                                        value={cooldown}
                                        onChange={(e) => setCooldown(Number(e.target.value))}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('Minimum time between repeated alerts for the same rule')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch checked={active} onCheckedChange={setActive} />
                                    <Label>{t('Rule active')}</Label>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Conditions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Conditions')}</CardTitle>
                                <CardDescription>
                                    {t('Define when this rule should trigger an alert')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {conditions.map((cond, idx) => (
                                        <div
                                            key={idx}
                                            className="space-y-3 rounded-lg border p-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-xs">
                                                    {t('Condition')} {idx + 1}
                                                </Badge>
                                                {conditions.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => removeCondition(idx)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">{t('Metric')}</Label>
                                                    <Select
                                                        value={cond.metric}
                                                        onValueChange={(v) =>
                                                            updateCondition(idx, 'metric', v)
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {METRICS.map((m) => (
                                                                <SelectItem key={m.value} value={m.value}>
                                                                    {m.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">{t('Condition')}</Label>
                                                    <Select
                                                        value={cond.condition}
                                                        onValueChange={(v) =>
                                                            updateCondition(idx, 'condition', v)
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="above">{t('Above')}</SelectItem>
                                                            <SelectItem value="below">{t('Below')}</SelectItem>
                                                            <SelectItem value="equals">{t('Equals')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">{t('Threshold')}</Label>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        value={cond.threshold}
                                                        onChange={(e) =>
                                                            updateCondition(idx, 'threshold', e.target.value)
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">{t('Duration (min)')}</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={cond.duration_minutes}
                                                        onChange={(e) =>
                                                            updateCondition(idx, 'duration_minutes', Number(e.target.value))
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">{t('Severity')}</Label>
                                                    <Select
                                                        value={cond.severity}
                                                        onValueChange={(v) =>
                                                            updateCondition(idx, 'severity', v)
                                                        }
                                                    >
                                                        <SelectTrigger>
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
                                            </div>
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addCondition}
                                    >
                                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Add Condition')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Submit */}
                    <div className="mt-6 flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.get(`/sites/${site.id}/rules`)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={saving || !name || conditions.length === 0}>
                            <Save className="mr-2 h-4 w-4" />
                            {isNew ? t('Create Rule') : t('Save Changes')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
