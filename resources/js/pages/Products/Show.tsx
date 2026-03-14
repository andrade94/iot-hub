import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import type { Product } from '@/types/product';
import { Head, Link, router } from '@inertiajs/react';
import { format, formatDistanceToNow } from 'date-fns';
import {
    ArrowLeft,
    ArrowUpRight,
    Box,
    Calendar,
    Check,
    Clock,
    DollarSign,
    Edit3,
    FileText,
    Hash,
    Layers,
    Package,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ProductsShowProps {
    product: Product;
}

export default function ProductsShow({ product: initialProduct }: ProductsShowProps) {
    const [deletingProduct, setDeletingProduct] = useState(false);
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

    const product = initialProduct;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/dashboard' },
        { title: 'Products', href: '/products' },
        { title: product.name, href: `/products/${product.id}` },
    ];

    const handleEdit = () => {
        router.get(`/products/${product.id}/edit`);
    };

    const handleDelete = () => {
        setLoadingItemId(product.id);

        router.delete(`/products/${product.id}`, {
            onSuccess: () => {
                toast.success(`Deleted "${product.name}"`);
                setDeletingProduct(false);
                setLoadingItemId(null);
            },
            onError: () => {
                setLoadingItemId(null);
            },
        });
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'active':
                return {
                    variant: 'default' as const,
                    label: 'Active',
                    color: 'bg-emerald-500',
                    textColor: 'text-emerald-600 dark:text-emerald-400',
                    bgColor: 'bg-emerald-500/10',
                };
            case 'inactive':
                return {
                    variant: 'secondary' as const,
                    label: 'Inactive',
                    color: 'bg-gray-400',
                    textColor: 'text-muted-foreground',
                    bgColor: 'bg-muted',
                };
            case 'draft':
                return {
                    variant: 'outline' as const,
                    label: 'Draft',
                    color: 'bg-amber-500',
                    textColor: 'text-amber-600 dark:text-amber-400',
                    bgColor: 'bg-amber-500/10',
                };
            default:
                return {
                    variant: 'secondary' as const,
                    label: status,
                    color: 'bg-gray-400',
                    textColor: 'text-muted-foreground',
                    bgColor: 'bg-muted',
                };
        }
    };

    const getStockConfig = (stock: number) => {
        if (stock === 0) {
            return {
                status: 'Out of Stock',
                color: 'text-destructive',
                bgColor: 'bg-destructive/10',
                indicatorColor: 'bg-destructive',
            };
        }
        if (stock < 10) {
            return {
                status: 'Low Stock',
                color: 'text-amber-600 dark:text-amber-400',
                bgColor: 'bg-amber-500/10',
                indicatorColor: 'bg-amber-500',
            };
        }
        return {
            status: 'In Stock',
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-500/10',
            indicatorColor: 'bg-emerald-500',
        };
    };

    const statusConfig = getStatusConfig(product.status);
    const stockConfig = getStockConfig(product.stock);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={product.name} />

            <div className="animate-page-enter">
                {/* Hero Section with Product Image */}
                <div className="relative">
                    {/* Background gradient */}
                    <div className="absolute inset-0 h-80 bg-gradient-to-b from-muted/50 to-background" />

                    <div className="relative space-y-8 p-6 lg:p-8">
                        {/* Back Button */}
                        <div>
                            <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
                                <Link href="/products">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Products
                                </Link>
                            </Button>
                        </div>

                        {/* Main Content */}
                        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
                            {/* Left Column - Image & Description */}
                            <div className="space-y-6">
                                {/* Product Image */}
                                <div className="stagger-item overflow-hidden rounded-2xl border bg-card shadow-elevation-3">
                                    <div className="aspect-[4/3] w-full">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-muted/30">
                                                <div className="text-center">
                                                    <Package className="mx-auto h-20 w-20 text-muted-foreground/30" />
                                                    <p className="mt-4 text-sm text-muted-foreground">No image available</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Description Card */}
                                <Card className="stagger-item border-0 shadow-elevation-2">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <FileText className="h-4 w-4" />
                                            Description
                                        </div>
                                        <Separator className="my-4" />
                                        <p className="leading-relaxed text-muted-foreground">
                                            {product.description || 'No description available for this product.'}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Timeline Card */}
                                <Card className="stagger-item border-0 shadow-elevation-2">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            Timeline
                                        </div>
                                        <Separator className="my-4" />
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                                    <Calendar className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Created</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {format(new Date(product.created_at), 'MMMM d, yyyy')} at{' '}
                                                        {format(new Date(product.created_at), 'h:mm a')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(product.created_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                                    <Edit3 className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Last Updated</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {format(new Date(product.updated_at), 'MMMM d, yyyy')} at{' '}
                                                        {format(new Date(product.updated_at), 'h:mm a')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(product.updated_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column - Product Info */}
                            <div className="space-y-6">
                                {/* Title & Actions */}
                                <div className="stagger-item space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={cn('h-2 w-2 rounded-full', statusConfig.color)}
                                                    aria-hidden="true"
                                                />
                                                <span className={cn('text-sm font-medium', statusConfig.textColor)}>
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                            <h1 className="font-display text-3xl tracking-tight lg:text-4xl">{product.name}</h1>
                                            <p className="font-mono text-sm text-muted-foreground">SKU: {product.sku}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button onClick={handleEdit} className="flex-1 gap-2">
                                            <Edit3 className="h-4 w-4" />
                                            Edit Product
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => setDeletingProduct(true)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Price Card */}
                                <Card className="stagger-item overflow-hidden border-0 shadow-elevation-2">
                                    <CardContent className="p-0">
                                        <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <DollarSign className="h-4 w-4" />
                                                Price
                                            </div>
                                            <p className="mt-2 font-display text-5xl tracking-tight">${product.price.toFixed(2)}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Stock Card */}
                                <Card className="stagger-item border-0 shadow-elevation-2">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Box className="h-4 w-4" />
                                                Inventory
                                            </div>
                                            <Badge variant="outline" className={cn(stockConfig.bgColor, stockConfig.color, 'border-0')}>
                                                {stockConfig.status}
                                            </Badge>
                                        </div>
                                        <Separator className="my-4" />
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="font-display text-4xl tracking-tight">{product.stock}</p>
                                                <p className="text-sm text-muted-foreground">units in stock</p>
                                            </div>
                                            <div className={cn('h-16 w-16 rounded-xl', stockConfig.bgColor, 'flex items-center justify-center')}>
                                                <Package className={cn('h-8 w-8', stockConfig.color)} />
                                            </div>
                                        </div>
                                        {product.stock > 0 && product.stock < 10 && (
                                            <div className="mt-4 rounded-lg bg-amber-500/10 p-3">
                                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                                    Running low. Consider restocking soon.
                                                </p>
                                            </div>
                                        )}
                                        {product.stock === 0 && (
                                            <div className="mt-4 rounded-lg bg-destructive/10 p-3">
                                                <p className="text-sm text-destructive">Out of stock. Restock immediately to continue sales.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Details Card */}
                                <Card className="stagger-item border-0 shadow-elevation-2">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Layers className="h-4 w-4" />
                                            Details
                                        </div>
                                        <Separator className="my-4" />
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Category</span>
                                                <Badge variant="secondary" className="gap-1.5">
                                                    <Hash className="h-3 w-3" />
                                                    {product.category.name}
                                                </Badge>
                                            </div>
                                            <Separator />
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Status</span>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('h-2 w-2 rounded-full', statusConfig.color)} />
                                                    <span className="text-sm font-medium capitalize">{product.status}</span>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Product ID</span>
                                                <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{product.id.slice(0, 8)}...</code>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Quick Actions */}
                                <Card className="stagger-item border-0 shadow-elevation-2">
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button variant="outline" size="sm" className="justify-start gap-2" asChild>
                                                <Link href={`/products/${product.id}/pdf`} target="_blank">
                                                    <FileText className="h-4 w-4" />
                                                    Export PDF
                                                    <ArrowUpRight className="ml-auto h-3 w-3" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="justify-start gap-2"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(product.sku);
                                                    toast.success('SKU copied to clipboard');
                                                }}
                                            >
                                                <Check className="h-4 w-4" />
                                                Copy SKU
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation */}
                <ConfirmationDialog
                    open={deletingProduct}
                    onOpenChange={(open) => !open && setDeletingProduct(false)}
                    title="Delete Product?"
                    description={`This will permanently delete the product "${product.name}".`}
                    warningMessage="This action cannot be undone. This product may be part of active orders."
                    loading={loadingItemId !== null}
                    onConfirm={handleDelete}
                    actionLabel="Delete Product"
                />
            </div>
        </AppLayout>
    );
}
