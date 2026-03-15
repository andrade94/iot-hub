import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device, FloorPlan, Gateway, Recipe, Site } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Cpu,
    Layers,
    MapPin,
    Radio,
    Save,
} from 'lucide-react';

interface Props {
    site: Site;
    device: Device & {
        gateway?: Gateway;
        recipe?: Recipe;
        floor_plan?: FloorPlan;
    };
    gateways: Gateway[];
    recipes: Recipe[];
    floorPlans: FloorPlan[];
}

export default function DeviceEdit({ site, device, gateways, recipes, floorPlans }: Props) {
    const { t } = useLang();

    const form = useForm({
        name: device.name,
        zone: device.zone ?? '',
        gateway_id: device.gateway_id ? String(device.gateway_id) : '',
        recipe_id: device.recipe_id ? String(device.recipe_id) : '',
        floor_id: device.floor_id ? String(device.floor_id) : '',
        floor_x: device.floor_x ?? '',
        floor_y: device.floor_y ?? '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Devices', href: `/sites/${site.id}/devices` },
        { title: device.name, href: '#' },
    ];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.put(`/sites/${site.id}/devices/${device.id}`, {
            preserveScroll: true,
        });
    }

    // Filter recipes to only show those matching the device model
    const compatibleRecipes = recipes.filter((r) => r.sensor_model === device.model);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${device.name} — ${t('Edit')}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.get(`/sites/${site.id}/devices`)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
                            <Badge variant="outline" className="font-mono">
                                {device.model}
                            </Badge>
                            <DeviceStatusBadge status={device.status} />
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {device.dev_eui}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Basic Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Cpu className="h-5 w-5" />
                                    {t('Device Info')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Basic device identification and location')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('Display Name')}</Label>
                                    <Input
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                    />
                                    {form.errors.name && (
                                        <p className="text-sm text-destructive">{form.errors.name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Zone')}</Label>
                                    <Input
                                        value={form.data.zone}
                                        onChange={(e) => form.setData('zone', e.target.value)}
                                        placeholder={t('e.g. Cooler A, Freezer, Kitchen')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">{t('Model')}</Label>
                                        <p className="mt-1 font-mono text-sm">{device.model}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">{t('DevEUI')}</Label>
                                        <p className="mt-1 font-mono text-sm">{device.dev_eui}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Connectivity */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Radio className="h-5 w-5" />
                                    {t('Connectivity')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Gateway assignment and monitoring recipe')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('Gateway')}</Label>
                                    <Select
                                        value={form.data.gateway_id}
                                        onValueChange={(v) => form.setData('gateway_id', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select gateway...')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {gateways.map((gw) => (
                                                <SelectItem key={gw.id} value={String(gw.id)}>
                                                    {gw.model} — {gw.serial}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Monitoring Recipe')}</Label>
                                    <Select
                                        value={form.data.recipe_id}
                                        onValueChange={(v) => form.setData('recipe_id', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select recipe...')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {compatibleRecipes.map((r) => (
                                                <SelectItem key={r.id} value={String(r.id)}>
                                                    {r.name}
                                                    {r.module?.name ? ` (${r.module.name})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {compatibleRecipes.length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {t('No recipes available for model')} {device.model}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-3">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">{t('Battery')}</Label>
                                        <p className="mt-1 text-sm font-medium">
                                            {device.battery_pct !== null ? `${device.battery_pct}%` : '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">{t('Signal')}</Label>
                                        <p className="mt-1 text-sm font-medium">
                                            {device.rssi !== null ? `${device.rssi} dBm` : '—'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Floor Plan Placement */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    {t('Floor Plan Placement')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Assign this device to a floor plan and set its position')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>{t('Floor Plan')}</Label>
                                        <Select
                                            value={form.data.floor_id ? String(form.data.floor_id) : ''}
                                            onValueChange={(v) => form.setData('floor_id', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select floor plan...')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {floorPlans.map((fp) => (
                                                    <SelectItem key={fp.id} value={String(fp.id)}>
                                                        <div className="flex items-center gap-2">
                                                            <Layers className="h-3.5 w-3.5" />
                                                            {fp.name} (Floor {fp.floor_number})
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('X Position (px)')}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={form.data.floor_x}
                                            onChange={(e) =>
                                                form.setData('floor_x', e.target.value ? Number(e.target.value) : '')
                                            }
                                            placeholder="0"
                                            disabled={!form.data.floor_id}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Y Position (px)')}</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={form.data.floor_y}
                                            onChange={(e) =>
                                                form.setData('floor_y', e.target.value ? Number(e.target.value) : '')
                                            }
                                            placeholder="0"
                                            disabled={!form.data.floor_id}
                                        />
                                    </div>
                                </div>
                                {form.data.floor_id && (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        {t('For precise placement, use the Floor Plans page to drag-and-drop sensors.')}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.get(`/sites/${site.id}/devices`)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            <Save className="mr-2 h-4 w-4" />
                            {t('Save Changes')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

function DeviceStatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
        active: 'success',
        provisioned: 'info',
        pending: 'warning',
        offline: 'destructive',
        maintenance: 'outline',
    };

    return <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>;
}
