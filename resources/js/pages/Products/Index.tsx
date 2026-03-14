import { BulkActions } from '@/components/Products/BulkActions';
import { ExportDialog } from '@/components/Products/ExportDialog';
import { ProductsFilters } from '@/components/Products/ProductsFilters';
import { ProductsTable } from '@/components/Products/ProductsTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import type { PaginatedResponse } from '@/types/pagination';
import type { Category, Product, ProductFilters, ProductStats } from '@/types/product';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Box,
    ChevronLeft,
    ChevronRight,
    Download,
    Package,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    SlidersHorizontal,
    Sparkles,
    TrendingUp,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ProductsIndexProps {
    products: PaginatedResponse<Product>;
    categories: Category[];
    stats: ProductStats;
    filters: ProductFilters;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Home', href: '/dashboard' },
    { title: 'Products', href: '/products' },
];

const FILTERS_STORAGE_KEY = 'products-filters-visible';

export default function ProductsIndex({
    products: initialProducts,
    categories,
    stats,
    filters: initialFilters,
}: ProductsIndexProps) {
    const [filters, setFilters] = useState<ProductFilters>(initialFilters);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [showFilters, setShowFilters] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
            return stored !== null ? stored === 'true' : true;
        }
        return true;
    });

    const products = initialProducts;

    // Persist filter visibility to localStorage
    useEffect(() => {
        localStorage.setItem(FILTERS_STORAGE_KEY, String(showFilters));
    }, [showFilters]);

    const handleFiltersChange = (newFilters: ProductFilters) => {
        setFilters(newFilters);
        router.get('/products', newFilters, { preserveState: true });
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? products.data.map((p) => p.id) : []);
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
    };

    const handleView = (product: Product) => {
        router.get(`/products/${product.id}`);
    };

    const handleEdit = (product: Product) => {
        router.get(`/products/${product.id}/edit`);
    };

    const handleDuplicate = (product: Product) => {
        toast.success(`Duplicated "${product.name}" (demo mode)`);
    };

    const handleDelete = () => {
        if (!deletingProduct) return;

        setLoadingItemId(deletingProduct.id);

        router.delete(`/products/${deletingProduct.id}`, {
            onSuccess: () => {
                toast.success(`Deleted "${deletingProduct.name}"`);
                setDeletingProduct(null);
                setLoadingItemId(null);
                setSelectedIds([]);
            },
            onError: () => {
                setLoadingItemId(null);
            },
        });
    };

    const handleBulkDelete = () => {
        router.delete('/products/bulk/destroy', {
            data: { ids: selectedIds },
            onSuccess: () => {
                setSelectedIds([]);
            },
        });
    };

    const handleBulkStatusChange = (status: 'active' | 'inactive' | 'draft') => {
        router.post(
            '/products/bulk/update-status',
            {
                ids: selectedIds,
                status,
            },
            {
                onSuccess: () => {
                    setSelectedIds([]);
                },
            }
        );
    };

    const handleBulkExport = () => {
        setShowExportDialog(true);
    };

    const activeFilterCount = Object.keys(filters).filter(
        (key) => filters[key as keyof ProductFilters] !== undefined
    ).length;

    // Calculate percentages for visual indicators
    const totalProducts = products.meta.total || 1;
    const activePercent = Math.round((stats.active / totalProducts) * 100);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products" />

            <div className="animate-page-enter space-y-8 p-6 lg:p-8">
                {/* Page Header */}
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <Box className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                                Inventory
                            </span>
                        </div>
                        <h1 className="font-display text-4xl font-bold tracking-tight lg:text-5xl">Products</h1>
                        <p className="max-w-md text-muted-foreground">
                            Manage your product catalog, track inventory levels, and organize your offerings.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => setShowExportDialog(true)} className="gap-2">
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Button onClick={() => router.get('/products/create')} className="gap-2 shadow-lg">
                            <Plus className="h-4 w-4" />
                            New Product
                        </Button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Total Products */}
                    <Card className="stagger-item group overflow-hidden border-0 shadow-elevation-2 transition-all hover:shadow-elevation-3">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                                    <p className="font-display text-4xl tracking-tight">{products.meta.total}</p>
                                    <p className="text-xs text-muted-foreground">In your catalog</p>
                                </div>
                                <div className="rounded-lg bg-muted/50 p-2.5 transition-colors group-hover:bg-primary/10">
                                    <Package className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Products */}
                    <Card className="stagger-item group relative overflow-hidden border-0 shadow-elevation-2 transition-all hover:shadow-elevation-3">
                        <div
                            className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"
                            style={{ width: `${activePercent}%` }}
                        />
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                                    <p className="font-display text-4xl tracking-tight text-emerald-600 dark:text-emerald-400">
                                        {stats.active}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        <span>{activePercent}% of catalog</span>
                                    </div>
                                </div>
                                <div className="rounded-lg bg-emerald-500/10 p-2.5">
                                    <Sparkles className="h-5 w-5 text-emerald-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Low Stock */}
                    <Card className="stagger-item group overflow-hidden border-0 shadow-elevation-2 transition-all hover:shadow-elevation-3">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                                    <p className="font-display text-4xl tracking-tight text-amber-600 dark:text-amber-400">
                                        {stats.low_stock}
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">Need restocking</p>
                                </div>
                                <div className="rounded-lg bg-amber-500/10 p-2.5">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Out of Stock */}
                    <Card
                        className={cn(
                            'stagger-item group overflow-hidden border-0 shadow-elevation-2 transition-all hover:shadow-elevation-3',
                            stats.out_of_stock > 0 && 'ring-1 ring-destructive/20'
                        )}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                                    <p className="font-display text-4xl tracking-tight text-destructive">
                                        {stats.out_of_stock}
                                    </p>
                                    <p className="text-xs text-destructive">Require attention</p>
                                </div>
                                <div className="rounded-lg bg-destructive/10 p-2.5">
                                    <XCircle className="h-5 w-5 text-destructive" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Toggle & Active Filters Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Filter Toggle Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={showFilters ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className="gap-2"
                            >
                                {showFilters ? (
                                    <PanelLeftClose className="h-4 w-4" />
                                ) : (
                                    <PanelLeftOpen className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">Filters</span>
                                {activeFilterCount > 0 && (
                                    <Badge variant="default" className="ml-1 h-5 min-w-5 px-1.5">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {showFilters ? 'Hide filters' : 'Show filters'}
                        </TooltipContent>
                    </Tooltip>

                    {/* Active Filters Pills */}
                    {activeFilterCount > 0 && (
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                            <span className="text-sm text-muted-foreground">Active:</span>
                            {filters.search && (
                                <Badge
                                    variant="secondary"
                                    className="cursor-pointer gap-1.5 pr-1.5 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => handleFiltersChange({ ...filters, search: undefined })}
                                >
                                    Search: "{filters.search}"
                                    <X className="h-3 w-3" />
                                </Badge>
                            )}
                            {filters.status?.map((status) => (
                                <Badge
                                    key={status}
                                    variant="secondary"
                                    className="cursor-pointer gap-1.5 pr-1.5 capitalize transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() =>
                                        handleFiltersChange({
                                            ...filters,
                                            status: filters.status?.filter((s) => s !== status),
                                        })
                                    }
                                >
                                    {status}
                                    <X className="h-3 w-3" />
                                </Badge>
                            ))}
                            {filters.categories && filters.categories.length > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="cursor-pointer gap-1.5 pr-1.5 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => handleFiltersChange({ ...filters, categories: undefined })}
                                >
                                    {filters.categories.length} {filters.categories.length === 1 ? 'category' : 'categories'}
                                    <X className="h-3 w-3" />
                                </Badge>
                            )}
                            {(filters.price_min || filters.price_max) && (
                                <Badge
                                    variant="secondary"
                                    className="cursor-pointer gap-1.5 pr-1.5 font-mono transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => handleFiltersChange({ ...filters, price_min: undefined, price_max: undefined })}
                                >
                                    ${filters.price_min || 0} – ${filters.price_max || '∞'}
                                    <X className="h-3 w-3" />
                                </Badge>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => handleFiltersChange({})}
                            >
                                Clear all
                            </Button>
                        </div>
                    )}
                </div>

                {/* Main Content Grid */}
                <div
                    className={cn(
                        'grid gap-6 transition-all duration-300 ease-out',
                        showFilters ? 'lg:grid-cols-[280px_1fr]' : 'lg:grid-cols-1'
                    )}
                >
                    {/* Filters Sidebar */}
                    <aside
                        className={cn(
                            'transition-all duration-300 ease-out',
                            showFilters
                                ? 'translate-x-0 opacity-100'
                                : 'hidden lg:block lg:invisible lg:h-0 lg:w-0 lg:-translate-x-4 lg:overflow-hidden lg:opacity-0'
                        )}
                    >
                        <ProductsFilters filters={filters} onFiltersChange={handleFiltersChange} categories={categories} />
                    </aside>

                    {/* Products Table */}
                    <main className="min-w-0">
                        {isLoading ? (
                            <Card className="border-0 shadow-elevation-2">
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        {[...Array(5)].map((_, i) => (
                                            <Skeleton key={i} className="h-16 w-full" />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : products.data.length === 0 ? (
                            <EmptyState
                                icon={<Package className="h-12 w-12" />}
                                title="No products found"
                                description="Get started by creating your first product or adjust your filters."
                                action={
                                    <Button onClick={() => router.get('/products/create')} className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Create Product
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                }
                            />
                        ) : (
                            <ProductsTable
                                products={products.data}
                                selectedIds={selectedIds}
                                onSelectAll={handleSelectAll}
                                onSelectOne={handleSelectOne}
                                onView={handleView}
                                onEdit={handleEdit}
                                onDuplicate={handleDuplicate}
                                onDelete={setDeletingProduct}
                            />
                        )}
                    </main>
                </div>

                {/* Bulk Actions */}
                <BulkActions
                    selectedCount={selectedIds.length}
                    onClearSelection={() => setSelectedIds([])}
                    onDelete={handleBulkDelete}
                    onStatusChange={handleBulkStatusChange}
                    onExport={handleBulkExport}
                />

                {/* Export Dialog */}
                <ExportDialog
                    open={showExportDialog}
                    onOpenChange={setShowExportDialog}
                    selectedIds={selectedIds}
                    filters={filters}
                />

                {/* Delete Confirmation */}
                <ConfirmationDialog
                    open={!!deletingProduct}
                    onOpenChange={(open) => !open && setDeletingProduct(null)}
                    title="Delete Product?"
                    description={`This will permanently delete the product "${deletingProduct?.name}".`}
                    warningMessage="This action cannot be undone. This product may be part of active orders."
                    loading={loadingItemId !== null}
                    onConfirm={handleDelete}
                    actionLabel="Delete Product"
                />
            </div>
        </AppLayout>
    );
}
