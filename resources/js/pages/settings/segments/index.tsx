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
import { Building2, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

/* -- Types ------------------------------------------------------------ */

interface SegmentRow {
    id: number;
    name: string;
    label: string;
    description: string | null;
    suggested_modules: string[];
    suggested_sensor_models: string[];
    icon: string | null;
    color: string | null;
    active: boolean;
    organizations_count: number;
    created_at: string;
    updated_at: string;
}

interface ModuleOption {
    id: number;
    slug: string;
    name: string;
    icon: string | null;
}

interface Props {
    segments: SegmentRow[];
    modules?: ModuleOption[];
}

/* -- Constants -------------------------------------------------------- */

const COLOR_OPTIONS = [
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'orange', label: 'Orange' },
    { value: 'purple', label: 'Purple' },
    { value: 'red', label: 'Red' },
    { value: 'gray', label: 'Gray' },
];

const COLOR_BADGE_VARIANTS: Record<string, 'info' | 'success' | 'warning' | 'destructive' | 'secondary' | 'default' | 'outline'> = {
    blue: 'info',
    green: 'success',
    yellow: 'warning',
    orange: 'warning',
    purple: 'default',
    red: 'destructive',
    gray: 'secondary',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Segments', href: '#' },
];

/* -- Columns ---------------------------------------------------------- */

function getSegmentColumns(
    t: (key: string) => string,
    onEdit: (segment: SegmentRow) => void,
    onDelete: (segment: SegmentRow) => void,
    onToggleActive: (segment: SegmentRow) => void,
): ColumnDef<SegmentRow>[] {
    return [
        {
            accessorKey: 'name',
            header: t('Name'),
            cell: ({ row }) => (
                <div>
                    <span className="font-medium">{row.original.name}</span>
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: 'label',
            header: t('Label'),
            cell: ({ row }) => (
                <Badge variant={COLOR_BADGE_VARIANTS[row.original.color ?? ''] ?? 'outline'} className="text-xs">
                    {row.original.label}
                </Badge>
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
            accessorKey: 'suggested_modules',
            header: t('Suggested Modules'),
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {(row.original.suggested_modules ?? []).map((mod) => (
                        <Badge key={mod} variant="secondary" className="text-[0.65rem]">
                            {mod}
                        </Badge>
                    ))}
                    {(row.original.suggested_modules ?? []).length === 0 && (
                        <span className="text-sm text-muted-foreground">--</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'suggested_sensor_models',
            header: t('Suggested Sensors'),
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {(row.original.suggested_sensor_models ?? []).map((sensor) => (
                        <Badge key={sensor} variant="outline" className="text-[0.65rem]">
                            {sensor}
                        </Badge>
                    ))}
                    {(row.original.suggested_sensor_models ?? []).length === 0 && (
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
            accessorKey: 'organizations_count',
            header: t('Orgs'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums text-sm">{row.original.organizations_count}</span>
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
                        disabled={row.original.organizations_count > 0}
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

export default function SegmentsIndex({ segments, modules = [] }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [editSegment, setEditSegment] = useState<SegmentRow | null>(null);
    const [deleteSegment, setDeleteSegment] = useState<SegmentRow | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Client-side filters
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter sidebar visibility with localStorage persistence
    const [showFilters, setShowFilters] = useState(() => {
        try {
            return localStorage.getItem('segments-show-filters') === 'true';
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('segments-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    // Client-side filtering
    const filteredSegments = useMemo(() => {
        let result = segments;

        if (activeFilter !== 'all') {
            const isActive = activeFilter === 'active';
            result = result.filter((seg) => seg.active === isActive);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(
                (seg) =>
                    seg.name.toLowerCase().includes(query) ||
                    seg.label.toLowerCase().includes(query) ||
                    (seg.description ?? '').toLowerCase().includes(query),
            );
        }

        return result;
    }, [segments, activeFilter, searchQuery]);

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
    function handleToggleActive(segment: SegmentRow) {
        router.put(`/settings/segments/${segment.id}`, {
            ...segment,
            active: !segment.active,
        }, {
            preserveScroll: true,
        });
    }

    // Delete handler
    function handleDelete() {
        if (!deleteSegment) return;
        setActionLoading(true);
        router.delete(`/settings/segments/${deleteSegment.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setActionLoading(false);
                setDeleteSegment(null);
            },
        });
    }

    // Column definitions (memoized)
    const columns = useMemo(
        () => getSegmentColumns(t, setEditSegment, setDeleteSegment, handleToggleActive),
        [t, segments],
    );

    // Empty state
    const emptyStateNode = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<Layers className="h-5 w-5 text-muted-foreground" />}
            title={
                hasFilters
                    ? t('No segments match these filters')
                    : t('No segments registered')
            }
            description={
                hasFilters
                    ? t('Try adjusting your filters to see more results')
                    : t('Create your first industry segment to get started')
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
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Status')}
                    </Label>
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
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Search')}
                    </Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Name or label...')}
                            className="pl-8"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Segments')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header -------------------------------------------------- */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Segments')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Industry Segments')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums font-medium text-foreground">{segments.length}</span>{' '}
                                    {t('segment(s) registered')}
                                </p>
                            </div>
                            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Create Segment')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                                    <DialogHeader>
                                        <DialogTitle>{t('Create Segment')}</DialogTitle>
                                    </DialogHeader>
                                    <SegmentForm onSuccess={() => setShowCreate(false)} modules={modules} />
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
                    <ContentWithSidebar
                        showSidebar={showFilters}
                        sidebar={filterSidebar}
                    >
                        <Card className="flex-1 shadow-elevation-1">
                            <DataTable
                                columns={columns}
                                data={filteredSegments}
                                getRowId={(row) => String(row.id)}
                                bordered={false}
                                emptyState={emptyStateNode}
                            />
                        </Card>
                    </ContentWithSidebar>
                </FadeIn>
            </div>

            {/* -- Edit Dialog ------------------------------------------------- */}
            <Dialog open={!!editSegment} onOpenChange={(open) => !open && setEditSegment(null)}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                    <DialogHeader>
                        <DialogTitle>{t('Edit Segment')}</DialogTitle>
                    </DialogHeader>
                    {editSegment && (
                        <SegmentForm
                            segment={editSegment}
                            onSuccess={() => setEditSegment(null)}
                            modules={modules}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* -- Delete Confirmation ----------------------------------------- */}
            <ConfirmationDialog
                open={!!deleteSegment}
                onOpenChange={(open) => !open && setDeleteSegment(null)}
                title={t('Delete Segment')}
                description={deleteSegment ? `${t('Are you sure you want to delete')} "${deleteSegment.label}"?` : ''}
                warningMessage={t('This action cannot be undone. The segment will be permanently removed.')}
                loading={actionLoading}
                onConfirm={handleDelete}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

/* -- Segment Form ----------------------------------------------------- */

const segmentSchema = z.object({
    name: z.string().min(1, 'Name is required').regex(/^[a-z0-9_]+$/, 'Name must be lowercase letters, numbers, and underscores only'),
    label: z.string().min(1, 'Label is required'),
    description: z.string().optional().or(z.literal('')),
    suggested_modules: z.string().optional().or(z.literal('')),
    suggested_sensor_models: z.string().optional().or(z.literal('')),
    icon: z.string().optional().or(z.literal('')),
    color: z.string().optional().or(z.literal('')),
    active: z.boolean(),
});

function SegmentForm({ segment, onSuccess, modules = [] }: { segment?: SegmentRow; onSuccess: () => void; modules?: ModuleOption[] }) {
    const { t } = useLang();
    const isEdit = !!segment;

    const moduleEmojis: Record<string, string> = {
        cold_chain: '🧊', energy: '⚡', compliance: '📋', industrial: '🏭',
        iaq: '🌬️', safety: '🛡️', people: '👥',
    };

    const form = useValidatedForm(segmentSchema, {
        name: segment?.name ?? '',
        label: segment?.label ?? '',
        description: segment?.description ?? '',
        suggested_modules: (segment?.suggested_modules ?? []).join(', '),
        suggested_sensor_models: '',
        icon: segment?.icon ?? '',
        color: segment?.color ?? '',
        active: segment?.active ?? true,
    });

    function handleLabelChange(value: string): void {
        form.setData('label', value);
        if (!isEdit) {
            const slug = value.toLowerCase().trim().replace(/[^a-z0-9\s_]/g, '').replace(/[\s]+/g, '_').replace(/_+/g, '_');
            form.setData('name', slug);
        }
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        const selected = form.data.suggested_modules.split(',').map((s: string) => s.trim()).filter(Boolean);
        const payload = {
            name: form.data.name,
            label: form.data.label,
            description: form.data.description || null,
            suggested_modules: selected,
            suggested_sensor_models: [],
            icon: form.data.icon || null,
            color: form.data.color || null,
            active: form.data.active,
        };

        if (isEdit && segment) {
            router.put(`/settings/segments/${segment.id}`, payload, { preserveScroll: true, onSuccess });
        } else {
            router.post('/settings/segments', payload, { preserveScroll: true, onSuccess: () => { form.reset(); onSuccess(); } });
        }
    }

    const selectedModules = form.data.suggested_modules.split(',').map((s: string) => s.trim()).filter(Boolean);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Label + Slug */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('Name')}</Label>
                    <Input value={form.data.label} onChange={(e) => handleLabelChange(e.target.value)}
                        placeholder={t('e.g. Retail')} />
                    <InputError message={form.errors.label} />
                </div>
                <div className="space-y-2">
                    <Label>{t('Slug')}</Label>
                    <div className="flex h-9 items-center rounded-md border border-border bg-muted/30 px-3">
                        <span className="font-mono text-[12px] text-muted-foreground">{form.data.name || t('auto-generated from name')}</span>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label>{t('Description')}</Label>
                <Textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)}
                    placeholder={t('What this segment is for...')} rows={2} />
                <InputError message={form.errors.description} />
            </div>

            {/* Suggested Modules — checkbox group */}
            <div className="space-y-2">
                <Label>{t('Suggested Modules')}</Label>
                <p className="text-[10px] text-muted-foreground/60">{t('Pre-selected when onboarding sites for organizations in this segment')}</p>
                <div className="flex flex-wrap gap-2 rounded-md border border-border p-3">
                    {modules.map((mod) => {
                        const isChecked = selectedModules.includes(mod.slug);
                        const emoji = moduleEmojis[mod.slug] ?? '📡';
                        return (
                            <label key={mod.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] transition-colors ${isChecked ? 'border-primary bg-primary/5 text-foreground font-medium' : 'border-border text-muted-foreground hover:bg-accent/30'}`}>
                                <input type="checkbox" className="sr-only" checked={isChecked}
                                    onChange={() => {
                                        const next = isChecked ? selectedModules.filter((s: string) => s !== mod.slug) : [...selectedModules, mod.slug];
                                        form.setData('suggested_modules', next.join(', '));
                                    }} />
                                <span className={`h-3 w-3 shrink-0 rounded border-2 flex items-center justify-center ${isChecked ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                                    {isChecked && <span className="text-[8px] text-primary-foreground font-bold">✓</span>}
                                </span>
                                {emoji} {mod.name}
                            </label>
                        );
                    })}
                </div>
                <InputError message={form.errors.suggested_modules} />
            </div>

            {/* Icon + Color */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('Icon')}</Label>
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20 text-xl">
                            {form.data.icon || '📡'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {['🏪', '🏭', '💊', '🏨', '🏢', '🚛', '🧊', '⚡', '🛡️', '🌡️'].map((emoji) => (
                                <button key={emoji} type="button" onClick={() => form.setData('icon', emoji)}
                                    className={`flex h-7 w-7 items-center justify-center rounded text-sm transition-all ${form.data.icon === emoji ? 'bg-primary/15 ring-1 ring-primary' : 'hover:bg-accent/40'}`}>
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                    <InputError message={form.errors.icon} />
                </div>

                <div className="space-y-2">
                    <Label>{t('Color')}</Label>
                    <div className="flex items-center gap-3">
                        <input type="color" value={form.data.color || '#06b6d4'}
                            onChange={(e) => form.setData('color', e.target.value)}
                            className="h-10 w-10 shrink-0 cursor-pointer appearance-none rounded-lg border border-border bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none" />
                        <div className="flex flex-wrap gap-1">
                            {['#06b6d4', '#22c55e', '#f59e0b', '#f43f5e', '#8b5cf6', '#3b82f6', '#fb923c', '#14b8a6'].map((c) => (
                                <button key={c} type="button" onClick={() => form.setData('color', c)}
                                    className={`h-6 w-6 rounded-full border-2 transition-all ${form.data.color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground/50">{form.data.color || '#06b6d4'}</p>
                    <InputError message={form.errors.color} />
                </div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-3">
                <Switch checked={form.data.active} onCheckedChange={(checked) => form.setData('active', checked)} />
                <Label>{t('Active')}</Label>
            </div>

            <Button type="submit" className="w-full" disabled={form.processing}>
                {form.processing
                    ? isEdit ? t('Saving...') : t('Creating...')
                    : isEdit ? t('Save Changes') : t('Create Segment')
                }
            </Button>
        </form>
    );
}
