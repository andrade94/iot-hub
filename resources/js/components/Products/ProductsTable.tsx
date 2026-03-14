import { ProductActions } from '@/components/Products/ProductActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';
import { format } from 'date-fns';
import { ArrowUpDown, Package2 } from 'lucide-react';

interface ProductsTableProps {
    products: Product[];
    selectedIds: string[];
    onSelectAll: (checked: boolean) => void;
    onSelectOne: (id: string, checked: boolean) => void;
    onView: (product: Product) => void;
    onEdit: (product: Product) => void;
    onDuplicate: (product: Product) => void;
    onDelete: (product: Product) => void;
    onSort?: (column: string) => void;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
}

export function ProductsTable({
    products,
    selectedIds,
    onSelectAll,
    onSelectOne,
    onView,
    onEdit,
    onDuplicate,
    onDelete,
    onSort,
    sortColumn,
    sortDirection,
}: ProductsTableProps) {
    const allSelected =
        products.length > 0 && selectedIds.length === products.length;
    const someSelected = selectedIds.length > 0 && !allSelected;

    const getStatusVariant = (
        status: string
    ): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'active':
                return 'default';
            case 'inactive':
                return 'secondary';
            case 'draft':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const getStockColor = (stock: number) => {
        if (stock === 0) return 'text-destructive';
        if (stock < 10) return 'text-yellow-600';
        return 'text-green-600';
    };

    const getStockStatus = (stock: number) => {
        if (stock === 0) return 'Out of Stock';
        if (stock < 10) return 'Low Stock';
        return 'In Stock';
    };

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={
                                        allSelected
                                            ? true
                                            : someSelected
                                              ? 'indeterminate'
                                              : false
                                    }
                                    onCheckedChange={onSelectAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead className="w-16">Image</TableHead>
                            <TableHead>
                                <button
                                    className="flex items-center gap-1 font-medium hover:text-foreground"
                                    onClick={() => onSort?.('name')}
                                >
                                    Product
                                    <ArrowUpDown className="h-4 w-4" />
                                </button>
                            </TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">
                                <button
                                    className="flex items-center gap-1 font-medium hover:text-foreground ml-auto"
                                    onClick={() => onSort?.('price')}
                                >
                                    Price
                                    <ArrowUpDown className="h-4 w-4" />
                                </button>
                            </TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => (
                            <TableRow
                                key={product.id}
                                className="group hover:bg-muted/50"
                            >
                                <TableCell>
                                    <Checkbox
                                        checked={selectedIds.includes(
                                            product.id
                                        )}
                                        onCheckedChange={(checked) =>
                                            onSelectOne(product.id, !!checked)
                                        }
                                        aria-label={`Select ${product.name}`}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Avatar className="h-10 w-10 rounded-md">
                                        <AvatarImage
                                            src={product.image_url || undefined}
                                            alt={product.name}
                                        />
                                        <AvatarFallback className="rounded-md">
                                            <Package2 className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="font-medium">
                                            {product.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            SKU: {product.sku}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {product.category.name}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    ${product.price.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={cn(
                                                'h-2 w-2 rounded-full',
                                                product.stock === 0
                                                    ? 'bg-destructive'
                                                    : product.stock < 10
                                                      ? 'bg-yellow-500'
                                                      : 'bg-green-500'
                                            )}
                                        />
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-medium">
                                                {product.stock}
                                            </div>
                                            <div
                                                className={cn(
                                                    'text-xs',
                                                    getStockColor(product.stock)
                                                )}
                                            >
                                                {getStockStatus(product.stock)}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={getStatusVariant(
                                            product.status
                                        )}
                                        className="capitalize"
                                    >
                                        {product.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(
                                        new Date(product.created_at),
                                        'MMM d, yyyy'
                                    )}
                                </TableCell>
                                <TableCell>
                                    <ProductActions
                                        product={product}
                                        onView={onView}
                                        onEdit={onEdit}
                                        onDuplicate={onDuplicate}
                                        onDelete={onDelete}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
