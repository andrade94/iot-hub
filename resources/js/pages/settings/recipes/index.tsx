import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ContentWithSidebar } from '@/components/ui/content-with-sidebar';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import type { FilterPill } from '@/components/ui/filter-toolbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Recipe } from '@/types';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, FlaskConical, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface Props {
    recipes: Recipe[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Recipes', href: '/recipes' },
];

export default function RecipeIndex({ recipes }: Props) {
    const { t } = useLang();

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
        const modules = new Map<string, string>();
        for (const recipe of recipes) {
            const moduleName = recipe.module?.name ?? 'Other';
            modules.set(moduleName, moduleName);
        }
        return Array.from(modules.values()).sort();
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
            accessorKey: 'description',
            header: t('Description'),
            cell: ({ row }) => (
                <span className="line-clamp-1 max-w-[300px] text-sm text-muted-foreground">
                    {row.original.description ?? '\u2014'}
                </span>
            ),
        },
    ], [t]);

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
                        <div className="relative p-6 md:p-8">
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
        </AppLayout>
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
