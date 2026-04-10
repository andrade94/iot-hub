import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    BookOpen,
    Box,
    ChevronRight,
    Copy,
    Cpu,
    Database,
    DoorOpen,
    Download,
    Droplet,
    Eye,
    FileJson,
    FileText,
    Gauge,
    Layers,
    Lightbulb,
    Mail,
    MapPin,
    Phone,
    Plus,
    Search,
    Send,
    Settings2,
    Shield,
    Siren,
    Sliders,
    Sparkles,
    Thermometer,
    Trash2,
    Users,
    Wind,
    X,
    Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';

/* ── Types ─────────────────────────────────────────────────── */

type Segment = 'cold_chain' | 'retail' | 'pharmacy' | 'industrial' | 'hospitality' | null;

interface ZoneConfig {
    name: string;
}

interface RecipeAssignment {
    zone: string;
    recipe_id: number;
}

interface AlertRuleItem {
    name: string;
    type?: string | null;
    conditions?: Array<{
        metric?: string;
        condition?: string;
        threshold?: number;
        duration_minutes?: number;
        severity?: string;
    }>;
    severity?: string;
    cooldown_minutes?: number;
    active?: boolean;
}

interface MaintenanceWindowItem {
    zone: string | null;
    title: string;
    recurrence: string;
    day_of_week: number | null;
    start_time: string;
    duration_minutes: number;
    suppress_alerts: boolean;
}

interface EscalationLevel {
    level: number;
    delay_minutes?: number;
    user_ids?: number[];
    channels?: string[];
}

interface SiteTemplateRecord {
    id: number;
    name: string;
    description: string | null;
    segment: Segment;
    modules: string[];
    zone_config: ZoneConfig[];
    recipe_assignments: RecipeAssignment[];
    alert_rules: AlertRuleItem[];
    maintenance_windows: MaintenanceWindowItem[];
    escalation_structure: EscalationLevel[] | null;
    usage_count: number;
    last_applied_at: string | null;
    created_at: string;
    created_by_user?: { id: number; name: string } | null;
}

interface SiteOption {
    id: number;
    name: string;
    has_escalation_chain: boolean;
    has_rules: boolean;
    has_windows: boolean;
    template_id: number | null;
}

interface Stats {
    total_templates: number;
    sites_using: number;
    total_sites: number;
    most_used: { name: string; usage_count: number } | null;
    last_applied: { template_name: string; at: string } | null;
    by_segment: Record<string, number>;
}

interface Props {
    templates: SiteTemplateRecord[];
    sites: SiteOption[];
    stats: Stats;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/organization' },
    { title: 'Site Templates', href: '#' },
];

const SEGMENTS: { key: Segment; label: string; tone: string; accent: string }[] = [
    { key: 'cold_chain', label: 'Cold chain', tone: 'text-cyan-500', accent: 'bg-cyan-500' },
    { key: 'retail', label: 'Retail', tone: 'text-violet-500', accent: 'bg-violet-500' },
    { key: 'pharmacy', label: 'Pharmacy', tone: 'text-emerald-500', accent: 'bg-emerald-500' },
    { key: 'industrial', label: 'Industrial', tone: 'text-amber-500', accent: 'bg-amber-500' },
    { key: 'hospitality', label: 'Hospitality', tone: 'text-rose-500', accent: 'bg-rose-500' },
];

/** Map a module slug to a Lucide icon. Fallback is Box. */
const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    temperature: Thermometer,
    temp: Thermometer,
    humidity: Droplet,
    door: DoorOpen,
    door_sensor: DoorOpen,
    compressor: Activity,
    current: Zap,
    people: Users,
    people_count: Users,
    co2: Wind,
    iaq: Wind,
    air_quality: Wind,
    pressure: Gauge,
    vibration: Activity,
    energy: Zap,
    access: Shield,
    compliance: Shield,
};

/** Map a module slug to a friendly display name. */
function moduleLabel(slug: string): string {
    return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function segmentMeta(segment: Segment) {
    return SEGMENTS.find((s) => s.key === segment) ?? {
        key: null,
        label: 'Unclassified',
        tone: 'text-muted-foreground',
        accent: 'bg-muted-foreground/40',
    };
}

function severityTone(severity: string | undefined): { bg: string; text: string } {
    switch (severity) {
        case 'critical':
            return { bg: 'bg-rose-500/15', text: 'text-rose-500' };
        case 'high':
            return { bg: 'bg-amber-500/15', text: 'text-amber-500' };
        case 'medium':
            return { bg: 'bg-cyan-500/15', text: 'text-cyan-500' };
        default:
            return { bg: 'bg-muted', text: 'text-muted-foreground' };
    }
}

/* ── Main Component ─────────────────────────────────────────── */

export default function SiteTemplatesIndex({ templates, sites, stats }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTemplate, setDeleteTemplate] = useState<SiteTemplateRecord | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<SiteTemplateRecord | null>(null);
    const [applyTemplate, setApplyTemplate] = useState<SiteTemplateRecord | null>(null);
    const [applySiteId, setApplySiteId] = useState<string>('');
    const [applyProcessing, setApplyProcessing] = useState(false);
    const [segmentFilter, setSegmentFilter] = useState<Segment | 'all'>('all');
    const [search, setSearch] = useState('');

    const siteTemplateSchema = z.object({
        source_site_id: z.string().min(1, 'Source site is required'),
        name: z.string().min(1, 'Template name is required'),
        description: z.string(),
    });

    const createForm = useValidatedForm(siteTemplateSchema, {
        source_site_id: '',
        name: '',
        description: '',
    });

    /* ── Derived data ─────────────────────────────────────── */

    const applyTargetSite = sites.find((s) => s.id.toString() === applySiteId);

    const filteredTemplates = useMemo(() => {
        return templates.filter((tmpl) => {
            // Segment filter
            if (segmentFilter !== 'all') {
                const seg = tmpl.segment ?? 'unclassified';
                if (seg !== segmentFilter) return false;
            }
            // Search
            if (search.trim()) {
                const needle = search.toLowerCase();
                const haystack = `${tmpl.name} ${tmpl.description ?? ''}`.toLowerCase();
                if (!haystack.includes(needle)) return false;
            }
            return true;
        });
    }, [templates, segmentFilter, search]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Site Templates')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Hero ───────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8">
                            <div className="max-w-xl">
                                <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Configuration Blueprints')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Site Templates')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t(
                                        'Save a configured site as a reusable blueprint — modules, zones, recipes, alert rules, maintenance windows, and escalation chains. Apply to a new site to get a production-ready configuration in seconds.',
                                    )}
                                </p>
                            </div>
                            <Can permission="manage site templates">
                                <Button onClick={() => setShowCreate(true)}>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {t('Capture from site')}
                                </Button>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Stats bar ──────────────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="grid grid-cols-2 divide-x divide-y divide-border/50 p-0 sm:grid-cols-4 sm:divide-y-0">
                            <StatCell
                                label={t('Templates')}
                                value={stats.total_templates.toString()}
                                sub={
                                    Object.keys(stats.by_segment).length > 0
                                        ? `${t('across')} ${Object.keys(stats.by_segment).length} ${t('segments')}`
                                        : t('none yet')
                                }
                            />
                            <StatCell
                                label={t('Sites using templates')}
                                value={`${stats.sites_using}`}
                                sub={`${t('of')} ${stats.total_sites} ${t('total sites')}`}
                            />
                            <StatCell
                                label={t('Most-used template')}
                                value={stats.most_used?.name ?? '—'}
                                valueClassName="text-base"
                                sub={
                                    stats.most_used
                                        ? `${t('applied to')} ${stats.most_used.usage_count} ${t('sites')}`
                                        : t('no template used yet')
                                }
                            />
                            <StatCell
                                label={t('Last applied')}
                                value={stats.last_applied ? formatTimeAgo(stats.last_applied.at) : '—'}
                                valueClassName="text-base"
                                sub={stats.last_applied?.template_name ?? t('never')}
                            />
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* ── Filter bar ─────────────────────────────────── */}
                {templates.length > 0 && (
                    <FadeIn delay={125} duration={400}>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
                                {t('Segment')}:
                            </span>
                            <FilterPill
                                active={segmentFilter === 'all'}
                                onClick={() => setSegmentFilter('all')}
                                label={t('All')}
                                count={stats.total_templates}
                            />
                            {SEGMENTS.map((s) => {
                                const count = stats.by_segment[s.key ?? ''] ?? 0;
                                if (count === 0) return null;
                                return (
                                    <FilterPill
                                        key={s.key}
                                        active={segmentFilter === s.key}
                                        onClick={() => setSegmentFilter(s.key)}
                                        label={t(s.label)}
                                        count={count}
                                    />
                                );
                            })}
                            {(stats.by_segment.unclassified ?? 0) > 0 && (
                                <FilterPill
                                    active={segmentFilter === null}
                                    onClick={() => setSegmentFilter(null)}
                                    label={t('Unclassified')}
                                    count={stats.by_segment.unclassified}
                                />
                            )}
                            <div className="ml-auto flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
                                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('Search templates...')}
                                    className="min-w-[180px] bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </FadeIn>
                )}

                {/* ── Templates grid ─────────────────────────────── */}
                {filteredTemplates.length === 0 ? (
                    <FadeIn delay={150} duration={500}>
                        <EmptyState
                            icon={templates.length === 0 ? Copy : Search}
                            title={templates.length === 0 ? t('No site templates') : t('No templates match')}
                            description={
                                templates.length === 0
                                    ? t('Capture a configured site as a reusable blueprint to onboard new sites faster.')
                                    : t('Try adjusting the segment filter or search query.')
                            }
                            action={
                                templates.length === 0 ? (
                                    <Can permission="manage site templates">
                                        <Button onClick={() => setShowCreate(true)}>
                                            <Plus className="mr-1.5 h-4 w-4" />
                                            {t('Capture from site')}
                                        </Button>
                                    </Can>
                                ) : undefined
                            }
                        />
                    </FadeIn>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredTemplates.map((tmpl, i) => (
                            <FadeIn key={tmpl.id} delay={150 + i * 60} duration={400}>
                                <TemplateCard
                                    template={tmpl}
                                    t={t}
                                    onPreview={() => setPreviewTemplate(tmpl)}
                                    onApply={() => {
                                        setApplyTemplate(tmpl);
                                        setApplySiteId('');
                                    }}
                                    onDelete={() => setDeleteTemplate(tmpl)}
                                />
                            </FadeIn>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Create Template Dialog ──────────────────────── */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('Capture Site Template')}</DialogTitle>
                        <DialogDescription>
                            {t('Save a configured site as a reusable blueprint.')}
                        </DialogDescription>
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
                            <Label className="text-[11px]">{t('Source Site')}</Label>
                            <Select
                                value={createForm.data.source_site_id}
                                onValueChange={(v) => createForm.setData('source_site_id', v)}
                            >
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
                            <Label className="text-[11px]">{t('Template Name')}</Label>
                            <Input
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                placeholder={t('e.g., Standard Cold Chain Store')}
                            />
                            <InputError message={createForm.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[11px]">
                                {t('Description')}{' '}
                                <span className="text-muted-foreground/60">({t('optional')})</span>
                            </Label>
                            <Textarea
                                value={createForm.data.description}
                                onChange={(e) => createForm.setData('description', e.target.value)}
                                placeholder={t('What this blueprint configures...')}
                                rows={3}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={createForm.processing}>
                                {createForm.processing ? t('Capturing...') : t('Capture template')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Preview Sheet ───────────────────────────────── */}
            <TemplatePreviewSheet
                template={previewTemplate}
                onOpenChange={(open) => !open && setPreviewTemplate(null)}
                onApply={() => {
                    if (previewTemplate) {
                        setApplyTemplate(previewTemplate);
                        setPreviewTemplate(null);
                        setApplySiteId('');
                    }
                }}
                onDelete={() => {
                    if (previewTemplate) {
                        setDeleteTemplate(previewTemplate);
                        setPreviewTemplate(null);
                    }
                }}
                t={t}
            />

            {/* ── Apply Dialog ────────────────────────────────── */}
            <Dialog open={!!applyTemplate} onOpenChange={(o) => !o && setApplyTemplate(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('Apply Template')}</DialogTitle>
                        <DialogDescription>
                            {applyTemplate && (
                                <>
                                    {t('Apply')}{' '}
                                    <strong className="text-foreground">{applyTemplate.name}</strong>{' '}
                                    {t('to a target site. Review what will be created or replaced before confirming.')}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {applyTemplate && (
                        <div className="space-y-4">
                            {/* Preview of what will be applied */}
                            <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                                <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('What will be applied')}
                                </p>
                                <ul className="space-y-1.5 text-xs">
                                    <ApplyPreviewRow
                                        count={applyTemplate.modules.length}
                                        label={t('modules activated')}
                                    />
                                    <ApplyPreviewRow
                                        count={applyTemplate.zone_config.length}
                                        label={t('zones configured')}
                                    />
                                    <ApplyPreviewRow
                                        count={applyTemplate.alert_rules.length}
                                        label={t('alert rules created')}
                                        hint={t('skipped if same name exists')}
                                    />
                                    <ApplyPreviewRow
                                        count={applyTemplate.maintenance_windows.length}
                                        label={t('maintenance windows')}
                                    />
                                    {applyTemplate.escalation_structure && (
                                        <li className="flex items-center gap-2">
                                            <span className="font-mono font-semibold text-emerald-500">✓</span>
                                            <span className="text-muted-foreground">
                                                {t('Escalation chain applied')}{' '}
                                                <span className="text-muted-foreground/60">
                                                    ({applyTemplate.escalation_structure.length} {t('levels')})
                                                </span>
                                            </span>
                                        </li>
                                    )}
                                </ul>
                            </div>

                            {/* Target site picker */}
                            <div className="grid gap-2">
                                <Label className="text-[11px]">{t('Target Site')}</Label>
                                <Select value={applySiteId} onValueChange={setApplySiteId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select site')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sites.map((s) => {
                                            const hasConflicts = s.has_escalation_chain || s.has_rules || s.has_windows;
                                            return (
                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                    <span className="flex items-center gap-2">
                                                        {s.name}
                                                        {hasConflicts && (
                                                            <span className="font-mono text-[9px] text-amber-500">
                                                                (
                                                                {[
                                                                    s.has_escalation_chain && t('has chain'),
                                                                    s.has_rules && t('has rules'),
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(', ')}
                                                                )
                                                            </span>
                                                        )}
                                                    </span>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Conflict warning */}
                            {applyTargetSite &&
                                applyTemplate.escalation_structure &&
                                applyTargetSite.has_escalation_chain && (
                                    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                                        <div className="text-amber-700 dark:text-amber-400">
                                            <p className="font-medium">
                                                {t('Existing escalation chain will be replaced.')}
                                            </p>
                                            <p className="mt-0.5 text-muted-foreground">
                                                {t(
                                                    'The target site already has an escalation chain. Applying this template will overwrite it. Alert rules with matching names will be skipped to avoid duplicates.',
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                            <div className="flex justify-end gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setApplyTemplate(null)}
                                    disabled={applyProcessing}
                                >
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

            {/* ── Delete confirmation ─────────────────────────── */}
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
        </AppLayout>
    );
}

/* ── StatCell ────────────────────────────────────────────── */

function StatCell({
    label,
    value,
    sub,
    valueClassName,
}: {
    label: string;
    value: string;
    sub?: string;
    valueClassName?: string;
}) {
    return (
        <div className="p-5">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                {label}
            </p>
            <p
                className={cn(
                    'font-display mt-2 text-2xl font-bold leading-none tracking-tight tabular-nums',
                    valueClassName,
                )}
            >
                {value}
            </p>
            {sub && <p className="mt-2 text-[11px] text-muted-foreground">{sub}</p>}
        </div>
    );
}

/* ── FilterPill ──────────────────────────────────────────── */

function FilterPill({
    active,
    onClick,
    label,
    count,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    count?: number;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-2 rounded-md border px-3 py-1 text-[11px] transition-colors',
                active
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
            )}
        >
            {label}
            {count !== undefined && (
                <span className="font-mono text-[10px] text-muted-foreground/70">· {count}</span>
            )}
        </button>
    );
}

/* ── TemplateCard ────────────────────────────────────────── */

function TemplateCard({
    template,
    t,
    onPreview,
    onApply,
    onDelete,
}: {
    template: SiteTemplateRecord;
    t: (key: string) => string;
    onPreview: () => void;
    onApply: () => void;
    onDelete: () => void;
}) {
    const meta = segmentMeta(template.segment);
    const zonePreview = template.zone_config.slice(0, 5).map((z) => z.name);
    const extraZones = Math.max(0, template.zone_config.length - 5);

    return (
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 shadow-elevation-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2">
            {/* Segment gradient stripe */}
            <div
                className={cn(
                    'pointer-events-none absolute left-0 top-0 h-full w-[3px]',
                    meta.accent,
                )}
                style={{
                    maskImage: 'linear-gradient(180deg, currentColor 0%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(180deg, currentColor 0%, transparent 100%)',
                }}
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-bold leading-tight tracking-tight">
                        {template.name}
                    </h3>
                    {template.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                            {template.description}
                        </p>
                    )}
                </div>
                <span
                    className={cn(
                        'shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-widest',
                        meta.tone,
                        template.segment === 'cold_chain' && 'border-cyan-500/25 bg-cyan-500/10',
                        template.segment === 'retail' && 'border-violet-500/25 bg-violet-500/10',
                        template.segment === 'pharmacy' && 'border-emerald-500/25 bg-emerald-500/10',
                        template.segment === 'industrial' && 'border-amber-500/25 bg-amber-500/10',
                        template.segment === 'hospitality' && 'border-rose-500/25 bg-rose-500/10',
                        template.segment === null && 'border-border bg-muted/30',
                    )}
                >
                    {meta.label}
                </span>
            </div>

            {/* Module chips */}
            {template.modules.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                    {template.modules.slice(0, 6).map((mod) => {
                        const Icon = MODULE_ICONS[mod.toLowerCase()] ?? Box;
                        return (
                            <span
                                key={mod}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-1 font-mono text-[9px] lowercase text-text-secondary"
                            >
                                <Icon className="h-2.5 w-2.5 opacity-70" />
                                {moduleLabel(mod).toLowerCase()}
                            </span>
                        );
                    })}
                    {template.modules.length > 6 && (
                        <span className="inline-flex items-center rounded-md border border-border/40 bg-muted/10 px-2 py-1 font-mono text-[9px] text-muted-foreground">
                            +{template.modules.length - 6}
                        </span>
                    )}
                </div>
            )}

            {/* Zone preview */}
            {zonePreview.length > 0 && (
                <div className="mt-4 border-t border-border/40 pt-4">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
                        {t('Zones')} ({template.zone_config.length})
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-text-secondary">
                        {zonePreview.join(' · ')}
                        {extraZones > 0 && (
                            <span className="italic text-muted-foreground"> · +{extraZones} {t('more')}</span>
                        )}
                    </p>
                </div>
            )}

            {/* Stats row */}
            <div className="mt-4 grid grid-cols-4 gap-0 divide-x divide-border/30 border-t border-border/40 pt-4">
                <MiniStat value={template.zone_config.length} label={t('Zones')} />
                <MiniStat value={template.alert_rules.length} label={t('Rules')} />
                <MiniStat value={template.maintenance_windows.length} label={t('Windows')} />
                <MiniStat
                    value={template.escalation_structure?.length ?? 0}
                    label={t('Chain')}
                    highlightColor="text-cyan-500"
                />
            </div>

            {/* Usage badge */}
            {template.usage_count > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/[0.06] px-3 py-2 text-xs">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-text-secondary">
                        {t('Used by')}{' '}
                        <span className="font-mono font-semibold text-emerald-500">
                            {template.usage_count}
                        </span>{' '}
                        {template.usage_count === 1 ? t('site') : t('sites')}
                    </span>
                </div>
            )}

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-4">
                <span className="font-mono text-[9px] text-muted-foreground/70">
                    {t('Created')} {new Date(template.created_at).toLocaleDateString()}
                    {template.created_by_user && ` · ${template.created_by_user.name}`}
                </span>
                <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={onPreview}>
                        <Eye className="mr-1.5 h-3 w-3" />
                        {t('Preview')}
                    </Button>
                    <Can permission="manage site templates">
                        <Button size="sm" onClick={onApply}>
                            <ChevronRight className="mr-1.5 h-3 w-3" />
                            {t('Apply')}
                        </Button>
                    </Can>
                </div>
            </div>
        </div>
    );
}

function MiniStat({
    value,
    label,
    highlightColor,
}: {
    value: number;
    label: string;
    highlightColor?: string;
}) {
    return (
        <div className="text-center">
            <p
                className={cn(
                    'font-display text-lg font-bold tabular-nums',
                    value === 0 ? 'text-muted-foreground/40' : highlightColor ?? 'text-foreground',
                )}
            >
                {value}
            </p>
            <p className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-muted-foreground/60">
                {label}
            </p>
        </div>
    );
}

/* ── Apply Preview Row ─────────────────────────────────── */

function ApplyPreviewRow({
    count,
    label,
    hint,
}: {
    count: number;
    label: string;
    hint?: string;
}) {
    const muted = count === 0;
    return (
        <li className="flex items-baseline gap-2">
            <span
                className={cn(
                    'min-w-[20px] font-mono font-semibold',
                    muted ? 'text-muted-foreground/40' : 'text-foreground',
                )}
            >
                {count}
            </span>
            <span className={cn(muted && 'text-muted-foreground/60')}>{label}</span>
            {hint && (
                <span className="text-[10px] text-muted-foreground/60">· {hint}</span>
            )}
        </li>
    );
}

/* ── Template Preview Sheet ────────────────────────────── */

function TemplatePreviewSheet({
    template,
    onOpenChange,
    onApply,
    onDelete,
    t,
}: {
    template: SiteTemplateRecord | null;
    onOpenChange: (open: boolean) => void;
    onApply: () => void;
    onDelete: () => void;
    t: (key: string) => string;
}) {
    if (!template) return null;
    const meta = segmentMeta(template.segment);

    return (
        <Sheet open={!!template} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl">
                <SheetHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="font-display text-2xl font-bold tracking-tight">
                                {template.name}
                            </SheetTitle>
                            {template.description && (
                                <SheetDescription className="mt-1.5 text-sm">
                                    {template.description}
                                </SheetDescription>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <span
                                    className={cn(
                                        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest',
                                        meta.tone,
                                        template.segment === 'cold_chain' && 'border-cyan-500/25 bg-cyan-500/10',
                                        template.segment === 'retail' && 'border-violet-500/25 bg-violet-500/10',
                                        template.segment === 'pharmacy' && 'border-emerald-500/25 bg-emerald-500/10',
                                        template.segment === 'industrial' && 'border-amber-500/25 bg-amber-500/10',
                                        template.segment === null && 'border-border bg-muted/30',
                                    )}
                                >
                                    {meta.label}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {t('Created')} {new Date(template.created_at).toLocaleDateString()}
                                    {template.created_by_user && ` · ${template.created_by_user.name}`}
                                </span>
                                {template.usage_count > 0 && (
                                    <span className="font-mono text-[10px] text-emerald-500">
                                        · {template.usage_count} {t('sites')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <div className="mt-6 space-y-4 px-4 pb-4 sm:px-6">
                    <Tabs defaultValue="modules" className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="modules" className="text-xs">
                                {t('Modules')}{' '}
                                <span className="ml-1 font-mono text-[9px] text-muted-foreground">
                                    {template.modules.length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="zones" className="text-xs">
                                {t('Zones')}{' '}
                                <span className="ml-1 font-mono text-[9px] text-muted-foreground">
                                    {template.zone_config.length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="rules" className="text-xs">
                                {t('Rules')}{' '}
                                <span className="ml-1 font-mono text-[9px] text-muted-foreground">
                                    {template.alert_rules.length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="windows" className="text-xs">
                                {t('Windows')}{' '}
                                <span className="ml-1 font-mono text-[9px] text-muted-foreground">
                                    {template.maintenance_windows.length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="chain" className="text-xs">
                                {t('Chain')}{' '}
                                <span className="ml-1 font-mono text-[9px] text-muted-foreground">
                                    {template.escalation_structure?.length ?? 0}
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Modules tab */}
                        <TabsContent value="modules" className="mt-4">
                            {template.modules.length === 0 ? (
                                <EmptyMessage text={t('No modules captured in this template.')} />
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {template.modules.map((mod) => {
                                        const Icon = MODULE_ICONS[mod.toLowerCase()] ?? Box;
                                        return (
                                            <div
                                                key={mod}
                                                className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-500">
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium">{moduleLabel(mod)}</p>
                                                    <p className="font-mono text-[9px] text-muted-foreground">
                                                        {t('activated')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>

                        {/* Zones tab */}
                        <TabsContent value="zones" className="mt-4">
                            {template.zone_config.length === 0 ? (
                                <EmptyMessage text={t('No zones captured in this template.')} />
                            ) : (
                                <div className="space-y-2">
                                    {template.zone_config.map((zone, i) => {
                                        const recipe = template.recipe_assignments.find(
                                            (r) => r.zone === zone.name,
                                        );
                                        return (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                                            >
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-500">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium">{zone.name}</p>
                                                    <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                                                        {recipe
                                                            ? `${t('recipe')} #${recipe.recipe_id}`
                                                            : t('no recipe assigned')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>

                        {/* Rules tab */}
                        <TabsContent value="rules" className="mt-4">
                            {template.alert_rules.length === 0 ? (
                                <EmptyMessage text={t('No alert rules captured in this template.')} />
                            ) : (
                                <div className="space-y-2">
                                    {template.alert_rules.map((rule, i) => {
                                        const tone = severityTone(rule.severity);
                                        const cond = rule.conditions?.[0];
                                        return (
                                            <div
                                                key={i}
                                                className="rounded-lg border border-border/60 bg-muted/20 p-3"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            'rounded px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider',
                                                            tone.bg,
                                                            tone.text,
                                                        )}
                                                    >
                                                        {rule.severity ?? 'medium'}
                                                    </span>
                                                    <span className="text-xs font-medium">{rule.name}</span>
                                                </div>
                                                {cond && (
                                                    <div className="mt-2 rounded border border-border/40 bg-background p-2 font-mono text-[10px] text-muted-foreground">
                                                        <span className="text-foreground">{cond.metric}</span>{' '}
                                                        <span className="text-cyan-500">{cond.condition}</span>{' '}
                                                        <span className="text-foreground">{cond.threshold}</span>
                                                        {cond.duration_minutes !== undefined && (
                                                            <>
                                                                {' · '}
                                                                <span>{t('for')}</span>{' '}
                                                                <span className="text-foreground">
                                                                    {cond.duration_minutes} {t('min')}
                                                                </span>
                                                            </>
                                                        )}
                                                        {rule.cooldown_minutes !== undefined && (
                                                            <>
                                                                {' · '}
                                                                <span>{t('cooldown')}</span>{' '}
                                                                <span className="text-foreground">
                                                                    {rule.cooldown_minutes} {t('min')}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>

                        {/* Windows tab */}
                        <TabsContent value="windows" className="mt-4">
                            {template.maintenance_windows.length === 0 ? (
                                <EmptyMessage text={t('No maintenance windows captured in this template.')} />
                            ) : (
                                <div className="space-y-2">
                                    {template.maintenance_windows.map((win, i) => (
                                        <div
                                            key={i}
                                            className="rounded-lg border border-border/60 bg-muted/20 p-3"
                                        >
                                            <p className="text-xs font-medium">{win.title}</p>
                                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                                                {win.zone ? `${win.zone} · ` : ''}
                                                {win.recurrence}
                                                {' · '}
                                                {win.start_time.slice(0, 5)}
                                                {' · '}
                                                {win.duration_minutes} {t('min')}
                                                {win.suppress_alerts && ` · ${t('suppresses alerts')}`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Chain tab */}
                        <TabsContent value="chain" className="mt-4">
                            {!template.escalation_structure || template.escalation_structure.length === 0 ? (
                                <EmptyMessage text={t('No escalation chain captured in this template.')} />
                            ) : (
                                <div className="space-y-3">
                                    {template.escalation_structure.map((level, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                                        >
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500 font-display text-sm font-bold text-background">
                                                {level.level}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium">
                                                    {level.delay_minutes && level.delay_minutes > 0
                                                        ? `${t('After')} ${level.delay_minutes} ${t('min')}`
                                                        : t('Immediate')}
                                                </p>
                                                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                                                    {(level.user_ids?.length ?? 0)} {t('recipient(s)')}
                                                </p>
                                                {level.channels && level.channels.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {level.channels.map((ch) => (
                                                            <span
                                                                key={ch}
                                                                className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground"
                                                            >
                                                                {ch === 'push' && <Send className="h-2 w-2" />}
                                                                {ch === 'email' && <Mail className="h-2 w-2" />}
                                                                {ch === 'sms' && <Phone className="h-2 w-2" />}
                                                                {ch}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-4">
                        <span className="font-mono text-[9px] text-muted-foreground/60">
                            {t('template id')} #{template.id}
                        </span>
                        <div className="flex gap-2">
                            <Can permission="manage site templates">
                                <Button variant="ghost" size="sm" onClick={onDelete} className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-500">
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Delete')}
                                </Button>
                                <Button size="sm" onClick={onApply}>
                                    <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Apply to site')}
                                </Button>
                            </Can>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function EmptyMessage({ text }: { text: string }) {
    return (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/10 py-8 text-xs text-muted-foreground">
            {text}
        </div>
    );
}
