import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stepper, type Step } from '@/components/ui/stepper';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device, FloorPlan, Gateway, Module, OnboardingStep, Recipe, Site } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Cpu,
    Image,
    Info,
    Layers,
    Plus,
    Radio,
    Sparkles,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { useState } from 'react';

interface SegmentSuggestions {
    modules: string[];
    sensor_models: string[];
    description: string;
}

interface Props {
    site: Site & {
        gateways: Gateway[];
        devices: Device[];
        floor_plans: FloorPlan[];
        modules: Module[];
    };
    modules: Module[];
    recipes: Recipe[];
    currentStep: number;
    steps: OnboardingStep[];
    segmentSuggestions?: SegmentSuggestions;
    chirpstackConfigured?: boolean;
}

const wizardSteps: Step[] = [
    { id: 'gateway', title: 'Gateway' },
    { id: 'devices', title: 'Devices' },
    { id: 'floor-plans', title: 'Floor Plans' },
    { id: 'modules', title: 'Modules' },
    { id: 'complete', title: 'Complete' },
];

export default function SiteOnboard({ site, modules, recipes, currentStep, steps, segmentSuggestions, chirpstackConfigured }: Props) {
    const { t } = useLang();
    const [activeStep, setActiveStep] = useState(currentStep - 1);
    const hasSuggestions = segmentSuggestions && segmentSuggestions.modules.length > 0;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Onboarding', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Onboarding')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ChirpStack Warning Banner */}
                {chirpstackConfigured === false && (
                    <ChirpStackWarningBanner />
                )}

                {/* Segment Suggestion Banner */}
                {hasSuggestions && (
                    <SegmentSuggestionBanner suggestions={segmentSuggestions} />
                )}

                {/* Header */}
                <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 dark:border-sidebar-border">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{site.name}</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t('Configure your site step by step')}
                            </p>
                        </div>
                        <Badge variant="warning">
                            {t('Onboarding')}
                        </Badge>
                    </div>
                    <Stepper currentStep={activeStep} steps={wizardSteps} className="px-4 pb-8" />
                </div>

                {/* Step Content */}
                <div className="flex-1">
                    {activeStep === 0 && (
                        <GatewayStep
                            site={site}
                            gateways={site.gateways}
                            onNext={() => setActiveStep(1)}
                        />
                    )}
                    {activeStep === 1 && (
                        <DeviceStep
                            site={site}
                            devices={site.devices}
                            gateways={site.gateways}
                            recipes={recipes}
                            onNext={() => setActiveStep(2)}
                            onBack={() => setActiveStep(0)}
                        />
                    )}
                    {activeStep === 2 && (
                        <FloorPlanStep
                            site={site}
                            floorPlans={site.floor_plans ?? []}
                            onNext={() => setActiveStep(3)}
                            onBack={() => setActiveStep(1)}
                        />
                    )}
                    {activeStep === 3 && (
                        <ModuleStep
                            site={site}
                            modules={modules}
                            activatedModules={site.modules}
                            suggestedModuleSlugs={segmentSuggestions?.modules ?? []}
                            onNext={() => setActiveStep(4)}
                            onBack={() => setActiveStep(2)}
                        />
                    )}
                    {activeStep === 4 && (
                        <CompleteStep
                            site={site}
                            steps={steps}
                            onBack={() => setActiveStep(3)}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

/* ── ChirpStack Warning Banner ────────────────────── */

function ChirpStackWarningBanner() {
    const { t } = useLang();

    return (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="flex items-start gap-4 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        {t('ChirpStack is not configured')}
                    </p>
                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                        {t('Gateway and device provisioning will be skipped. Contact your administrator to configure the LoRaWAN server.')}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Segment Suggestion Banner ────────────────────── */

function SegmentSuggestionBanner({ suggestions }: { suggestions: SegmentSuggestions }) {
    const { t } = useLang();

    return (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
            <CardContent className="flex items-start gap-4 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {t('Recommended for your segment')}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        {suggestions.description}
                    </p>
                    {suggestions.sensor_models.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                {t('Suggested sensors:')}
                            </span>
                            {suggestions.sensor_models.map((model) => (
                                <Badge
                                    key={model}
                                    variant="outline"
                                    className="border-blue-300 bg-blue-100/50 text-xs text-blue-700 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                >
                                    {model}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Gateway Step ─────────────────────────────────── */

function GatewayStep({
    site,
    gateways,
    onNext,
}: {
    site: Site;
    gateways: Gateway[];
    onNext: () => void;
}) {
    const { t } = useLang();
    const form = useForm({
        model: 'UG65',
        serial: '',
        is_addon: false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(`/sites/${site.id}/onboard/gateway`, {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Radio className="h-5 w-5" />
                        {t('Register Gateway')}
                    </CardTitle>
                    <CardDescription>
                        {t('Add the LoRaWAN gateway installed at this site')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Model')}</Label>
                            <Select value={form.data.model} onValueChange={(v) => form.setData('model', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UG65">Milesight UG65</SelectItem>
                                    <SelectItem value="UG67">Milesight UG67</SelectItem>
                                    <SelectItem value="UG56">Milesight UG56</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Serial Number')}</Label>
                            <Input
                                value={form.data.serial}
                                onChange={(e) => form.setData('serial', e.target.value)}
                                placeholder="e.g. 24E124743C00XXXX"
                            />
                            {form.errors.serial && (
                                <p className="text-sm text-destructive">{form.errors.serial}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={form.data.is_addon}
                                onCheckedChange={(v) => form.setData('is_addon', v)}
                            />
                            <Label className="cursor-pointer">{t('Additional gateway (addon)')}</Label>
                        </div>
                        <Button type="submit" disabled={form.processing || !form.data.serial}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Gateway')}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('Registered Gateways')}</CardTitle>
                    <CardDescription>
                        {gateways.length} {t('gateway(s) registered')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {gateways.length === 0 ? (
                        <EmptyState
                            size="sm"
                            icon={<Radio className="h-6 w-6 text-muted-foreground" />}
                            title={t('No gateways yet')}
                            description={t('Register at least one gateway to continue')}
                        />
                    ) : (
                        <div className="space-y-3">
                            {gateways.map((gw) => (
                                <div
                                    key={gw.id}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                                            <Radio className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{gw.model}</p>
                                            <p className="font-mono text-xs text-muted-foreground">
                                                {gw.serial}
                                            </p>
                                        </div>
                                    </div>
                                    {gw.is_addon && (
                                        <Badge variant="outline" className="text-xs">
                                            {t('Addon')}
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end lg:col-span-2">
                <Button onClick={onNext} disabled={gateways.length === 0}>
                    {t('Next: Devices')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

/* ── Device Step ──────────────────────────────────── */

function DeviceStep({
    site,
    devices,
    gateways,
    recipes,
    onNext,
    onBack,
}: {
    site: Site;
    devices: Device[];
    gateways: Gateway[];
    recipes: Recipe[];
    onNext: () => void;
    onBack: () => void;
}) {
    const { t } = useLang();
    const [newDevices, setNewDevices] = useState<
        Array<{ model: string; dev_eui: string; name: string; zone: string; gateway_id: string; recipe_id: string }>
    >([{ model: 'EM300-TH', dev_eui: '', name: '', zone: '', gateway_id: '', recipe_id: '' }]);

    const form = useForm({ devices: newDevices });

    function addRow() {
        setNewDevices([
            ...newDevices,
            { model: 'EM300-TH', dev_eui: '', name: '', zone: '', gateway_id: '', recipe_id: '' },
        ]);
    }

    function removeRow(index: number) {
        setNewDevices(newDevices.filter((_, i) => i !== index));
    }

    function updateRow(index: number, field: string, value: string) {
        const updated = [...newDevices];
        updated[index] = { ...updated[index], [field]: value };
        setNewDevices(updated);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const validDevices = newDevices.filter((d) => d.dev_eui && d.name);
        if (validDevices.length === 0) return;

        router.post(`/sites/${site.id}/onboard/devices`, { devices: validDevices }, {
            preserveScroll: true,
            onSuccess: () => setNewDevices([{ model: 'EM300-TH', dev_eui: '', name: '', zone: '', gateway_id: '', recipe_id: '' }]),
        });
    }

    const sensorModels = ['EM300-TH', 'CT101', 'WS301', 'GS101', 'EM300-PT', 'EM310-UDL', 'AM307'];

    return (
        <div className="space-y-6">
            {/* Existing devices */}
            {devices.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {t('Registered Devices')} ({devices.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Name')}</TableHead>
                                    <TableHead>{t('Model')}</TableHead>
                                    <TableHead>{t('DevEUI')}</TableHead>
                                    <TableHead>{t('Zone')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {devices.map((device) => (
                                    <TableRow key={device.id}>
                                        <TableCell className="font-medium">{device.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{device.model}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{device.dev_eui}</TableCell>
                                        <TableCell>{device.zone || '—'}</TableCell>
                                        <TableCell>
                                            <DeviceStatusBadge status={device.status} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Add new devices */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5" />
                        {t('Add Devices')}
                    </CardTitle>
                    <CardDescription>
                        {t('Register sensors connected to this site\'s gateway')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-3">
                            {newDevices.map((device, idx) => (
                                <div
                                    key={idx}
                                    className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-6"
                                >
                                    <div>
                                        <Label className="text-xs">{t('Model')}</Label>
                                        <Select
                                            value={device.model}
                                            onValueChange={(v) => updateRow(idx, 'model', v)}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sensorModels.map((m) => (
                                                    <SelectItem key={m} value={m}>
                                                        {m}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">{t('DevEUI')}</Label>
                                        <Input
                                            className="mt-1 font-mono text-xs"
                                            value={device.dev_eui}
                                            onChange={(e) => updateRow(idx, 'dev_eui', e.target.value)}
                                            placeholder="A81758FFFE..."
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">{t('Name')}</Label>
                                        <Input
                                            className="mt-1"
                                            value={device.name}
                                            onChange={(e) => updateRow(idx, 'name', e.target.value)}
                                            placeholder={t('e.g. Cooler A')}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">{t('Zone')}</Label>
                                        <Input
                                            className="mt-1"
                                            value={device.zone}
                                            onChange={(e) => updateRow(idx, 'zone', e.target.value)}
                                            placeholder={t('e.g. Cooler A')}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">{t('Recipe')}</Label>
                                        <Select
                                            value={device.recipe_id}
                                            onValueChange={(v) => updateRow(idx, 'recipe_id', v)}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder={t('Select...')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {recipes
                                                    .filter((r) => r.sensor_model === device.model)
                                                    .map((r) => (
                                                        <SelectItem key={r.id} value={String(r.id)}>
                                                            {r.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeRow(idx)}
                                            disabled={newDevices.length === 1}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                            <Button type="button" variant="outline" size="sm" onClick={addRow}>
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                {t('Add Row')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={!newDevices.some((d) => d.dev_eui && d.name)}
                            >
                                {t('Register Devices')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <StepNav onBack={onBack} onNext={onNext} nextLabel={t('Next: Floor Plans')} />
        </div>
    );
}

/* ── Floor Plan Step ──────────────────────────────── */

function FloorPlanStep({
    site,
    floorPlans,
    onNext,
    onBack,
}: {
    site: Site;
    floorPlans: FloorPlan[];
    onNext: () => void;
    onBack: () => void;
}) {
    const { t } = useLang();
    const form = useForm<{ name: string; floor_number: string; image: File | null }>({
        name: '',
        floor_number: '1',
        image: null,
    });

    function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!form.data.image) return;

        form.post(`/sites/${site.id}/floor-plans`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        {t('Upload Floor Plan')}
                    </CardTitle>
                    <CardDescription>
                        {t('Upload an image of your floor plan to place sensors visually')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Floor Name')}</Label>
                            <Input
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder={t('e.g. Ground Floor')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Floor Number')}</Label>
                            <Input
                                type="number"
                                min={0}
                                value={form.data.floor_number}
                                onChange={(e) => form.setData('floor_number', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Floor Plan Image')}</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)}
                            />
                            {form.errors.image && (
                                <p className="text-sm text-destructive">{form.errors.image}</p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={form.processing || !form.data.image || !form.data.name}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {t('Upload')}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('Floor Plans')}</CardTitle>
                    <CardDescription>
                        {floorPlans.length} {t('floor plan(s) uploaded')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {floorPlans.length === 0 ? (
                        <EmptyState
                            size="sm"
                            icon={<Image className="h-6 w-6 text-muted-foreground" />}
                            title={t('No floor plans yet')}
                            description={t('Upload a floor plan image to place sensors visually')}
                        />
                    ) : (
                        <div className="space-y-3">
                            {floorPlans.map((fp) => (
                                <div
                                    key={fp.id}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                                            <Layers className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{fp.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {t('Floor')} {fp.floor_number}
                                                {fp.width_px && fp.height_px
                                                    ? ` — ${fp.width_px}×${fp.height_px}px`
                                                    : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() =>
                                            router.delete(`/sites/${site.id}/floor-plans/${fp.id}`, {
                                                preserveScroll: true,
                                            })
                                        }
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="lg:col-span-2">
                <StepNav onBack={onBack} onNext={onNext} nextLabel={t('Next: Modules')} skipAllowed />
            </div>
        </div>
    );
}

/* ── Module Step ──────────────────────────────────── */

function ModuleStep({
    site,
    modules,
    activatedModules,
    suggestedModuleSlugs,
    onNext,
    onBack,
}: {
    site: Site;
    modules: Module[];
    activatedModules: Module[];
    suggestedModuleSlugs: string[];
    onNext: () => void;
    onBack: () => void;
}) {
    const { t } = useLang();
    const activatedIds = new Set(activatedModules.map((m) => m.id));
    const suggestedSlugs = new Set(suggestedModuleSlugs);

    // Pre-select suggested modules (in addition to already activated ones)
    const [selected, setSelected] = useState<Set<number>>(() => {
        const initial = new Set(activatedIds);
        if (suggestedSlugs.size > 0) {
            for (const mod of modules) {
                if (suggestedSlugs.has(mod.slug)) {
                    initial.add(mod.id);
                }
            }
        }
        return initial;
    });

    function toggle(id: number) {
        const next = new Set(selected);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelected(next);
    }

    function handleActivate() {
        const newModules = [...selected].filter((id) => !activatedIds.has(id));
        if (newModules.length === 0) {
            onNext();
            return;
        }

        router.post(
            `/sites/${site.id}/onboard/modules`,
            { module_ids: newModules },
            { onSuccess: onNext },
        );
    }

    const moduleIcons: Record<string, string> = {
        cold_chain: '🧊',
        energy: '⚡',
        compliance: '📋',
        industrial: '🏭',
        iaq: '🌬️',
        safety: '🛡️',
        people: '👥',
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        {t('Activate Modules')}
                    </CardTitle>
                    <CardDescription>
                        {t('Select which monitoring modules to enable for this site')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {modules.map((mod) => {
                            const isSelected = selected.has(mod.id);
                            const wasActive = activatedIds.has(mod.id);
                            const isSuggested = suggestedSlugs.has(mod.slug);

                            return (
                                <button
                                    key={mod.id}
                                    type="button"
                                    onClick={() => toggle(mod.id)}
                                    className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                                        isSelected
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : isSuggested
                                              ? 'border-blue-300 bg-blue-50/30 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-950/20 dark:hover:border-blue-700'
                                              : 'border-border hover:border-muted-foreground/40'
                                    }`}
                                >
                                    {isSelected && (
                                        <div className="absolute right-3 top-3">
                                            <CheckCircle2 className="h-5 w-5 text-primary" />
                                        </div>
                                    )}
                                    <span className="text-2xl">
                                        {moduleIcons[mod.slug] ?? '📡'}
                                    </span>
                                    <div>
                                        <p className="font-semibold">{mod.name}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                            {mod.description}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {wasActive && (
                                            <Badge variant="success" className="w-fit text-xs">
                                                {t('Active')}
                                            </Badge>
                                        )}
                                        {isSuggested && !wasActive && (
                                            <Badge
                                                variant="outline"
                                                className="w-fit border-blue-300 bg-blue-100/50 text-xs text-blue-700 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                            >
                                                {t('Recommended')}
                                            </Badge>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('Back')}
                </Button>
                <Button onClick={handleActivate} disabled={selected.size === 0}>
                    {t('Activate & Continue')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

/* ── Complete Step ────────────────────────────────── */

function CompleteStep({
    site,
    steps,
    onBack,
}: {
    site: Site;
    steps: OnboardingStep[];
    onBack: () => void;
}) {
    const { t } = useLang();
    const allDone = steps.every((s) => s.completed);

    return (
        <Card className="mx-auto max-w-lg">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{t('Review & Complete')}</CardTitle>
                <CardDescription>
                    {allDone
                        ? t('Everything looks good! Activate this site to start monitoring.')
                        : t('Review progress below. You can go back to complete any missing steps.')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {steps.map((step, idx) => {
                        const isEscalation = step.label === 'Escalation';

                        let badge: React.ReactNode;
                        if (step.completed) {
                            badge = <Badge variant="success">{t('Done')}</Badge>;
                        } else if (isEscalation) {
                            badge = <Badge variant="warning">{t('Optional')}</Badge>;
                        } else {
                            badge = <Badge variant="outline">{t('Pending')}</Badge>;
                        }

                        return (
                            <div
                                key={idx}
                                className="flex items-center justify-between rounded-lg border p-3"
                            >
                                <span className="text-sm font-medium">{step.label}</span>
                                {badge}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4">
                    <Button variant="link" className="h-auto p-0 text-sm" asChild>
                        <Link href="/settings/escalation-chains">
                            {t('Set up escalation chain')} &rarr;
                        </Link>
                    </Button>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('Back')}
                    </Button>
                    <Button
                        onClick={() =>
                            router.post(`/sites/${site.id}/onboard/complete`)
                        }
                    >
                        <Check className="mr-2 h-4 w-4" />
                        {t('Activate Site')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

/* ── Shared Components ────────────────────────────── */

function StepNav({
    onBack,
    onNext,
    nextLabel,
    skipAllowed,
}: {
    onBack: () => void;
    onNext: () => void;
    nextLabel: string;
    skipAllowed?: boolean;
}) {
    const { t } = useLang();

    return (
        <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('Back')}
            </Button>
            <div className="flex gap-2">
                {skipAllowed && (
                    <Button variant="ghost" onClick={onNext}>
                        {t('Skip')}
                    </Button>
                )}
                <Button onClick={onNext}>
                    {nextLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
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
