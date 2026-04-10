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
import { Microchip, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

/* -- Types ------------------------------------------------------------ */

interface SensorModelRow {
    id: number;
    name: string;
    label: string;
    manufacturer: string;
    description: string | null;
    supported_metrics: string[];
    valid_ranges: Record<string, [number, number]> | null;
    monthly_fee: string | null;
    decoder_class: string | null;
    icon: string | null;
    color: string | null;
    active: boolean;
    sort_order: number;
    devices_count: number;
    created_at: string;
    updated_at: string;
}

interface Props {
    sensorModels: SensorModelRow[];
}

/* -- Constants -------------------------------------------------------- */

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Sensor Models', href: '#' },
];

const MANUFACTURERS = ['All', 'Milesight'];

/* -- Columns ---------------------------------------------------------- */

function getSensorModelColumns(
    t: (key: string) => string,
    onEdit: (model: SensorModelRow) => void,
    onDelete: (model: SensorModelRow) => void,
    onToggleActive: (model: SensorModelRow) => void,
): ColumnDef<SensorModelRow>[] {
    return [
        {
            accessorKey: 'name',
            header: t('Model'),
            cell: ({ row }) => (
                <span className="font-mono text-sm font-medium">{row.original.name}</span>
            ),
            enableSorting: true,
        },
        {
            accessorKey: 'label',
            header: t('Label'),
            cell: ({ row }) => (
                <span className="text-sm">{row.original.label}</span>
            ),
        },
        {
            accessorKey: 'manufacturer',
            header: t('Manufacturer'),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{row.original.manufacturer}</span>
            ),
        },
        {
            accessorKey: 'supported_metrics',
            header: t('Metrics'),
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {(row.original.supported_metrics ?? []).map((metric) => (
                        <Badge key={metric} variant="secondary" className="text-[0.65rem]">
                            {metric}
                        </Badge>
                    ))}
                    {(row.original.supported_metrics ?? []).length === 0 && (
                        <span className="text-sm text-muted-foreground">--</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'monthly_fee',
            header: t('Monthly Fee'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums text-sm">
                    {row.original.monthly_fee
                        ? `$${parseFloat(row.original.monthly_fee).toFixed(2)} MXN`
                        : '--'}
                </span>
            ),
            enableSorting: true,
        },
        {
            accessorKey: 'decoder_class',
            header: t('Decoder'),
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">
                    {row.original.decoder_class ?? '--'}
                </span>
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
            accessorKey: 'devices_count',
            header: t('Devices'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums text-sm">{row.original.devices_count}</span>
            ),
            enableSorting: true,
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
                        disabled={row.original.devices_count > 0}
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

export default function SensorModelsIndex({ sensorModels }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [editModel, setEditModel] = useState<SensorModelRow | null>(null);
    const [deleteModel, setDeleteModel] = useState<SensorModelRow | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Client-side filters
    const [activeFilter, setActiveFilter] = useState('all');
    const [manufacturerFilter, setManufacturerFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter sidebar visibility with localStorage persistence
    const [showFilters, setShowFilters] = useState(() => {
        try {
            return localStorage.getItem('sensor-models-show-filters') === 'true';
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('sensor-models-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    // Unique manufacturer list from data
    const manufacturers = useMemo(() => {
        const set = new Set(sensorModels.map((m) => m.manufacturer));
        return ['All', ...Array.from(set).sort()];
    }, [sensorModels]);

    // Client-side filtering
    const filteredModels = useMemo(() => {
        let result = sensorModels;

        if (activeFilter !== 'all') {
            const isActive = activeFilter === 'active';
            result = result.filter((m) => m.active === isActive);
        }

        if (manufacturerFilter !== 'All') {
            result = result.filter((m) => m.manufacturer === manufacturerFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(
                (m) =>
                    m.name.toLowerCase().includes(query) ||
                    m.label.toLowerCase().includes(query) ||
                    (m.description ?? '').toLowerCase().includes(query) ||
                    (m.supported_metrics ?? []).some((metric) => metric.toLowerCase().includes(query)),
            );
        }

        return result;
    }, [sensorModels, activeFilter, manufacturerFilter, searchQuery]);

    const hasFilters = activeFilter !== 'all' || manufacturerFilter !== 'All' || searchQuery.trim() !== '';

    function clearAllFilters() {
        setActiveFilter('all');
        setManufacturerFilter('All');
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
        if (manufacturerFilter !== 'All') {
            pills.push({
                key: 'manufacturer',
                label: `Manufacturer: ${manufacturerFilter}`,
                onRemove: () => setManufacturerFilter('All'),
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
    }, [activeFilter, manufacturerFilter, searchQuery]);

    // Toggle active status
    function handleToggleActive(model: SensorModelRow) {
        router.put(
            `/settings/sensor-models/${model.id}`,
            {
                ...model,
                active: !model.active,
            },
            {
                preserveScroll: true,
            },
        );
    }

    // Delete handler
    function handleDelete() {
        if (!deleteModel) return;
        setActionLoading(true);
        router.delete(`/settings/sensor-models/${deleteModel.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setActionLoading(false);
                setDeleteModel(null);
            },
        });
    }

    // Row click opens edit dialog
    const handleRowClick = useCallback((row: SensorModelRow) => {
        router.get(`/settings/sensor-models/${row.id}`);
    }, []);

    // Column definitions (memoized)
    const columns = useMemo(
        () => getSensorModelColumns(t, setEditModel, setDeleteModel, handleToggleActive),
        [t, sensorModels],
    );

    // Empty state
    const emptyStateNode = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<Microchip className="h-5 w-5 text-muted-foreground" />}
            title={hasFilters ? t('No sensor models match these filters') : t('No sensor models registered')}
            description={
                hasFilters
                    ? t('Try adjusting your filters to see more results')
                    : t('Create your first sensor model to get started')
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
                    <Label className="text-xs font-medium text-muted-foreground">{t('Manufacturer')}</Label>
                    <div className="flex flex-col gap-1.5">
                        {manufacturers.map((mfr) => (
                            <Button
                                key={mfr}
                                variant={manufacturerFilter === mfr ? 'default' : 'ghost'}
                                size="sm"
                                className="justify-start"
                                onClick={() => setManufacturerFilter(mfr)}
                            >
                                {mfr}
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
                            placeholder={t('Name, label, or metric...')}
                            className="pl-8"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Sensor Models')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header -------------------------------------------------- */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Sensor Models')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Sensor Model Catalog')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums font-medium text-foreground">
                                        {sensorModels.length}
                                    </span>{' '}
                                    {t('model(s) registered')}
                                </p>
                            </div>
                            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Add Sensor Model')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>{t('Add Sensor Model')}</DialogTitle>
                                    </DialogHeader>
                                    <SensorModelForm onSuccess={() => setShowCreate(false)} />
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
                                data={filteredModels}
                                getRowId={(row) => String(row.id)}
                                bordered={false}
                                emptyState={emptyStateNode}
                                onRowClick={handleRowClick}
                            />
                        </Card>
                    </ContentWithSidebar>
                </FadeIn>
            </div>

            {/* -- Edit Dialog ------------------------------------------------- */}
            <Dialog open={!!editModel} onOpenChange={(open) => !open && setEditModel(null)}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Edit Sensor Model')}</DialogTitle>
                    </DialogHeader>
                    {editModel && <SensorModelForm sensorModel={editModel} onSuccess={() => setEditModel(null)} />}
                </DialogContent>
            </Dialog>

            {/* -- Delete Confirmation ----------------------------------------- */}
            <ConfirmationDialog
                open={!!deleteModel}
                onOpenChange={(open) => !open && setDeleteModel(null)}
                title={t('Delete Sensor Model')}
                description={
                    deleteModel ? `${t('Are you sure you want to delete')} "${deleteModel.name}"?` : ''
                }
                warningMessage={t(
                    'This action cannot be undone. The sensor model will be permanently removed.',
                )}
                loading={actionLoading}
                onConfirm={handleDelete}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

/* -- Sensor Model Form ------------------------------------------------ */

const sensorModelSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    label: z.string().min(1, 'Label is required'),
    manufacturer: z.string().optional().or(z.literal('')),
    description: z.string().optional().or(z.literal('')),
    supported_metrics: z.string().min(1, 'At least one metric is required'),
    valid_ranges_json: z.string().optional().or(z.literal('')),
    monthly_fee: z.string().optional().or(z.literal('')),
    decoder_class: z.string().optional().or(z.literal('')),
    icon: z.string().optional().or(z.literal('')),
    color: z.string().optional().or(z.literal('')),
    active: z.boolean(),
    sort_order: z.string().optional().or(z.literal('')),
});

function formatValidRanges(ranges: Record<string, [number, number]> | null): string {
    if (!ranges || Object.keys(ranges).length === 0) return '';
    try {
        return JSON.stringify(ranges, null, 2);
    } catch {
        return '';
    }
}

function SensorModelForm({
    sensorModel,
    onSuccess,
}: {
    sensorModel?: SensorModelRow;
    onSuccess: () => void;
}) {
    const { t } = useLang();
    const isEdit = !!sensorModel;

    const form = useValidatedForm(sensorModelSchema, {
        name: sensorModel?.name ?? '',
        label: sensorModel?.label ?? '',
        manufacturer: sensorModel?.manufacturer ?? 'Milesight',
        description: sensorModel?.description ?? '',
        supported_metrics: (sensorModel?.supported_metrics ?? []).join(', '),
        valid_ranges_json: formatValidRanges(sensorModel?.valid_ranges ?? null),
        monthly_fee: sensorModel?.monthly_fee ?? '',
        decoder_class: sensorModel?.decoder_class ?? '',
        icon: sensorModel?.icon ?? '',
        color: sensorModel?.color ?? '',
        active: sensorModel?.active ?? true,
        sort_order: sensorModel?.sort_order?.toString() ?? '0',
    });

    function parseCommaSeparated(value: string): string[] {
        return value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    function parseValidRanges(json: string): Record<string, [number, number]> | null {
        if (!json.trim()) return null;
        try {
            const parsed = JSON.parse(json);
            if (typeof parsed === 'object' && parsed !== null) {
                return parsed;
            }
            return null;
        } catch {
            return null;
        }
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();

        // Validate the JSON is valid if provided
        if (form.data.valid_ranges_json.trim()) {
            try {
                JSON.parse(form.data.valid_ranges_json);
            } catch {
                form.setError('valid_ranges_json' as keyof typeof form.data, 'Invalid JSON format');
                return;
            }
        }

        const payload = {
            name: form.data.name,
            label: form.data.label,
            manufacturer: form.data.manufacturer || 'Milesight',
            description: form.data.description || null,
            supported_metrics: parseCommaSeparated(form.data.supported_metrics),
            valid_ranges: parseValidRanges(form.data.valid_ranges_json),
            monthly_fee: form.data.monthly_fee ? parseFloat(form.data.monthly_fee) : null,
            decoder_class: form.data.decoder_class || null,
            icon: form.data.icon || null,
            color: form.data.color || null,
            active: form.data.active,
            sort_order: form.data.sort_order ? parseInt(form.data.sort_order, 10) : 0,
        };

        if (isEdit && sensorModel) {
            router.put(`/settings/sensor-models/${sensorModel.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => onSuccess(),
            });
        } else {
            router.post('/settings/sensor-models', payload, {
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
                    <Label htmlFor="sm-name">{t('Model Name')}</Label>
                    <Input
                        id="sm-name"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder={t('e.g. EM300-TH')}
                        className="font-mono text-sm"
                    />
                    <InputError message={form.errors.name} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sm-label">{t('Display Label')}</Label>
                    <Input
                        id="sm-label"
                        value={form.data.label}
                        onChange={(e) => form.setData('label', e.target.value)}
                        placeholder={t('e.g. Temperature & Humidity Sensor')}
                    />
                    <InputError message={form.errors.label} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="sm-manufacturer">{t('Manufacturer')}</Label>
                    <Input
                        id="sm-manufacturer"
                        value={form.data.manufacturer}
                        onChange={(e) => form.setData('manufacturer', e.target.value)}
                        placeholder={t('e.g. Milesight')}
                    />
                    <InputError message={form.errors.manufacturer} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sm-decoder">{t('Decoder Class')}</Label>
                    <Input
                        id="sm-decoder"
                        value={form.data.decoder_class}
                        onChange={(e) => form.setData('decoder_class', e.target.value)}
                        placeholder={t('e.g. MilesightDecoder')}
                        className="font-mono text-sm"
                    />
                    <InputError message={form.errors.decoder_class} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="sm-description">{t('Description')}</Label>
                <Textarea
                    id="sm-description"
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    placeholder={t('What this sensor model measures...')}
                    rows={2}
                />
                <InputError message={form.errors.description} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="sm-metrics">{t('Supported Metrics')}</Label>
                <Input
                    id="sm-metrics"
                    value={form.data.supported_metrics}
                    onChange={(e) => form.setData('supported_metrics', e.target.value)}
                    placeholder={t('e.g. temperature, humidity')}
                />
                <p className="text-xs text-muted-foreground">{t('Comma-separated metric names')}</p>
                <InputError message={form.errors.supported_metrics} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="sm-ranges">{t('Valid Ranges (JSON)')}</Label>
                <Textarea
                    id="sm-ranges"
                    value={form.data.valid_ranges_json}
                    onChange={(e) => form.setData('valid_ranges_json', e.target.value)}
                    placeholder={t('e.g. {"temperature": [-40, 85], "humidity": [0, 100]}')}
                    rows={3}
                    className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                    {t('JSON object mapping metric name to [min, max] range')}
                </p>
                <InputError message={form.errors.valid_ranges_json} />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="sm-fee">{t('Monthly Fee (MXN)')}</Label>
                    <Input
                        id="sm-fee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.data.monthly_fee}
                        onChange={(e) => form.setData('monthly_fee', e.target.value)}
                        placeholder={t('e.g. 150.00')}
                        className="font-mono text-sm"
                    />
                    <InputError message={form.errors.monthly_fee} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sm-sort">{t('Sort Order')}</Label>
                    <Input
                        id="sm-sort"
                        type="number"
                        min="0"
                        value={form.data.sort_order}
                        onChange={(e) => form.setData('sort_order', e.target.value)}
                        placeholder="0"
                        className="font-mono text-sm"
                    />
                    <InputError message={form.errors.sort_order} />
                </div>

                <div className="flex items-end pb-1">
                    <div className="flex items-center gap-3">
                        <Switch
                            id="sm-active"
                            checked={form.data.active}
                            onCheckedChange={(checked) => form.setData('active', checked)}
                        />
                        <Label htmlFor="sm-active">{t('Active')}</Label>
                    </div>
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={form.processing}>
                {form.processing
                    ? isEdit
                        ? t('Saving...')
                        : t('Creating...')
                    : isEdit
                      ? t('Save Changes')
                      : t('Add Sensor Model')}
            </Button>
        </form>
    );
}
