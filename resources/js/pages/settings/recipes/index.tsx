import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ContentWithSidebar } from '@/components/ui/content-with-sidebar';
import { DataTable } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import type { FilterPill } from '@/components/ui/filter-toolbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Module, Recipe } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, FlaskConical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

/* ── Types ────────────────────────────────────────────────────────── */

interface SensorModelInfo {
    model: string;
    supported_metrics: string[];
}

interface Props {
    recipes: Recipe[];
    modules: Pick<Module, 'id' | 'name'>[];
    sensorModels?: SensorModelInfo[];
}

interface ConditionRow {
    metric: string;
    condition: string;
    threshold: string;
    duration_minutes: string;
    severity: string;
}

const EMPTY_CONDITION: ConditionRow = {
    metric: '',
    condition: 'above',
    threshold: '',
    duration_minutes: '0',
    severity: 'medium',
};

/* ── Breadcrumbs ──────────────────────────────────────────────────── */

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Recipes', href: '/recipes' },
];

/* ── Main Component ───────────────────────────────────────────────── */

export default function RecipeIndex({ recipes, modules, sensorModels = [] }: Props) {
    const { t } = useLang();
    const { auth } = usePage<{ auth: { roles: string[] } }>().props;
    const isSuperAdmin = auth.roles?.includes('super_admin');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [deleteRecipe, setDeleteRecipe] = useState<Recipe | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Client-side filters
    const [moduleFilter, setModuleFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter sidebar visibility with localStorage persistence
    const [showFilters, setShowFilters] = useState(() => {
        try {
            return localStorage.getItem('recipes-show-filters') === 'true';
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('recipes-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    // Extract unique module names
    const moduleOptions = useMemo(() => {
        const mods = new Map<string, string>();
        for (const recipe of recipes) {
            const moduleName = recipe.module?.name ?? 'Other';
            mods.set(moduleName, moduleName);
        }
        return Array.from(mods.values()).sort();
    }, [recipes]);

    // Client-side filtering
    const filteredRecipes = useMemo(() => {
        let result = recipes;

        if (moduleFilter !== 'all') {
            result = result.filter((recipe) => (recipe.module?.name ?? 'Other') === moduleFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter((recipe) =>
                recipe.name.toLowerCase().includes(query),
            );
        }

        return result;
    }, [recipes, moduleFilter, searchQuery]);

    const hasFilters = moduleFilter !== 'all' || searchQuery.trim() !== '';

    function clearAllFilters() {
        setModuleFilter('all');
        setSearchQuery('');
    }

    // Build filter pills
    const filterPills = useMemo<FilterPill[]>(() => {
        const pills: FilterPill[] = [];
        if (moduleFilter !== 'all') {
            pills.push({
                key: 'module',
                label: `Module: ${moduleFilter}`,
                onRemove: () => setModuleFilter('all'),
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
    }, [moduleFilter, searchQuery]);

    // CRUD handlers
    function openCreateDialog() {
        setEditingRecipe(null);
        setDialogOpen(true);
    }

    function openEditDialog(recipe: Recipe) {
        setEditingRecipe(recipe);
        setDialogOpen(true);
    }

    function handleDelete() {
        if (!deleteRecipe) return;
        setDeleteLoading(true);
        router.delete(`/recipes/${deleteRecipe.id}`, {
            onFinish: () => {
                setDeleteLoading(false);
                setDeleteRecipe(null);
            },
        });
    }

    // Column definitions (memoized)
    const columns = useMemo<ColumnDef<Recipe>[]>(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    {t('Name')}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            id: 'module',
            header: t('Module'),
            cell: ({ row }) => {
                const moduleName = row.original.module?.name ?? 'Other';
                return <Badge variant="secondary">{moduleName}</Badge>;
            },
        },
        {
            accessorKey: 'sensor_model',
            header: t('Sensor Model'),
            cell: ({ row }) => (
                <span className="font-mono text-xs">{row.original.sensor_model}</span>
            ),
        },
        {
            id: 'rules_count',
            header: t('Rules'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{row.original.default_rules.length}</span>
            ),
        },
        {
            id: 'devices_count',
            header: t('Devices'),
            cell: ({ row }) => (
                <span className={`font-mono tabular-nums text-xs ${(row.original.devices_count ?? 0) > 0 ? 'font-semibold' : 'text-muted-foreground'}`}>
                    {row.original.devices_count ?? 0}
                </span>
            ),
        },
        {
            id: 'overrides_count',
            header: t('Overrides'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums text-xs text-muted-foreground">
                    {row.original.overrides_count ?? 0}
                </span>
            ),
        },
        {
            accessorKey: 'description',
            header: t('Description'),
            cell: ({ row }) => (
                <span className="line-clamp-1 max-w-[300px] text-sm text-muted-foreground">
                    {row.original.description ?? '\u2014'}
                </span>
            ),
        },
        ...(isSuperAdmin
            ? [
                  {
                      id: 'actions',
                      header: '',
                      cell: ({ row }: { row: { original: Recipe } }) => (
                          <div className="flex items-center justify-end gap-1">
                              <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      openEditDialog(row.original);
                                  }}
                              >
                                  <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteRecipe(row.original);
                                  }}
                              >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                          </div>
                      ),
                  } as ColumnDef<Recipe>,
              ]
            : []),
    ], [t, isSuperAdmin]);

    // Row click handler
    const handleRowClick = useCallback((recipe: Recipe) => {
        router.get(`/recipes/${recipe.id}`);
    }, []);

    // Empty state
    const emptyStateNode = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<FlaskConical className="h-5 w-5 text-muted-foreground" />}
            title={
                hasFilters
                    ? t('No recipes match these filters')
                    : t('No recipes available')
            }
            description={
                hasFilters
                    ? t('Try adjusting your filters to see more results')
                    : t('Recipes will appear here once configured')
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
                        {t('Module')}
                    </Label>
                    <Select value={moduleFilter} onValueChange={setModuleFilter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Module')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Modules')}</SelectItem>
                            {moduleOptions.map((mod) => (
                                <SelectItem key={mod} value={mod}>
                                    {mod}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                            placeholder={t('Recipe name...')}
                            className="pl-8"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Recipes')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header -------------------------------------------------- */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Recipes')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Recipe Library')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                        {recipes.length}
                                    </span>{' '}
                                    {t('sensor recipe(s) available')}
                                </p>
                            </div>
                            {isSuperAdmin && (
                                <Button onClick={openCreateDialog}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('Create Recipe')}
                                </Button>
                            )}
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
                                data={filteredRecipes}
                                getRowId={(row) => String(row.id)}
                                onRowClick={handleRowClick}
                                bordered={false}
                                emptyState={emptyStateNode}
                            />
                        </Card>
                    </ContentWithSidebar>
                </FadeIn>
            </div>

            {/* -- Create / Edit Dialog ------------------------------------ */}
            <RecipeFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                recipe={editingRecipe}
                modules={modules}
                sensorModels={sensorModels}
            />

            {/* -- Delete Confirmation ------------------------------------- */}
            <ConfirmationDialog
                open={!!deleteRecipe}
                onOpenChange={(open) => !open && setDeleteRecipe(null)}
                title={t('Delete Recipe')}
                description={`Are you sure you want to delete "${deleteRecipe?.name}"?`}
                warningMessage={t('This action cannot be undone. Any devices using this recipe will lose their recipe reference.')}
                loading={deleteLoading}
                onConfirm={handleDelete}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

/* ── Recipe Form Dialog ──────────────────────────────────────────── */

function RecipeFormDialog({
    open,
    onOpenChange,
    recipe,
    modules,
    sensorModels = [],
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipe: Recipe | null;
    modules: Pick<Module, 'id' | 'name'>[];
    sensorModels?: SensorModelInfo[];
}) {
    const { t } = useLang();
    const isEditing = !!recipe;

    // Form state
    const [name, setName] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [sensorModel, setSensorModel] = useState('');
    const [description, setDescription] = useState('');
    const [editable, setEditable] = useState(true);
    const [conditions, setConditions] = useState<ConditionRow[]>([{ ...EMPTY_CONDITION }]);

    // Available metrics based on selected sensor model
    const availableMetrics = useMemo(() => {
        const sm = sensorModels.find((s) => s.model === sensorModel);
        return sm?.supported_metrics ?? [];
    }, [sensorModel, sensorModels]);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form when dialog opens / recipe changes
    const resetForm = useCallback((r: Recipe | null) => {
        if (r) {
            setName(r.name);
            setModuleId(String(r.module_id));
            setSensorModel(r.sensor_model);
            setDescription(r.description ?? '');
            setEditable(r.editable);
            setConditions(
                r.default_rules.map((rule) => ({
                    metric: rule.metric,
                    condition: rule.condition,
                    threshold: String(rule.threshold),
                    duration_minutes: String(rule.duration_minutes),
                    severity: rule.severity,
                })),
            );
        } else {
            setName('');
            setModuleId('');
            setSensorModel('');
            setDescription('');
            setEditable(true);
            setConditions([{ ...EMPTY_CONDITION }]);
        }
        setErrors({});
    }, []);

    // When dialog opens, reset form
    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (nextOpen) {
                resetForm(recipe);
            }
            onOpenChange(nextOpen);
        },
        [recipe, onOpenChange, resetForm],
    );

    // Ensure form resets when recipe prop changes while dialog is open
    useMemo(() => {
        if (open) resetForm(recipe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, recipe]);

    function addCondition() {
        setConditions((prev) => [...prev, { ...EMPTY_CONDITION }]);
    }

    function removeCondition(index: number) {
        if (conditions.length <= 1) return;
        setConditions((prev) => prev.filter((_, i) => i !== index));
    }

    function updateCondition(index: number, field: keyof ConditionRow, value: string) {
        setConditions((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const payload = {
            name,
            module_id: Number(moduleId),
            sensor_model: sensorModel,
            description: description || null,
            editable,
            default_rules: conditions.map((c) => ({
                metric: c.metric,
                condition: c.condition,
                threshold: Number(c.threshold),
                duration_minutes: Number(c.duration_minutes),
                severity: c.severity,
            })),
        };

        const url = isEditing ? `/recipes/${recipe.id}` : '/recipes';
        const method = isEditing ? 'put' : 'post';

        router[method](url, payload, {
            onSuccess: () => {
                setProcessing(false);
                onOpenChange(false);
            },
            onError: (errs) => {
                setProcessing(false);
                setErrors(errs);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? t('Edit Recipe') : t('Create Recipe')}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? t('Update the recipe details and default alert rules.')
                            : t('Define a new sensor recipe with default alert rules.')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Fields */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <Label htmlFor="recipe-name">{t('Name')} *</Label>
                            <Input
                                id="recipe-name"
                                className="mt-1.5"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('e.g., Walk-in Cooler Standard')}
                                required
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                            )}
                        </div>

                        <div>
                            <Label>{t('Module')} *</Label>
                            <Select value={moduleId} onValueChange={setModuleId}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder={t('Select module')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {modules.map((mod) => (
                                        <SelectItem key={mod.id} value={String(mod.id)}>
                                            {mod.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.module_id && (
                                <p className="mt-1 text-xs text-destructive">{errors.module_id}</p>
                            )}
                        </div>

                        <div>
                            <Label>{t('Sensor Model')} *</Label>
                            <Select value={sensorModel} onValueChange={setSensorModel}>
                                <SelectTrigger className="mt-1.5 font-mono">
                                    <SelectValue placeholder={t('Select sensor model')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {sensorModels.map((sm) => (
                                        <SelectItem key={sm.model} value={sm.model}>
                                            <span className="font-mono">{sm.model}</span>
                                            <span className="ml-2 text-muted-foreground text-xs">
                                                ({sm.supported_metrics.join(', ')})
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.sensor_model && (
                                <p className="mt-1 text-xs text-destructive">{errors.sensor_model}</p>
                            )}
                        </div>

                        <div className="sm:col-span-2">
                            <Label htmlFor="description">{t('Description')}</Label>
                            <Textarea
                                id="description"
                                className="mt-1.5"
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('Optional description...')}
                            />
                            {errors.description && (
                                <p className="mt-1 text-xs text-destructive">{errors.description}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-3 sm:col-span-2">
                            <Switch
                                id="editable-toggle"
                                checked={editable}
                                onCheckedChange={setEditable}
                            />
                            <Label htmlFor="editable-toggle">
                                {t('Allow site-level overrides')}
                            </Label>
                        </div>
                    </div>

                    {/* Conditions / Default Rules */}
                    <div>
                        <div className="mb-3 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Default Rules')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                            <Badge variant="outline" className="font-mono tabular-nums">
                                {conditions.length}
                            </Badge>
                        </div>

                        {errors.default_rules && (
                            <p className="mb-2 text-xs text-destructive">{errors.default_rules}</p>
                        )}

                        <div className="space-y-3">
                            {conditions.map((cond, idx) => (
                                <Card key={idx} className="shadow-sm">
                                    <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
                                        <CardTitle className="text-sm">
                                            {t('Rule')} {idx + 1}
                                        </CardTitle>
                                        {conditions.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => removeCondition(idx)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-5">
                                        <div>
                                            <Label className="text-xs">{t('Metric')}</Label>
                                            {availableMetrics.length > 0 ? (
                                                <Select value={cond.metric} onValueChange={(v) => updateCondition(idx, 'metric', v)}>
                                                    <SelectTrigger className="mt-1"><SelectValue placeholder={t('Select metric')} /></SelectTrigger>
                                                    <SelectContent>
                                                        {availableMetrics.map((m) => (
                                                            <SelectItem key={m} value={m}>
                                                                <span className="font-mono">{m}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    className="mt-1"
                                                    value={cond.metric}
                                                    onChange={(e) => updateCondition(idx, 'metric', e.target.value)}
                                                    placeholder="temperature"
                                                    required
                                                />
                                            )}
                                            {errors[`default_rules.${idx}.metric`] && (
                                                <p className="mt-1 text-xs text-destructive">
                                                    {errors[`default_rules.${idx}.metric`]}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Label className="text-xs">{t('Condition')}</Label>
                                            <Select
                                                value={cond.condition}
                                                onValueChange={(v) =>
                                                    updateCondition(idx, 'condition', v)
                                                }
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="above">{t('Above')}</SelectItem>
                                                    <SelectItem value="below">{t('Below')}</SelectItem>
                                                    <SelectItem value="equals">{t('Equals')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">{t('Threshold')}</Label>
                                            <Input
                                                type="number"
                                                step="any"
                                                className="mt-1 font-mono"
                                                value={cond.threshold}
                                                onChange={(e) =>
                                                    updateCondition(idx, 'threshold', e.target.value)
                                                }
                                                placeholder="8"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">{t('Duration (min)')}</Label>
                                            <Input
                                                type="number"
                                                className="mt-1 font-mono"
                                                min={0}
                                                value={cond.duration_minutes}
                                                onChange={(e) =>
                                                    updateCondition(idx, 'duration_minutes', e.target.value)
                                                }
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">{t('Severity')}</Label>
                                            <Select
                                                value={cond.severity}
                                                onValueChange={(v) =>
                                                    updateCondition(idx, 'severity', v)
                                                }
                                            >
                                                <SelectTrigger className="mt-1">
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
                                    </CardContent>
                                </Card>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-dashed"
                                onClick={addCondition}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add Rule')}
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <FlaskConical className="mr-2 h-4 w-4" />
                            {processing
                                ? isEditing
                                    ? t('Saving...')
                                    : t('Creating...')
                                : isEditing
                                  ? t('Save Changes')
                                  : t('Create Recipe')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* -- Skeleton --------------------------------------------------------- */

export function RecipesSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-3 h-8 w-40" />
                <Skeleton className="mt-2 h-4 w-32" />
            </div>
            {/* Filter Toolbar */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
            </div>
            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableHead key={i}>
                                    <Skeleton className="h-3 w-16" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
