import { ProductForm } from '@/components/Products/ProductForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import type { Category, Product, ProductFormData } from '@/types/product';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Edit3, Package } from 'lucide-react';
import { useState } from 'react';

interface ProductsEditProps {
    product: Product;
    categories: Category[];
}

export default function ProductsEdit({ product: initialProduct, categories: initialCategories }: ProductsEditProps) {
    const [loading, setLoading] = useState(false);

    const product = initialProduct;
    const categories = initialCategories;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/dashboard' },
        { title: 'Products', href: '/products' },
        { title: product.name, href: `/products/${product.id}` },
        { title: 'Edit', href: `/products/${product.id}/edit` },
    ];

    const handleSubmit = (data: ProductFormData) => {
        setLoading(true);

        router.put(`/products/${product.id}`, data, {
            onSuccess: () => {
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handleCancel = () => {
        router.get(`/products/${product.id}`);
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'active':
                return { color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' };
            case 'inactive':
                return { color: 'bg-gray-400', textColor: 'text-muted-foreground' };
            case 'draft':
                return { color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' };
            default:
                return { color: 'bg-gray-400', textColor: 'text-muted-foreground' };
        }
    };

    const statusConfig = getStatusConfig(product.status);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${product.name}`} />

            <div className="animate-page-enter">
                {/* Hero Header */}
                <div className="relative overflow-hidden border-b bg-gradient-to-br from-muted/30 via-background to-muted/20">
                    {/* Decorative elements */}
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />

                    <div className="relative p-6 lg:p-8">
                        {/* Back Button */}
                        <div className="mb-6">
                            <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
                                <Link href={`/products/${product.id}`}>
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Product
                                </Link>
                            </Button>
                        </div>

                        <div className="flex items-start gap-6">
                            {/* Product Image or Icon */}
                            <div className="hidden shrink-0 sm:block">
                                {product.image_url ? (
                                    <div className="h-20 w-20 overflow-hidden rounded-2xl border shadow-lg">
                                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted shadow-lg">
                                        <Package className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            {/* Text */}
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-3">
                                    <Edit3 className="h-4 w-4 text-muted-foreground sm:hidden" />
                                    <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Edit Product</span>
                                    <Badge variant="outline" className="gap-1.5">
                                        <div className={cn('h-1.5 w-1.5 rounded-full', statusConfig.color)} />
                                        <span className="capitalize">{product.status}</span>
                                    </Badge>
                                </div>
                                <h1 className="truncate font-display text-3xl tracking-tight lg:text-4xl">{product.name}</h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <span className="font-mono">SKU: {product.sku}</span>
                                    <span>•</span>
                                    <span>${product.price.toFixed(2)}</span>
                                    <span>•</span>
                                    <span>{product.stock} in stock</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="p-6 lg:p-8">
                    <div className="mx-auto max-w-4xl">
                        <ProductForm
                            product={product}
                            categories={categories}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            loading={loading}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
