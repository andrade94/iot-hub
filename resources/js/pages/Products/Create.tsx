import { ProductForm } from '@/components/Products/ProductForm';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Category, ProductFormData } from '@/types/product';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Package, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface ProductsCreateProps {
    categories: Category[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Home', href: '/dashboard' },
    { title: 'Products', href: '/products' },
    { title: 'Create', href: '/products/create' },
];

export default function ProductsCreate({ categories: initialCategories }: ProductsCreateProps) {
    const [loading, setLoading] = useState(false);

    const categories = initialCategories;

    const handleSubmit = (data: ProductFormData) => {
        setLoading(true);

        router.post('/products', data, {
            onSuccess: () => {
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    const handleCancel = () => {
        router.get('/products');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Product" />

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
                                <Link href="/products">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Products
                                </Link>
                            </Button>
                        </div>

                        <div className="flex items-start gap-6">
                            {/* Icon */}
                            <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 shadow-lg sm:flex">
                                <Sparkles className="h-8 w-8 text-primary" />
                            </div>

                            {/* Text */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground sm:hidden" />
                                    <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">New Product</span>
                                </div>
                                <h1 className="font-display text-3xl tracking-tight lg:text-4xl">Create Product</h1>
                                <p className="max-w-lg text-muted-foreground">
                                    Add a new product to your catalog. Fill in the details below and your product will be ready for customers.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="p-6 lg:p-8">
                    <div className="mx-auto max-w-4xl">
                        <ProductForm categories={categories} onSubmit={handleSubmit} onCancel={handleCancel} loading={loading} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
