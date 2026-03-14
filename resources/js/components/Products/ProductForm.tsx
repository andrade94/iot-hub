import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form-rhf';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Category, Product, ProductFormData } from '@/types/product';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, DollarSign, Hash, ImagePlus, Layers, Loader2, Package, Sparkles, Type, Upload, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const productSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    price: z.number().min(0.01, 'Price must be greater than 0'),
    category_id: z.string().min(1, 'Category is required'),
    status: z.enum(['active', 'inactive', 'draft']),
    stock: z.number().min(0, 'Stock cannot be negative'),
    sku: z.string().min(3, 'SKU must be at least 3 characters'),
});

type FormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
    product?: Product;
    categories: Category[];
    onSubmit: (data: ProductFormData) => void;
    onCancel: () => void;
    loading?: boolean;
}

export function ProductForm({ product, categories, onSubmit, onCancel, loading = false }: ProductFormProps) {
    const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: product?.name || '',
            description: product?.description || '',
            price: product?.price || 0,
            category_id: product?.category.id || '',
            status: product?.status || 'draft',
            stock: product?.stock || 0,
            sku: product?.sku || '',
        },
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processImageFile(file);
        }
    };

    const processImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processImageFile(file);
        }
    };

    const handleImageRemove = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleSubmit = (data: FormValues) => {
        onSubmit({
            ...data,
            image: imageFile,
        });
    };

    const generateSKU = () => {
        const sku = `SKU-${Date.now().toString().slice(-8)}`;
        form.setValue('sku', sku);
    };

    const categoryOptions = categories.map((cat) => ({
        label: cat.name,
        value: cat.id,
    }));

    const statusOptions = [
        {
            value: 'active',
            label: 'Active',
            description: 'Visible and available for purchase',
            icon: Sparkles,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-500/10 border-emerald-500/20',
            indicatorColor: 'bg-emerald-500',
        },
        {
            value: 'inactive',
            label: 'Inactive',
            description: 'Hidden from customers',
            icon: Package,
            color: 'text-muted-foreground',
            bgColor: 'bg-muted border-border',
            indicatorColor: 'bg-gray-400',
        },
        {
            value: 'draft',
            label: 'Draft',
            description: 'Work in progress',
            icon: Zap,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-500/10 border-amber-500/20',
            indicatorColor: 'bg-amber-500',
        },
    ];

    const watchedStatus = form.watch('status');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Basic Information */}
                <Card className="stagger-item border-0 shadow-elevation-2">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <Type className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Basic Information</CardTitle>
                                <CardDescription>Enter the product's name and description</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Product Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Premium Wireless Headphones" className="h-11" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe your product in detail..."
                                            rows={5}
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>Minimum 10 characters. Be descriptive for better search results.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Pricing & Inventory */}
                <Card className="stagger-item border-0 shadow-elevation-2">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <CardTitle>Pricing & Inventory</CardTitle>
                                <CardDescription>Set pricing and manage stock levels</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price</FormLabel>
                                        <FormControl>
                                            <CurrencyInput value={field.value} onChange={field.onChange} placeholder="0.00" className="h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="stock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Stock Quantity</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                className="h-11"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="sku"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                                    <div className="flex gap-2">
                                        <FormControl>
                                            <Input placeholder="e.g., SKU-12345678" className="h-11 font-mono" {...field} />
                                        </FormControl>
                                        <Button type="button" variant="outline" onClick={generateSKU} className="h-11 shrink-0 gap-2">
                                            <Zap className="h-4 w-4" />
                                            Generate
                                        </Button>
                                    </div>
                                    <FormDescription>Unique identifier for inventory tracking</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Organization */}
                <Card className="stagger-item border-0 shadow-elevation-2">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                                <Layers className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <CardTitle>Organization</CardTitle>
                                <CardDescription>Categorize and set product visibility</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="category_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={categoryOptions}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Select a category"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <FormControl>
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            {statusOptions.map((option) => {
                                                const Icon = option.icon;
                                                const isSelected = field.value === option.value;
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => field.onChange(option.value)}
                                                        className={cn(
                                                            'relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all',
                                                            isSelected ? option.bgColor : 'border-border bg-card hover:border-muted-foreground/20',
                                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                                                        )}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute right-2 top-2">
                                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                                    <Check className="h-3 w-3" />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn('h-2 w-2 rounded-full', option.indicatorColor)} />
                                                            <Icon className={cn('h-4 w-4', option.color)} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{option.label}</p>
                                                            <p className="text-xs text-muted-foreground">{option.description}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Image Upload */}
                <Card className="stagger-item border-0 shadow-elevation-2">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10">
                                <ImagePlus className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                            </div>
                            <div>
                                <CardTitle>Product Image</CardTitle>
                                <CardDescription>Upload a high-quality image of your product</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {imagePreview ? (
                            <div className="relative inline-block">
                                <div className="overflow-hidden rounded-xl border-2 border-dashed border-border">
                                    <img src={imagePreview} alt="Preview" className="h-64 w-64 object-cover" />
                                </div>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -right-2 -top-2 h-8 w-8 rounded-full shadow-lg"
                                    onClick={handleImageRemove}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <div className="mt-3 text-center">
                                    <Label htmlFor="image-upload" className="cursor-pointer text-sm text-primary hover:underline">
                                        Change image
                                    </Label>
                                    <Input id="image-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                                </div>
                            </div>
                        ) : (
                            <div
                                className={cn(
                                    'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors',
                                    dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30'
                                )}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragOver(true);
                                }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    onChange={handleImageChange}
                                />
                                <div
                                    className={cn(
                                        'mb-4 rounded-xl p-4 transition-colors',
                                        dragOver ? 'bg-primary/10' : 'bg-muted'
                                    )}
                                >
                                    <Upload className={cn('h-8 w-8', dragOver ? 'text-primary' : 'text-muted-foreground')} />
                                </div>
                                <p className="text-sm font-medium">
                                    <span className="text-primary">Click to upload</span>
                                    <span className="text-muted-foreground"> or drag and drop</span>
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="stagger-item flex items-center justify-end gap-4 rounded-xl border bg-card p-4 shadow-sm">
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading} className="min-w-[140px] gap-2">
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                {product ? 'Save Changes' : 'Create Product'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
