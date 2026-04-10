import { Can } from '@/components/Can';
import { DeviceChart } from '@/components/devices/device-charts';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { formatTimeAgo } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailCard, MetricCard } from '@/components/ui/detail-card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, BreadcrumbItem, ChartDataPoint, Device } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface LatestReading {
    metric: string;
    value: number;
    unit: string;
    time: string;
}

interface AlertRuleInfo {
    id: number;
    name: string;
    severity: string;
    active: boolean;
    conditions: { metric: string; condition: string; threshold: number }[];
}

interface WorkOrderInfo {
    id: number;
    title: string;
    status: string;
    priority: string;
    created_at: string;
}

interface Props {
    device: Device;
    chartData: ChartDataPoint[];
    latestReadings: LatestReading[];
    alerts: Alert[];
    alertRules?: AlertRuleInfo[];
    workOrders?: WorkOrderInfo[];
    availableMetrics: string[];
    metricUnits?: Record<string, string>;
    period: string;
    metric: string;
    gateways?: { id: number; model: string; serial: string }[];
    recipes?: { id: number; name: string }[];
    zones?: string[];
}

export default function DeviceShow({
    device,
    chartData,
    latestReadings,
    alerts,
    alertRules = [],
    workOrders = [],
    availableMetrics,
    metricUnits = {},
    period,
    metric,
    gateways = [],
    recipes = [],
    zones = [],
}: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: device.site?.name ?? 'Site', href: `/sites/${device.site_id}` },
        { title: device.name, href: '#' },
    ];

    const [showReplace, setShowReplace] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const replaceForm = useForm({ new_dev_eui: '', new_app_key: '', new_model: '' });

    function changePeriod(newPeriod: string) {
        router.get(`/devices/${device.id}`, { period: newPeriod, metric }, { preserveState: true, replace: true });
    }

    function changeMetric(newMetric: string) {
        router.get(`/devices/${device.id}`, { period, metric: newMetric }, { preserveState: true, replace: true });
    }

    const batteryColor = (device.battery_pct ?? 100) < 20 ? 'text-red-500' : (device.battery_pct ?? 100) < 40 ? 'text-amber-500' : 'text-emerald-500';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={device.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div className="flex items-start gap-4">
                                <Button variant="ghost" size="icon" onClick={() => router.get('/devices')}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div>
                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Device Detail')}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                                        <h1 className="font-display text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                            {device.name}
                                        </h1>
                                        <StatusBadge status={device.status} />
                                    </div>
                                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                                        {device.model} · {device.dev_eui}
                                    </p>
                                </div>
                            </div>
                            <Can permission="manage devices">
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
                                        {t('Edit')}
                                    </Button>
                                    {['active', 'offline'].includes(device.status) && (
                                        <Button variant="outline" size="sm" onClick={() => setShowReplace(true)}>
                                            {t('Replace')}
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowDelete(true)}>
                                        {t('Delete')}
                                    </Button>
                                </div>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Quick Stats ──────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <FadeIn delay={0} duration={400}>
                        <MetricCard
                            label={t('Battery')}
                            value={device.battery_pct !== null ? `${device.battery_pct}%` : '—'}
                            badge={
                                device.battery_pct !== null
                                    ? (device.battery_pct ?? 100) < 20
                                        ? t('Low')
                                        : (device.battery_pct ?? 100) < 40
                                          ? t('Fair')
                                          : t('Good')
                                    : undefined
                            }
                            badgeColor={batteryColor}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                    <FadeIn delay={60} duration={400}>
                        <MetricCard
                            label={t('Signal')}
                            value={device.rssi !== null ? `${device.rssi} dBm` : '—'}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                    <FadeIn delay={120} duration={400}>
                        <MetricCard
                            label={t('Last Seen')}
                            value={device.last_reading_at ? formatTimeAgo(device.last_reading_at) : '—'}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                    <FadeIn delay={180} duration={400}>
                        <MetricCard
                            label={t('Alerts')}
                            value={alerts.length}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                </div>

                <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_300px]">
                    {/* ── Chart Area ──────────────────────────────── */}
                    <div className="space-y-6">
                        {/* Readings section divider + controls */}
                        <FadeIn delay={100} duration={500}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Readings')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                </div>

                                {/* Controls */}
                                <Card className="shadow-elevation-1">
                                    <CardContent className="flex items-center justify-between p-3">
                                        <ButtonGroup>
                                            {['24h', '7d', '30d'].map((p) => (
                                                <Button
                                                    key={p}
                                                    variant={period === p ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => changePeriod(p)}
                                                >
                                                    {p}
                                                </Button>
                                            ))}
                                        </ButtonGroup>
                                        <Select value={metric} onValueChange={changeMetric}>
                                            <SelectTrigger className="w-[160px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableMetrics.map((m) => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </CardContent>
                                </Card>

                                {/* Device metric chart */}
                                <DeviceChart chartData={chartData} metric={metric} unit={metricUnits[metric] ?? ''} period={period} t={t} />
                            </div>
                        </FadeIn>

                        {/* ── Latest Readings ─────────────────────── */}
                        <FadeIn delay={200} duration={500}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Latest Readings')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                        {latestReadings.length}
                                    </span>
                                </div>

                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                            {latestReadings.map((reading) => (
                                                <div key={reading.metric} className="rounded-lg border p-3">
                                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                        {reading.metric}
                                                    </p>
                                                    <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                                                        {typeof reading.value === 'number' ? reading.value.toFixed(1) : reading.value}
                                                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                            {reading.unit}
                                                        </span>
                                                    </p>
                                                    <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                                        {formatTimeAgo(reading.time)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </FadeIn>
                    </div>

                    {/* ── Sidebar ─────────────────────────────────── */}
                    <div className="space-y-6">
                        {/* Device Info */}
                        <FadeIn delay={150} duration={500}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Device Info')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                </div>

                                <DetailCard
                                    className="shadow-elevation-1"
                                    items={[
                                        { label: t('Model'), value: <span className="font-mono tabular-nums">{device.model}</span> },
                                        ...(device.label ? [{ label: t('Label'), value: device.label }] : []),
                                        ...(device.serial ? [{ label: t('Serial'), value: <span className="font-mono tabular-nums">{device.serial}</span> }] : []),
                                        { label: t('Zone'), value: device.zone ?? '—' },
                                        { label: t('Gateway'), value: <span className="font-mono tabular-nums">{device.gateway?.serial ?? '—'}</span> },
                                        ...(device.recipe ? [{ label: t('Recipe'), value: device.recipe.name }] : []),
                                        ...(device.installed_at ? [{ label: t('Installed'), value: <span className="font-mono tabular-nums">{new Date(device.installed_at).toLocaleDateString()}</span> }] : []),
                                    ]}
                                />
                            </div>
                        </FadeIn>

                        {/* Alert History */}
                        <FadeIn delay={250} duration={500}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Alert History')}
                                    </h2>
                                    <div className="h-px flex-1 bg-border" />
                                    {alerts.length > 0 && (
                                        <Badge variant="destructive" className="font-mono tabular-nums">
                                            {alerts.length}
                                        </Badge>
                                    )}
                                </div>

                                <Card className="shadow-elevation-1">
                                    <CardContent className="p-4">
                                        {alerts.length === 0 ? (
                                            <p className="py-4 text-center text-xs text-muted-foreground">{t('No alerts')}</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {alerts.map((alert) => (
                                                    <div
                                                        key={alert.id}
                                                        className="flex cursor-pointer items-center gap-2 rounded border p-2 text-xs transition-colors hover:bg-muted/50"
                                                        onClick={() => router.get(`/alerts/${alert.id}`)}
                                                    >
                                                        <SeverityDot severity={alert.severity} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate font-medium">{alert.data?.rule_name}</p>
                                                            <p className="font-mono tabular-nums text-muted-foreground">
                                                                {formatTimeAgo(alert.triggered_at)}
                                                            </p>
                                                        </div>
                                                        <Badge variant={alert.status === 'active' ? 'destructive' : 'outline'} className="text-[10px]">
                                                            {alert.status}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </FadeIn>
                        {/* ── Alert Rules ──────────────────────── */}
                        {alertRules.length > 0 && (
                            <FadeIn delay={300} duration={500}>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {t('Alert Rules')}
                                        </h2>
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="font-mono text-xs tabular-nums text-muted-foreground">{alertRules.length}</span>
                                    </div>
                                    <Card className="shadow-elevation-1">
                                        <CardContent className="p-0">
                                            <div className="divide-y">
                                                {alertRules.map((rule) => (
                                                    <div key={rule.id} className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-xs transition-colors hover:bg-muted/50"
                                                        onClick={() => router.get(`/sites/${device.site_id}/rules/${rule.id}`)}>
                                                        <SeverityDot severity={rule.severity} />
                                                        <span className="flex-1 truncate font-medium">{rule.name}</span>
                                                        <Badge variant={rule.active ? 'success' : 'outline'} className="text-[8px]">{rule.active ? t('active') : t('inactive')}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </FadeIn>
                        )}

                        {/* ── Work Orders ─────────────────────── */}
                        {workOrders.length > 0 && (
                            <FadeIn delay={350} duration={500}>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                            {t('Work Orders')}
                                        </h2>
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="font-mono text-xs tabular-nums text-muted-foreground">{workOrders.length}</span>
                                    </div>
                                    <Card className="shadow-elevation-1">
                                        <CardContent className="p-0">
                                            <div className="divide-y">
                                                {workOrders.map((wo) => (
                                                    <div key={wo.id} className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-xs transition-colors hover:bg-muted/50"
                                                        onClick={() => router.get(`/work-orders/${wo.id}`)}>
                                                        <span className={`h-2 w-2 shrink-0 rounded-full ${
                                                            wo.priority === 'urgent' || wo.priority === 'high' ? 'bg-rose-500' : wo.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                                                        }`} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate font-medium">{wo.title}</p>
                                                            <p className="font-mono text-[9px] tabular-nums text-muted-foreground/60">{formatTimeAgo(wo.created_at)}</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[8px] capitalize">{wo.status}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </FadeIn>
                        )}
                    </div>
                </div>

                {/* ── Dialogs ────────────────────────────────────── */}

                {/* Device Replacement Dialog */}
                <Dialog open={showReplace} onOpenChange={setShowReplace}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('Replace Device')}</DialogTitle>
                            <DialogDescription>{t('Transfer all config to a new device. Old device will be marked as replaced.')}</DialogDescription>
                        </DialogHeader>
                        <div className="rounded-lg bg-muted p-3 text-sm">
                            <p className="font-medium">{device.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{device.dev_eui} · {device.model}</p>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); replaceForm.post(`/sites/${device.site_id}/devices/${device.id}/replace`, { preserveScroll: true, onSuccess: () => { replaceForm.reset(); setShowReplace(false); } }); }} className="space-y-4">
                            <div className="grid gap-2">
                                <Label>{t('New DevEUI')}</Label>
                                <Input value={replaceForm.data.new_dev_eui} onChange={e => replaceForm.setData('new_dev_eui', e.target.value)} placeholder={t('Scan or enter DevEUI')} className="font-mono" maxLength={16} />
                                <InputError message={replaceForm.errors.new_dev_eui} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('New AppKey')}</Label>
                                <Input value={replaceForm.data.new_app_key} onChange={e => replaceForm.setData('new_app_key', e.target.value)} placeholder={t('Enter OTAA AppKey')} className="font-mono" maxLength={32} />
                                <InputError message={replaceForm.errors.new_app_key} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowReplace(false)}>{t('Cancel')}</Button>
                                <Button type="submit" disabled={replaceForm.processing}>{replaceForm.processing ? t('Replacing...') : t('Replace Device')}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ── Edit Dialog ──────────────────────────────── */}
                <DeviceEditDialog
                    open={showEdit} onOpenChange={setShowEdit}
                    device={device} gateways={gateways} recipes={recipes} zones={zones}
                />

                {/* ── Delete Confirmation ──────────────────────── */}
                <ConfirmationDialog
                    open={showDelete}
                    onOpenChange={setShowDelete}
                    title={t('Delete Device')}
                    description={`${t('Delete')} "${device.name}" (${device.model})?`}
                    warningMessage={t('The device will be removed from the floor plan and deprovisioned. Sensor readings and alert history are preserved.')}
                    onConfirm={() => {
                        router.delete(`/sites/${device.site_id}/devices/${device.id}`, {
                            onSuccess: () => router.get('/devices'),
                        });
                    }}
                    actionLabel={t('Delete')}
                />
            </div>
        </AppLayout>
    );
}

/* -- Edit Dialog --------------------------------------------------------- */

function DeviceEditDialog({ open, onOpenChange, device, gateways, recipes, zones }: {
    open: boolean; onOpenChange: (open: boolean) => void;
    device: Device; gateways: { id: number; model: string; serial: string }[];
    recipes: { id: number; name: string }[]; zones: string[];
}) {
    const { t } = useLang();
    const form = useForm({
        name: device.name,
        label: device.label ?? '',
        serial: device.serial ?? '',
        zone: device.zone ?? '',
        gateway_id: device.gateway_id ? String(device.gateway_id) : '',
        recipe_id: device.recipe_id ? String(device.recipe_id) : '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        router.put(`/sites/${device.site_id}/devices/${device.id}`, {
            ...form.data,
            gateway_id: form.data.gateway_id || null,
            recipe_id: form.data.recipe_id || null,
            zone: form.data.zone || null,
        }, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Edit Device')}</DialogTitle>
                    <DialogDescription>
                        <span className="font-mono">{device.model}</span> · <span className="font-mono text-[10px]">{device.dev_eui}</span>
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Device Name')}</Label>
                            <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className="text-[13px] font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Label')}</Label>
                            <Input value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} placeholder={t('e.g. Left wall, top shelf')} className="text-[12px]" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px]">{t('Serial Number')}</Label>
                        <Input value={form.data.serial} onChange={(e) => form.setData('serial', e.target.value)} placeholder="SN-..." className="font-mono text-[12px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Zone')}</Label>
                            <Select value={form.data.zone || '__none'} onValueChange={(v) => form.setData('zone', v === '__none' ? '' : v)}>
                                <SelectTrigger className="text-[12px]"><SelectValue placeholder={t('Select zone')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none">{t('No zone')}</SelectItem>
                                    {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px]">{t('Gateway')}</Label>
                            <Select value={form.data.gateway_id || '__none'} onValueChange={(v) => form.setData('gateway_id', v === '__none' ? '' : v)}>
                                <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none">{t('No gateway')}</SelectItem>
                                    {gateways.map((gw) => <SelectItem key={gw.id} value={String(gw.id)}>{gw.model} ({gw.serial})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px]">{t('Recipe')}</Label>
                        <Select value={form.data.recipe_id || '__none'} onValueChange={(v) => form.setData('recipe_id', v === '__none' ? '' : v)}>
                            <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none">{t('No recipe')}</SelectItem>
                                {recipes.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
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

function StatusBadge({ status }: { status: string }) {
    const v: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
        active: 'success', provisioned: 'info', pending: 'warning', offline: 'destructive', maintenance: 'outline',
    };
    return <Badge variant={v[status] ?? 'outline'}>{status}</Badge>;
}

function SeverityDot({ severity }: { severity: string }) {
    const c: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-blue-400' };
    return <span className={`h-2 w-2 shrink-0 rounded-full ${c[severity] ?? 'bg-zinc-400'}`} />;
}

export function DeviceShowSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-48" />
                <Skeleton className="mt-2 h-3 w-40" />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="shadow-elevation-1">
                        <CardContent className="flex items-center gap-3 p-3">
                            <Skeleton className="h-4 w-4 rounded" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-3 w-12" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_300px]">
                {/* Chart area */}
                <div className="space-y-6">
                    {/* Section divider */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-16" />
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Controls */}
                    <Card className="shadow-elevation-1">
                        <CardContent className="flex items-center justify-between p-3">
                            <div className="flex gap-1">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-8 w-12" />
                                ))}
                            </div>
                            <Skeleton className="h-9 w-[160px]" />
                        </CardContent>
                    </Card>

                    {/* Chart placeholder */}
                    <Card className="shadow-elevation-1">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-5 w-40" />
                            </div>
                            <Skeleton className="h-3 w-56" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[300px] w-full" />
                        </CardContent>
                    </Card>

                    {/* Latest readings section divider */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-28" />
                        <div className="h-px flex-1 bg-border" />
                        <Skeleton className="h-3 w-4" />
                    </div>

                    {/* Latest readings */}
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="space-y-2 rounded-lg border p-3">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-6 w-16" />
                                        <Skeleton className="h-2 w-12" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Device Info section divider */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-20" />
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    <Card className="shadow-elevation-1">
                        <CardContent className="space-y-3 p-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Alert History section divider */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-24" />
                        <div className="h-px flex-1 bg-border" />
                    </div>
                    <Card className="shadow-elevation-1">
                        <CardContent className="space-y-2 p-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-2 rounded border p-2">
                                    <Skeleton className="h-2 w-2 rounded-full" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-3 w-24" />
                                        <Skeleton className="h-2 w-14" />
                                    </div>
                                    <Skeleton className="h-4 w-12" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
