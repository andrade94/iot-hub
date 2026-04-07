import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, Device, FloorPlan, Gateway, Module, OnboardingStep, Recipe, Site } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2,
    ChevronRight, Cpu, Image, Layers, Plus, Radio, Sparkles,
    Trash2, Upload, X,
} from 'lucide-react';
import { useState } from 'react';

/* -- Types ------------------------------------------------------------ */

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

const STEP_META = [
    { id: 'gateway', label: 'Gateway', icon: Radio },
    { id: 'devices', label: 'Devices', icon: Cpu },
    { id: 'floor-plans', label: 'Floor Plans', icon: Image },
    { id: 'modules', label: 'Modules', icon: Layers },
    { id: 'complete', label: 'Review', icon: Check },
] as const;

/* -- Main Component --------------------------------------------------- */

export default function SiteOnboard({ site, modules, recipes, currentStep, steps, segmentSuggestions, chirpstackConfigured }: Props) {
    const { t } = useLang();
    const [activeStep, setActiveStep] = useState(currentStep - 1);
    const hasSuggestions = segmentSuggestions && segmentSuggestions.modules.length > 0;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Sites', href: '/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Onboarding', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Onboarding')} — ${site.name}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">

                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div>
                        <button onClick={() => router.get(`/sites/${site.id}`)}
                            className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                            <ArrowLeft className="h-3 w-3" />{site.name}
                        </button>
                        <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground md:text-[32px]">
                            {t('Site Onboarding')}
                        </h1>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                            {t('Configure your site step by step')}
                        </p>
                    </div>
                </FadeIn>

                {/* ━━ STEP INDICATOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={400}>
                    <div className="mt-6 flex items-center overflow-hidden rounded-lg border border-border bg-card">
                        {STEP_META.map((step, i) => {
                            const Icon = step.icon;
                            const isActive = i === activeStep;
                            const isDone = i < activeStep;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => setActiveStep(i)}
                                    className={cn(
                                        'flex flex-1 items-center justify-center gap-2 py-3.5 text-[11px] font-medium transition-colors',
                                        i < STEP_META.length - 1 && 'border-r border-border/50',
                                        isActive && 'bg-accent text-foreground',
                                        isDone && !isActive && 'text-emerald-600 dark:text-emerald-400',
                                        !isActive && !isDone && 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30',
                                    )}
                                >
                                    {isDone && !isActive
                                        ? <Check className="h-3.5 w-3.5" />
                                        : <Icon className="h-3.5 w-3.5" />
                                    }
                                    <span className="hidden sm:inline">{t(step.label)}</span>
                                </button>
                            );
                        })}
                    </div>
                </FadeIn>

                {/* ━━ BANNERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {chirpstackConfigured === false && (
                    <FadeIn delay={80} duration={300}>
                        <Banner variant="warning" icon={AlertTriangle}
                            title={t('ChirpStack is not configured')}
                            description={t('Gateway and device provisioning will be skipped. Contact your administrator to configure the LoRaWAN server.')} />
                    </FadeIn>
                )}
                {hasSuggestions && (
                    <FadeIn delay={100} duration={300}>
                        <Banner variant="info" icon={Sparkles}
                            title={t('Recommended for your segment')}
                            description={segmentSuggestions.description}>
                            {segmentSuggestions.sensor_models.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {segmentSuggestions.sensor_models.map((m) => (
                                        <Badge key={m} variant="outline" className="font-mono text-[10px]">{m}</Badge>
                                    ))}
                                </div>
                            )}
                        </Banner>
                    </FadeIn>
                )}

                {/* ━━ STEP CONTENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={STEP_META[activeStep].label} />
                <FadeIn key={activeStep} delay={100} duration={400}>
                    {activeStep === 0 && (
                        <GatewayStep site={site} gateways={site.gateways} onNext={() => setActiveStep(1)} />
                    )}
                    {activeStep === 1 && (
                        <DeviceStep site={site} devices={site.devices} gateways={site.gateways}
                            recipes={recipes} onNext={() => setActiveStep(2)} onBack={() => setActiveStep(0)} />
                    )}
                    {activeStep === 2 && (
                        <FloorPlanStep site={site} floorPlans={site.floor_plans ?? []}
                            onNext={() => setActiveStep(3)} onBack={() => setActiveStep(1)} />
                    )}
                    {activeStep === 3 && (
                        <ModuleStep site={site} modules={modules} activatedModules={site.modules}
                            suggestedModuleSlugs={segmentSuggestions?.modules ?? []}
                            onNext={() => setActiveStep(4)} onBack={() => setActiveStep(2)} />
                    )}
                    {activeStep === 4 && (
                        <CompleteStep site={site} steps={steps} onBack={() => setActiveStep(3)} />
                    )}
                </FadeIn>
            </div>
        </AppLayout>
    );
}

/* -- Section Divider -------------------------------------------------- */

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{label.toUpperCase()}</span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

/* -- Banner ----------------------------------------------------------- */

function Banner({ variant, icon: Icon, title, description, children }: {
    variant: 'warning' | 'info';
    icon: React.ElementType;
    title: string;
    description: string;
    children?: React.ReactNode;
}) {
    const colors = variant === 'warning'
        ? 'border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-300'
        : 'border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-300';
    const iconColor = variant === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-blue-600 dark:text-blue-400';

    return (
        <div className={`mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 ${colors}`}>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
            <div className="flex-1 text-[13px]">
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 opacity-80">{description}</p>
                {children}
            </div>
        </div>
    );
}

/* -- Step Nav --------------------------------------------------------- */

function StepNav({ onBack, onNext, nextLabel, skipAllowed }: {
    onBack: () => void; onNext: () => void; nextLabel: string; skipAllowed?: boolean;
}) {
    const { t } = useLang();
    return (
        <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" size="sm" className="text-[11px]" onClick={onBack}>
                <ArrowLeft className="mr-1.5 h-3 w-3" />{t('Back')}
            </Button>
            <div className="flex gap-2">
                {skipAllowed && (
                    <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground" onClick={onNext}>
                        {t('Skip')}
                    </Button>
                )}
                <Button size="sm" className="text-[11px]" onClick={onNext}>
                    {nextLabel}<ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

/* ━━ GATEWAY STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function GatewayStep({ site, gateways, onNext }: {
    site: Site; gateways: Gateway[]; onNext: () => void;
}) {
    const { t } = useLang();
    const form = useForm({ model: 'UG65', serial: '', is_addon: false });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(`/sites/${site.id}/onboard/gateway`, {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Register form */}
                <Card className="border-border shadow-none">
                    <CardContent className="p-5">
                        <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                            <Radio className="h-4 w-4 text-muted-foreground/70" />
                            {t('Register Gateway')}
                        </h3>
                        <p className="mt-1 text-[12px] text-muted-foreground">{t('Add the LoRaWAN gateway installed at this site')}</p>

                        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[11px]">{t('Model')}</Label>
                                <Select value={form.data.model} onValueChange={(v) => form.setData('model', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UG65">Milesight UG65</SelectItem>
                                        <SelectItem value="UG67">Milesight UG67</SelectItem>
                                        <SelectItem value="UG56">Milesight UG56</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px]">{t('Serial Number')}</Label>
                                <Input value={form.data.serial}
                                    onChange={(e) => form.setData('serial', e.target.value)}
                                    placeholder="e.g. 24E124743C00XXXX"
                                    className="font-mono tabular-nums text-[12px]" />
                                {form.errors.serial && <p className="text-[11px] text-destructive">{form.errors.serial}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch checked={form.data.is_addon} onCheckedChange={(v) => form.setData('is_addon', v)} />
                                <Label className="cursor-pointer text-[12px]">{t('Additional gateway (addon)')}</Label>
                            </div>
                            <Button type="submit" size="sm" className="text-[11px]" disabled={form.processing || !form.data.serial}>
                                <Plus className="mr-1.5 h-3 w-3" />{t('Add Gateway')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Registered list */}
                <Card className="border-border shadow-none">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[13px] font-semibold">{t('Registered Gateways')}</h3>
                            <span className="font-mono text-[10px] text-muted-foreground">{gateways.length}</span>
                        </div>
                        {gateways.length === 0 ? (
                            <EmptyState size="sm" className="mt-6"
                                icon={<Radio className="h-5 w-5 text-muted-foreground" />}
                                title={t('No gateways yet')}
                                description={t('Register at least one gateway to continue')} />
                        ) : (
                            <div className="mt-4 space-y-2">
                                {gateways.map((gw) => (
                                    <div key={gw.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                                        <Radio className="h-4 w-4 shrink-0 text-primary" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-medium">{gw.model}</p>
                                            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{gw.serial}</p>
                                        </div>
                                        {gw.is_addon && <Badge variant="outline" className="text-[9px]">{t('Addon')}</Badge>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button size="sm" className="text-[11px]" onClick={onNext} disabled={gateways.length === 0}>
                    {t('Next: Devices')}<ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

/* ━━ DEVICE STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function DeviceStep({ site, devices, gateways, recipes, onNext, onBack }: {
    site: Site; devices: Device[]; gateways: Gateway[]; recipes: Recipe[];
    onNext: () => void; onBack: () => void;
}) {
    const { t } = useLang();
    const emptyRow = { model: 'EM300-TH', dev_eui: '', name: '', zone: '', gateway_id: '', recipe_id: '' };
    const [newDevices, setNewDevices] = useState<typeof emptyRow[]>([{ ...emptyRow }]);

    function addRow() { setNewDevices([...newDevices, { ...emptyRow }]); }
    function removeRow(i: number) { setNewDevices(newDevices.filter((_, idx) => idx !== i)); }
    function updateRow(i: number, field: string, value: string) {
        const updated = [...newDevices];
        updated[i] = { ...updated[i], [field]: value };
        setNewDevices(updated);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const valid = newDevices.filter((d) => d.dev_eui && d.name);
        if (!valid.length) return;
        router.post(`/sites/${site.id}/onboard/devices`, { devices: valid }, {
            preserveScroll: true,
            onSuccess: () => setNewDevices([{ ...emptyRow }]),
        });
    }

    const sensorModels = ['EM300-TH', 'CT101', 'WS301', 'GS101', 'EM300-PT', 'EM310-UDL', 'AM307'];

    return (
        <div className="space-y-6">
            {/* Existing devices */}
            {devices.length > 0 && (
                <Card className="border-border shadow-none overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                        <h3 className="text-[13px] font-semibold">{t('Registered Devices')}</h3>
                        <span className="font-mono text-[10px] text-muted-foreground">{devices.length}</span>
                    </div>
                    <div className="divide-y divide-border/30">
                        {devices.map((d) => (
                            <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${d.status === 'active' ? 'bg-emerald-500' : d.status === 'provisioned' ? 'bg-blue-400' : 'bg-zinc-400'}`} />
                                <span className="text-[13px] font-medium">{d.name}</span>
                                <Badge variant="outline" className="font-mono text-[9px]">{d.model}</Badge>
                                <span className="flex-1" />
                                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{d.dev_eui}</span>
                                {d.zone && <span className="text-[11px] text-muted-foreground">{d.zone}</span>}
                                <DeviceStatusBadge status={d.status} />
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Add new devices form */}
            <Card className="border-border shadow-none">
                <CardContent className="p-5">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                        <Cpu className="h-4 w-4 text-muted-foreground/70" />
                        {t('Add Devices')}
                    </h3>
                    <p className="mt-1 text-[12px] text-muted-foreground">{t("Register sensors connected to this site's gateway")}</p>

                    <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                        {newDevices.map((device, idx) => (
                            <div key={idx} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-6">
                                <div>
                                    <Label className="text-[10px]">{t('Model')}</Label>
                                    <Select value={device.model} onValueChange={(v) => updateRow(idx, 'model', v)}>
                                        <SelectTrigger className="mt-1 text-[12px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {sensorModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-[10px]">{t('DevEUI')}</Label>
                                    <Input className="mt-1 font-mono tabular-nums text-[11px]" value={device.dev_eui}
                                        onChange={(e) => updateRow(idx, 'dev_eui', e.target.value)} placeholder="A81758FFFE..." />
                                </div>
                                <div>
                                    <Label className="text-[10px]">{t('Name')}</Label>
                                    <Input className="mt-1 text-[12px]" value={device.name}
                                        onChange={(e) => updateRow(idx, 'name', e.target.value)} placeholder={t('e.g. Cooler A')} />
                                </div>
                                <div>
                                    <Label className="text-[10px]">{t('Zone')}</Label>
                                    <Input className="mt-1 text-[12px]" value={device.zone}
                                        onChange={(e) => updateRow(idx, 'zone', e.target.value)} placeholder={t('e.g. Cooler A')} />
                                </div>
                                <div>
                                    <Label className="text-[10px]">{t('Recipe')}</Label>
                                    <Select value={device.recipe_id} onValueChange={(v) => updateRow(idx, 'recipe_id', v)}>
                                        <SelectTrigger className="mt-1 text-[12px]"><SelectValue placeholder={t('Select...')} /></SelectTrigger>
                                        <SelectContent>
                                            {recipes.filter((r) => r.sensor_model === device.model).map((r) => (
                                                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(idx)}
                                        disabled={newDevices.length === 1}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <div className="flex items-center gap-3 pt-2">
                            <Button type="button" variant="outline" size="sm" className="text-[11px]" onClick={addRow}>
                                <Plus className="mr-1 h-3 w-3" />{t('Add Row')}
                            </Button>
                            <Button type="submit" size="sm" className="text-[11px]"
                                disabled={!newDevices.some((d) => d.dev_eui && d.name)}>
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

/* ━━ FLOOR PLAN STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function FloorPlanStep({ site, floorPlans, onNext, onBack }: {
    site: Site; floorPlans: FloorPlan[]; onNext: () => void; onBack: () => void;
}) {
    const { t } = useLang();
    const form = useForm<{ name: string; floor_number: string; image: File | null }>({
        name: '', floor_number: '1', image: null,
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
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-border shadow-none">
                    <CardContent className="p-5">
                        <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                            <Upload className="h-4 w-4 text-muted-foreground/70" />
                            {t('Upload Floor Plan')}
                        </h3>
                        <p className="mt-1 text-[12px] text-muted-foreground">{t('Upload an image of your floor plan to place sensors visually')}</p>

                        <form onSubmit={handleUpload} className="mt-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[11px]">{t('Floor Name')}</Label>
                                <Input value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder={t('e.g. Ground Floor')} className="text-[12px]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px]">{t('Floor Number')}</Label>
                                <Input type="number" min={0} value={form.data.floor_number}
                                    onChange={(e) => form.setData('floor_number', e.target.value)}
                                    className="font-mono tabular-nums text-[12px]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px]">{t('Floor Plan Image')}</Label>
                                <Input type="file" accept="image/*"
                                    onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)} />
                                {form.errors.image && <p className="text-[11px] text-destructive">{form.errors.image}</p>}
                            </div>
                            <Button type="submit" size="sm" className="text-[11px]"
                                disabled={form.processing || !form.data.image || !form.data.name}>
                                <Upload className="mr-1.5 h-3 w-3" />{t('Upload')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-none">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[13px] font-semibold">{t('Floor Plans')}</h3>
                            <span className="font-mono text-[10px] text-muted-foreground">{floorPlans.length}</span>
                        </div>
                        {floorPlans.length === 0 ? (
                            <EmptyState size="sm" className="mt-6"
                                icon={<Image className="h-5 w-5 text-muted-foreground" />}
                                title={t('No floor plans yet')}
                                description={t('Upload a floor plan image to place sensors visually')} />
                        ) : (
                            <div className="mt-4 space-y-2">
                                {floorPlans.map((fp) => (
                                    <div key={fp.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                                        <Layers className="h-4 w-4 shrink-0 text-primary" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-medium">{fp.name}</p>
                                            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                                {t('Floor')} {fp.floor_number}
                                                {fp.width_px && fp.height_px ? ` — ${fp.width_px}×${fp.height_px}px` : ''}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => router.delete(`/sites/${site.id}/floor-plans/${fp.id}`, { preserveScroll: true })}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <StepNav onBack={onBack} onNext={onNext} nextLabel={t('Next: Modules')} skipAllowed />
        </div>
    );
}

/* ━━ MODULE STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const MODULE_ICONS: Record<string, string> = {
    cold_chain: '🧊', energy: '⚡', compliance: '📋', industrial: '🏭',
    iaq: '🌬️', safety: '🛡️', people: '👥',
};

function ModuleStep({ site, modules, activatedModules, suggestedModuleSlugs, onNext, onBack }: {
    site: Site; modules: Module[]; activatedModules: Module[];
    suggestedModuleSlugs: string[]; onNext: () => void; onBack: () => void;
}) {
    const { t } = useLang();
    const activatedIds = new Set(activatedModules.map((m) => m.id));
    const suggestedSlugs = new Set(suggestedModuleSlugs);

    const [selected, setSelected] = useState<Set<number>>(() => {
        const initial = new Set(activatedIds);
        for (const mod of modules) {
            if (suggestedSlugs.has(mod.slug)) initial.add(mod.id);
        }
        return initial;
    });

    function toggle(id: number) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    }

    function handleActivate() {
        const newModules = [...selected].filter((id) => !activatedIds.has(id));
        if (!newModules.length) { onNext(); return; }
        router.post(`/sites/${site.id}/onboard/modules`, { module_ids: newModules }, { onSuccess: onNext });
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((mod) => {
                    const isSelected = selected.has(mod.id);
                    const wasActive = activatedIds.has(mod.id);
                    const isSuggested = suggestedSlugs.has(mod.slug);

                    return (
                        <button key={mod.id} type="button" onClick={() => toggle(mod.id)}
                            className={cn(
                                'relative flex flex-col gap-2.5 rounded-lg border-2 p-4 text-left transition-all',
                                isSelected
                                    ? 'border-primary bg-primary/5'
                                    : isSuggested
                                        ? 'border-blue-300/60 bg-blue-50/20 hover:border-blue-400 dark:border-blue-800/40 dark:bg-blue-950/10'
                                        : 'border-border hover:border-muted-foreground/40',
                            )}>
                            {isSelected && (
                                <div className="absolute right-3 top-3">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                </div>
                            )}
                            <span className="text-2xl">{MODULE_ICONS[mod.slug] ?? '📡'}</span>
                            <div>
                                <p className="text-[13px] font-semibold">{mod.name}</p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{mod.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {wasActive && <Badge variant="success" className="text-[9px]">{t('Active')}</Badge>}
                                {isSuggested && !wasActive && (
                                    <Badge variant="outline" className="text-[9px] border-blue-300/60 text-blue-600 dark:border-blue-700/40 dark:text-blue-400">
                                        {t('Recommended')}
                                    </Badge>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" className="text-[11px]" onClick={onBack}>
                    <ArrowLeft className="mr-1.5 h-3 w-3" />{t('Back')}
                </Button>
                <Button size="sm" className="text-[11px]" onClick={handleActivate} disabled={selected.size === 0}>
                    {t('Activate & Continue')}<ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

/* ━━ COMPLETE STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function CompleteStep({ site, steps, onBack }: {
    site: Site; steps: OnboardingStep[]; onBack: () => void;
}) {
    const { t } = useLang();
    const allDone = steps.every((s) => s.completed);
    const completedCount = steps.filter((s) => s.completed).length;

    return (
        <div className="mx-auto max-w-lg space-y-6">
            {/* Progress ring */}
            <div className="flex flex-col items-center gap-3 text-center">
                <div className={cn(
                    'flex h-20 w-20 items-center justify-center rounded-full border-4',
                    allDone
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-border bg-card',
                )}>
                    {allDone
                        ? <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        : <span className="font-display text-2xl font-bold">{completedCount}/{steps.length}</span>
                    }
                </div>
                <div>
                    <h2 className="font-display text-xl font-bold tracking-tight">
                        {allDone ? t('Ready to Go') : t('Review & Complete')}
                    </h2>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                        {allDone
                            ? t('Everything looks good! Activate this site to start monitoring.')
                            : t('Review progress below. You can go back to complete any missing steps.')}
                    </p>
                </div>
            </div>

            {/* Step checklist */}
            <Card className="border-border shadow-none overflow-hidden">
                <div className="divide-y divide-border/30">
                    {steps.map((step, idx) => {
                        const isEscalation = step.label === 'Escalation';
                        return (
                            <div key={idx} className="flex items-center gap-3 px-5 py-3.5">
                                {step.completed
                                    ? <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                                    : <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                                }
                                <span className={cn(
                                    'flex-1 text-[13px] font-medium',
                                    step.completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground',
                                )}>
                                    {step.label}
                                </span>
                                {step.completed && <Badge variant="success" className="text-[9px]">{t('Done')}</Badge>}
                                {!step.completed && isEscalation && <Badge variant="outline" className="text-[9px]">{t('Optional')}</Badge>}
                                {!step.completed && !isEscalation && <Badge variant="outline" className="text-[9px] text-amber-600 dark:text-amber-400">{t('Pending')}</Badge>}
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Escalation chain link */}
            <div className="flex items-center gap-2 text-[12px]">
                <Link href="/settings/escalation-chains"
                    className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
                    {t('Set up escalation chain')}<ChevronRight className="h-3 w-3" />
                </Link>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" className="text-[11px]" onClick={onBack}>
                    <ArrowLeft className="mr-1.5 h-3 w-3" />{t('Back')}
                </Button>
                <Button size="sm" className="text-[11px]"
                    onClick={() => router.post(`/sites/${site.id}/onboard/complete`)}>
                    <Check className="mr-1.5 h-3 w-3" />{t('Activate Site')}
                </Button>
            </div>
        </div>
    );
}

/* -- Helpers ---------------------------------------------------------- */

function DeviceStatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
        active: 'success', provisioned: 'info', pending: 'warning',
        offline: 'destructive', maintenance: 'outline',
    };
    return <Badge variant={variants[status] ?? 'outline'} className="text-[9px]">{status}</Badge>;
}
