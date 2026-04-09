import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ContentWithSidebar } from '@/components/ui/content-with-sidebar';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import type { FilterPill } from '@/components/ui/filter-toolbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Boxes, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

/* -- Types ------------------------------------------------------------ */

interface ModuleRow {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    monthly_fee: string | null;
    required_sensor_models: string[];
    report_types: string[];
    icon: string | null;
    color: string | null;
    active: boolean;
    sort_order: number;
    sites_count: number;
    created_at: string;
    updated_at: string;
}

interface Props {
    modules: ModuleRow[];
    sensorModels?: string[];
}

/* -- Constants -------------------------------------------------------- */

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Modules', href: '#' },
];

/* -- Helpers ---------------------------------------------------------- */

function formatMXN(value: string | null): string {
    if (!value || value === '0.00') return '\u2014';
    const num = parseFloat(value);
    if (isNaN(num)) return '\u2014';
    return `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* -- Columns ---------------------------------------------------------- */

function getModuleColumns(
    t: (key: string) => string,
    onEdit: (module: ModuleRow) => void,
    onDelete: (module: ModuleRow) => void,
    onToggleActive: (module: ModuleRow) => void,
): ColumnDef<ModuleRow>[] {
    return [
        {
            accessorKey: 'name',
            header: t('Name'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    {row.original.color && (
                        <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: row.original.color }}
                        />
                    )}
                    <span className="font-medium">{row.original.name}</span>
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: 'slug',
            header: t('Slug'),
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">{row.original.slug}</span>
            ),
        },
        {
            accessorKey: 'description',
            header: t('Description'),
            cell: ({ row }) => (
                <span className="max-w-[200px] truncate text-sm text-muted-foreground" title={row.original.description ?? ''}>
                    {row.original.description
                        ? row.original.description.length > 60
                            ? row.original.description.slice(0, 60) + '...'
                            : row.original.description
                        : '--'}
                </span>
            ),
        },
        {
            accessorKey: 'monthly_fee',
            header: t('Monthly Fee'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums text-sm">{formatMXN(row.original.monthly_fee)}</span>
            ),
        },
        {
            accessorKey: 'required_sensor_models',
            header: t('Required Sensors'),
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {(row.original.required_sensor_models ?? []).map((sensor) => (
                        <Badge key={sensor} variant="outline" className="text-[0.65rem]">
                            {sensor}
                        </Badge>
                    ))}
                    {(row.original.required_sensor_models ?? []).length === 0 && (
                        <span className="text-sm text-muted-foreground">--</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'report_types',
            header: t('Report Types'),
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {(row.original.report_types ?? []).map((type) => (
                        <Badge key={type} variant="secondary" className="text-[0.65rem]">
                            {type}
                        </Badge>
                    ))}
                    {(row.original.report_types ?? []).length === 0 && (
                        <span className="text-sm text-muted-foreground">--</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'active',
            header: t('Active'),
            cell: ({ row }) => (
                <Switch
                    checked={row.original.active}
                    onCheckedChange={() => onToggleActive(row.original)}
                />
            ),
        },
        {
            accessorKey: 'sites_count',
            header: t('Sites'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums text-sm">{row.original.sites_count}</span>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => onEdit(row.original)}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={row.original.sites_count > 0}
                        onClick={() => onDelete(row.original)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        },
    ];
}

/* -- Main Component --------------------------------------------------- */

export default function ModuleCatalog({ modules, sensorModels = [] }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [editModule, setEditModule] = useState<ModuleRow | null>(null);
    const [deleteModule, setDeleteModule] = useState<ModuleRow | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Client-side filters
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter sidebar visibility with localStorage persistence
    const [showFilters, setShowFilters] = useState(() => {
        try {
            return localStorage.getItem('modules-catalog-show-filters') === 'true';
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('modules-catalog-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    // Client-side filtering
    const filteredModules = useMemo(() => {
        let result = modules;

        if (activeFilter !== 'all') {
            const isActive = activeFilter === 'active';
            result = result.filter((mod) => mod.active === isActive);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(
                (mod) =>
                    mod.name.toLowerCase().includes(query) ||
                    mod.slug.toLowerCase().includes(query) ||
                    (mod.description ?? '').toLowerCase().includes(query),
            );
        }

        return result;
    }, [modules, activeFilter, searchQuery]);

    const hasFilters = activeFilter !== 'all' || searchQuery.trim() !== '';

    function clearAllFilters() {
        setActiveFilter('all');
        setSearchQuery('');
    }

    // Build filter pills
    const filterPills = useMemo<FilterPill[]>(() => {
        const pills: FilterPill[] = [];
        if (activeFilter !== 'all') {
            pills.push({
                key: 'active',
                label: `Status: ${activeFilter === 'active' ? 'Active' : 'Inactive'}`,
                onRemove: () => setActiveFilter('all'),
            });
        }
        if (searchQuery.trim()) {
            pills.push({
                key: 'search',
                label: `Search: "${searchQuery}"`,
                onRemove: () => setSearchQuery(''),
            });
        }
        return pills;
    }, [activeFilter, searchQuery]);

    // Toggle active status
    function handleToggleActive(module: ModuleRow) {
        router.put(
            `/settings/modules-catalog/${module.id}`,
            {
                ...module,
                monthly_fee: module.monthly_fee ? parseFloat(module.monthly_fee) : null,
                active: !module.active,
            },
            {
                preserveScroll: true,
            },
        );
    }

    // Delete handler
    function handleDelete() {
        if (!deleteModule) return;
        setActionLoading(true);
        router.delete(`/settings/modules-catalog/${deleteModule.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setActionLoading(false);
                setDeleteModule(null);
            },
        });
    }

    // Column definitions (memoized)
    const columns = useMemo(
        () => getModuleColumns(t, setEditModule, setDeleteModule, handleToggleActive),
        [t, modules],
    );

    // Empty state
    const emptyStateNode = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<Boxes className="h-5 w-5 text-muted-foreground" />}
            title={hasFilters ? t('No modules match these filters') : t('No modules registered')}
            description={
                hasFilters
                    ? t('Try adjusting your filters to see more results')
                    : t('Create your first platform module to get started')
            }
            action={
                hasFilters ? (
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                        {t('Clear filters')}
                    </Button>
                ) : undefined
            }
        />
    );

    // Filter sidebar
    const filterSidebar = (
        <Card className="shadow-elevation-1">
            <CardContent className="flex flex-col gap-4 p-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t('Status')}</Label>
                    <div className="flex flex-col gap-1.5">
                        {['all', 'active', 'inactive'].map((option) => (
                            <Button
                                key={option}
                                variant={activeFilter === option ? 'default' : 'ghost'}
                                size="sm"
                                className="justify-start"
                                onClick={() => setActiveFilter(option)}
                            >
                                {option === 'all' ? t('All') : option === 'active' ? t('Active') : t('Inactive')}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t('Search')}</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Name or slug...')}
                            className="pl-8"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Modules')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header -------------------------------------------------- */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Modules')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Platform Modules')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums font-medium text-foreground">
                                        {modules.length}
                                    </span>{' '}
                                    {t('module(s) registered')}
                                </p>
                            </div>
                            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Create Module')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                                    <DialogHeader>
                                        <DialogTitle>{t('Create Module')}</DialogTitle>
                                    </DialogHeader>
                                    <ModuleForm onSuccess={() => setShowCreate(false)} sensorModels={sensorModels} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </FadeIn>

                {/* -- FilterToolbar + ContentWithSidebar ---------------------- */}
                <FadeIn delay={75} duration={400}>
                    <FilterToolbar
                        showSidebar={showFilters}
                        onToggleSidebar={toggleFilters}
                        pills={filterPills}
                        onClearAll={hasFilters ? clearAllFilters : undefined}
                    />
                </FadeIn>

                <FadeIn delay={150} duration={500}>
                    <ContentWithSidebar showSidebar={showFilters} sidebar={filterSidebar}>
                        <Card className="flex-1 shadow-elevation-1">
                            <DataTable
                                columns={columns}
                                data={filteredModules}
                                getRowId={(row) => String(row.id)}
                                bordered={false}
                                emptyState={emptyStateNode}
                            />
                        </Card>
                    </ContentWithSidebar>
                </FadeIn>
            </div>

            {/* -- Edit Dialog ------------------------------------------------- */}
            <Dialog open={!!editModule} onOpenChange={(open) => !open && setEditModule(null)}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                    <DialogHeader>
                        <DialogTitle>{t('Edit Module')}</DialogTitle>
                    </DialogHeader>
                    {editModule && <ModuleForm module={editModule} onSuccess={() => setEditModule(null)} sensorModels={sensorModels} />}
                </DialogContent>
            </Dialog>

            {/* -- Delete Confirmation ----------------------------------------- */}
            <ConfirmationDialog
                open={!!deleteModule}
                onOpenChange={(open) => !open && setDeleteModule(null)}
                title={t('Delete Module')}
                description={deleteModule ? `${t('Are you sure you want to delete')} "${deleteModule.name}"?` : ''}
                warningMessage={t('This action cannot be undone. The module will be permanently removed.')}
                loading={actionLoading}
                onConfirm={handleDelete}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

/* -- Module Form ------------------------------------------------------ */

const moduleSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z
        .string()
        .min(1, 'Slug is required')
        .regex(/^[a-z0-9_]+$/, 'Slug must be lowercase letters, numbers, and underscores only'),
    description: z.string().optional().or(z.literal('')),
    monthly_fee: z.string().optional().or(z.literal('')),
    required_sensor_models: z.string().optional().or(z.literal('')),
    report_types: z.string().optional().or(z.literal('')),
    icon: z.string().optional().or(z.literal('')),
    color: z.string().optional().or(z.literal('')),
    active: z.boolean(),
    sort_order: z.string().optional().or(z.literal('')),
});

function ModuleForm({ module, onSuccess, sensorModels = [] }: { module?: ModuleRow; onSuccess: () => void; sensorModels?: string[] }) {
    const { t } = useLang();
    const isEdit = !!module;

    const form = useValidatedForm(moduleSchema, {
        name: module?.name ?? '',
        slug: module?.slug ?? '',
        description: module?.description ?? '',
        monthly_fee: module?.monthly_fee ?? '',
        required_sensor_models: (module?.required_sensor_models ?? []).join(', '),
        report_types: (module?.report_types ?? []).join(', '),
        icon: module?.icon ?? '',
        color: module?.color ?? '',
        active: module?.active ?? true,
        sort_order: module?.sort_order != null ? String(module.sort_order) : '0',
    });

    function handleSlugChange(value: string): void {
        const slug = value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s_]/g, '')
            .replace(/[\s]+/g, '_')
            .replace(/_+/g, '_');
        form.setData('slug', slug);
    }

    function handleNameChange(value: string): void {
        form.setData('name', value);
        if (!isEdit) {
            const slug = value
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s_]/g, '')
                .replace(/[\s]+/g, '_')
                .replace(/_+/g, '_');
            form.setData('slug', slug);
        }
    }

    function parseCommaSeparated(value: string): string[] {
        return value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();

        const payload = {
            name: form.data.name,
            slug: form.data.slug,
            description: form.data.description || null,
            monthly_fee: form.data.monthly_fee ? parseFloat(form.data.monthly_fee) : null,
            required_sensor_models: parseCommaSeparated(form.data.required_sensor_models),
            report_types: parseCommaSeparated(form.data.report_types),
            icon: form.data.icon || null,
            color: form.data.color || null,
            active: form.data.active,
            sort_order: form.data.sort_order ? parseInt(form.data.sort_order, 10) : 0,
        };

        if (isEdit && module) {
            router.put(`/settings/modules-catalog/${module.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => onSuccess(),
            });
        } else {
            router.post('/settings/modules-catalog', payload, {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    onSuccess();
                },
            });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="mod-name">{t('Name')}</Label>
                    <Input
                        id="mod-name"
                        value={form.data.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder={t('e.g. Cold Chain')}
                    />
                    <InputError message={form.errors.name} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mod-slug">{t('Slug')}</Label>
                    <Input
                        id="mod-slug"
                        value={form.data.slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder={t('e.g. cold_chain')}
                        className="font-mono text-sm"
                    />
                    <InputError message={form.errors.slug} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="mod-description">{t('Description')}</Label>
                <Textarea
                    id="mod-description"
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    placeholder={t('What this module provides...')}
                    rows={2}
                />
                <InputError message={form.errors.description} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="mod-fee">{t('Monthly Fee (MXN)')}</Label>
                    <Input
                        id="mod-fee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.data.monthly_fee}
                        onChange={(e) => form.setData('monthly_fee', e.target.value)}
                        placeholder={t('e.g. 200.00')}
                        className="font-mono"
                    />
                    <InputError message={form.errors.monthly_fee} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mod-sort">{t('Sort Order')}</Label>
                    <Input
                        id="mod-sort"
                        type="number"
                        min="0"
                        value={form.data.sort_order}
                        onChange={(e) => form.setData('sort_order', e.target.value)}
                        placeholder="0"
                        className="font-mono"
                    />
                    <InputError message={form.errors.sort_order} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>{t('Required Sensor Models')}</Label>
                {sensorModels.length > 0 ? (
                    <div className="flex flex-wrap gap-2 rounded-md border border-border p-3">
                        {sensorModels.map((sm) => {
                            const selected = form.data.required_sensor_models.split(',').map((s: string) => s.trim()).filter(Boolean);
                            const isChecked = selected.includes(sm);
                            return (
                                <label key={sm} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-mono transition-colors ${isChecked ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-accent/30'}`}>
                                    <input type="checkbox" className="sr-only" checked={isChecked}
                                        onChange={() => {
                                            const next = isChecked ? selected.filter((s: string) => s !== sm) : [...selected, sm];
                                            form.setData('required_sensor_models', next.join(', '));
                                        }} />
                                    <span className={`h-3 w-3 shrink-0 rounded border-2 flex items-center justify-center ${isChecked ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                                        {isChecked && <span className="text-[8px] text-primary-foreground font-bold">✓</span>}
                                    </span>
                                    {sm}
                                </label>
                            );
                        })}
                    </div>
                ) : (
                    <Input value={form.data.required_sensor_models} onChange={(e) => form.setData('required_sensor_models', e.target.value)}
                        placeholder={t('e.g. EM300-TH, WS301')} />
                )}
                <InputError message={form.errors.required_sensor_models} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="mod-reports">{t('Report Types')}</Label>
                <Input
                    id="mod-reports"
                    value={form.data.report_types}
                    onChange={(e) => form.setData('report_types', e.target.value)}
                    placeholder={t('e.g. temperature, energy')}
                />
                <p className="text-xs text-muted-foreground">{t('Comma-separated report type slugs')}</p>
                <InputError message={form.errors.report_types} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="mod-icon">{t('Icon')}</Label>
                    <Input
                        id="mod-icon"
                        value={form.data.icon}
                        onChange={(e) => form.setData('icon', e.target.value)}
                        placeholder={t('e.g. Thermometer')}
                    />
                    <InputError message={form.errors.icon} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mod-color">{t('Color')}</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="mod-color"
                            value={form.data.color}
                            onChange={(e) => form.setData('color', e.target.value)}
                            placeholder={t('e.g. #0891b2')}
                            className="font-mono text-sm"
                        />
                        {form.data.color && (
                            <span
                                className="inline-block h-8 w-8 shrink-0 rounded-md border"
                                style={{ backgroundColor: form.data.color }}
                            />
                        )}
                    </div>
                    <InputError message={form.errors.color} />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Switch
                    id="mod-active"
                    checked={form.data.active}
                    onCheckedChange={(checked) => form.setData('active', checked)}
                />
                <Label htmlFor="mod-active">{t('Active')}</Label>
            </div>

            <Button type="submit" className="w-full" disabled={form.processing}>
                {form.processing
                    ? isEdit
                        ? t('Saving...')
                        : t('Creating...')
                    : isEdit
                      ? t('Save Changes')
                      : t('Create Module')}
            </Button>
        </form>
    );
}
