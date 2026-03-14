import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { Category, ProductFilters } from '@/types/product';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
    ChevronDown,
    CircleDashed,
    DollarSign,
    FileEdit,
    FilterX,
    Hash,
    Layers,
    Search,
    SlidersHorizontal,
    Sparkles,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProductsFiltersProps {
    filters: ProductFilters;
    onFiltersChange: (filters: ProductFilters) => void;
    categories: Category[];
}

// Accordion Section Component
function FilterSection({
    title,
    icon: Icon,
    children,
    defaultOpen = true,
    badge,
    accentColor = 'primary',
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
    accentColor?: 'primary' | 'emerald' | 'amber' | 'violet';
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const accentClasses = {
        primary: 'text-primary bg-primary/10 group-hover:bg-primary/15',
        emerald: 'text-emerald-500 bg-emerald-500/10 group-hover:bg-emerald-500/15',
        amber: 'text-amber-500 bg-amber-500/10 group-hover:bg-amber-500/15',
        violet: 'text-violet-500 bg-violet-500/10 group-hover:bg-violet-500/15',
    };

    return (
        <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
            <Collapsible.Trigger asChild>
                <button
                    className={cn(
                        'group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200',
                        'hover:bg-muted/50',
                        isOpen && 'bg-muted/30'
                    )}
                >
                    <div
                        className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                            accentClasses[accentColor]
                        )}
                    >
                        <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-sm font-semibold">{title}</span>
                    {badge}
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform duration-300 ease-out',
                            isOpen && 'rotate-180'
                        )}
                    />
                </button>
            </Collapsible.Trigger>
            <Collapsible.Content
                className={cn(
                    'overflow-hidden',
                    'data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up'
                )}
            >
                <div className="px-3 pb-4 pt-2">{children}</div>
            </Collapsible.Content>
        </Collapsible.Root>
    );
}

export function ProductsFilters({ filters, onFiltersChange, categories }: ProductsFiltersProps) {
    const [localFilters, setLocalFilters] = useState<ProductFilters>(filters);
    const [priceRange, setPriceRange] = useState<[number, number]>([filters.price_min || 0, filters.price_max || 1000]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            onFiltersChange(localFilters);
        }, 300);

        return () => clearTimeout(timer);
    }, [localFilters.search]);

    const handleSearchChange = (value: string) => {
        setLocalFilters({ ...localFilters, search: value || undefined });
    };

    const handleStatusChange = (status: string) => {
        const currentStatuses = localFilters.status || [];
        const isSelected = currentStatuses.includes(status);
        const newStatuses = isSelected ? currentStatuses.filter((s) => s !== status) : [...currentStatuses, status];

        const updated = {
            ...localFilters,
            status: newStatuses.length > 0 ? newStatuses : undefined,
        };
        setLocalFilters(updated);
        onFiltersChange(updated);
    };

    const handleCategoriesChange = (categoryIds: string[]) => {
        const updated = {
            ...localFilters,
            categories: categoryIds.length > 0 ? categoryIds : undefined,
        };
        setLocalFilters(updated);
        onFiltersChange(updated);
    };

    const handlePriceRangeChange = (values: number[]) => {
        setPriceRange([values[0], values[1]]);
    };

    const handlePriceRangeCommit = () => {
        const updated = {
            ...localFilters,
            price_min: priceRange[0] > 0 ? priceRange[0] : undefined,
            price_max: priceRange[1] < 1000 ? priceRange[1] : undefined,
        };
        setLocalFilters(updated);
        onFiltersChange(updated);
    };

    const handleClearAll = () => {
        const cleared: ProductFilters = {};
        setLocalFilters(cleared);
        setPriceRange([0, 1000]);
        onFiltersChange(cleared);
    };

    const activeFilterCount = Object.keys(localFilters).filter(
        (key) => localFilters[key as keyof ProductFilters] !== undefined
    ).length;

    const categoryOptions = categories.map((cat) => ({
        label: cat.name,
        value: cat.id,
    }));

    const statusOptions = [
        {
            value: 'active',
            label: 'Active',
            description: 'Published & visible',
            icon: Sparkles,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 dark:hover:border-emerald-500/30',
            selectedBg: 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/20',
            dotColor: 'bg-emerald-500 dark:bg-emerald-400',
        },
        {
            value: 'inactive',
            label: 'Inactive',
            description: 'Hidden from store',
            icon: CircleDashed,
            color: 'text-muted-foreground',
            bgColor: 'bg-muted/30 border-border hover:bg-muted/50 hover:border-muted-foreground/20',
            selectedBg: 'bg-muted/50 border-muted-foreground/30 ring-1 ring-muted-foreground/10',
            dotColor: 'bg-muted-foreground',
        },
        {
            value: 'draft',
            label: 'Draft',
            description: 'Work in progress',
            icon: FileEdit,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-500/10 border-amber-500/30 dark:border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 dark:hover:border-amber-500/30',
            selectedBg: 'bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-500/20',
            dotColor: 'bg-amber-500 dark:bg-amber-400',
        },
    ];

    const statusCount = localFilters.status?.length || 0;
    const categoryCount = localFilters.categories?.length || 0;
    const hasPriceFilter = localFilters.price_min !== undefined || localFilters.price_max !== undefined;

    return (
        <div className="sticky top-6 space-y-2">
            {/* Main Filter Card */}
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card to-card/80 shadow-elevation-2 backdrop-blur-xl">
                {/* Header */}
                <div className="relative border-b border-border/50 bg-gradient-to-r from-muted/30 via-transparent to-muted/30 p-4">
                    {/* Decorative gradient line */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner">
                                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                                </div>
                                {activeFilterCount > 0 && (
                                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-lg">
                                        {activeFilterCount}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-display text-base font-semibold">Filters</h3>
                                <p className="text-xs text-muted-foreground">
                                    {activeFilterCount > 0 ? `${activeFilterCount} active` : 'Refine results'}
                                </p>
                            </div>
                        </div>
                        {activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearAll}
                                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                            >
                                <X className="h-3.5 w-3.5" />
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filter Sections */}
                <div className="divide-y divide-border/30">
                    {/* Search Section */}
                    <FilterSection title="Search" icon={Search} accentColor="primary">
                        <div className="relative">
                            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                                placeholder="Product name, SKU..."
                                value={localFilters.search || ''}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className={cn(
                                    'h-11 rounded-xl border-border/50 bg-background/50 pl-10 pr-10',
                                    'transition-all duration-200',
                                    'placeholder:text-muted-foreground/50',
                                    'focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10'
                                )}
                            />
                            {localFilters.search && (
                                <button
                                    onClick={() => handleSearchChange('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </FilterSection>

                    {/* Status Section */}
                    <FilterSection
                        title="Status"
                        icon={Sparkles}
                        accentColor="emerald"
                        badge={
                            statusCount > 0 ? (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold">
                                    {statusCount}
                                </Badge>
                            ) : null
                        }
                    >
                        <div className="space-y-2">
                            {statusOptions.map((option) => {
                                const isSelected = localFilters.status?.includes(option.value);
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleStatusChange(option.value)}
                                        className={cn(
                                            'group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200',
                                            isSelected ? option.selectedBg : option.bgColor
                                        )}
                                    >
                                        {/* Status dot indicator */}
                                        <div className="relative">
                                            <div
                                                className={cn(
                                                    'h-2.5 w-2.5 rounded-full transition-all duration-200',
                                                    option.dotColor,
                                                    isSelected && 'scale-125 shadow-lg'
                                                )}
                                            />
                                            {isSelected && (
                                                <div
                                                    className={cn(
                                                        'absolute inset-0 animate-ping rounded-full opacity-75',
                                                        option.dotColor
                                                    )}
                                                    style={{ animationDuration: '2s' }}
                                                />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{option.label}</p>
                                            <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                                        </div>

                                        {/* Custom checkbox */}
                                        <div
                                            className={cn(
                                                'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200',
                                                isSelected
                                                    ? 'border-primary bg-primary text-primary-foreground scale-110'
                                                    : 'border-muted-foreground/30 bg-transparent group-hover:border-muted-foreground/50'
                                            )}
                                        >
                                            <svg
                                                className={cn(
                                                    'h-3 w-3 transition-all duration-200',
                                                    isSelected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                                                )}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={3}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </FilterSection>

                    {/* Categories Section */}
                    <FilterSection
                        title="Categories"
                        icon={Layers}
                        accentColor="violet"
                        badge={
                            categoryCount > 0 ? (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold">
                                    {categoryCount}
                                </Badge>
                            ) : null
                        }
                    >
                        <MultiSelect
                            options={categoryOptions}
                            selected={localFilters.categories || []}
                            onChange={handleCategoriesChange}
                            placeholder="Select categories..."
                            className="rounded-xl border-border/50 bg-background/50"
                        />
                        {categoryCount > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {localFilters.categories?.map((catId) => {
                                    const cat = categories.find((c) => c.id === catId);
                                    return cat ? (
                                        <Badge
                                            key={catId}
                                            variant="secondary"
                                            className={cn(
                                                'cursor-pointer gap-1.5 pr-1 transition-all duration-200',
                                                'bg-violet-500/10 text-violet-400 border border-violet-500/20',
                                                'hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30'
                                            )}
                                            onClick={() =>
                                                handleCategoriesChange(localFilters.categories!.filter((id) => id !== catId))
                                            }
                                        >
                                            <Hash className="h-3 w-3" />
                                            {cat.name}
                                            <X className="h-3 w-3" />
                                        </Badge>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </FilterSection>

                    {/* Price Range Section */}
                    <FilterSection
                        title="Price Range"
                        icon={DollarSign}
                        accentColor="amber"
                        badge={
                            hasPriceFilter ? (
                                <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px]">
                                    ${priceRange[0]}–${priceRange[1]}
                                </Badge>
                            ) : null
                        }
                    >
                        <div className="space-y-4">
                            {/* Visual price display */}
                            <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Min</p>
                                    <p className="font-mono text-lg font-semibold text-foreground">${priceRange[0]}</p>
                                </div>
                                <div className="flex-1 px-4">
                                    <div className="h-px bg-gradient-to-r from-muted-foreground/20 via-muted-foreground/50 to-muted-foreground/20" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Max</p>
                                    <p className="font-mono text-lg font-semibold text-foreground">${priceRange[1]}</p>
                                </div>
                            </div>

                            {/* Slider */}
                            <div className="px-1">
                                <Slider
                                    min={0}
                                    max={1000}
                                    step={10}
                                    value={priceRange}
                                    onValueChange={handlePriceRangeChange}
                                    onValueCommit={handlePriceRangeCommit}
                                    className="w-full"
                                />
                            </div>

                            {/* Range labels */}
                            <div className="flex justify-between px-1 text-xs text-muted-foreground">
                                <span>$0</span>
                                <span>$500</span>
                                <span>$1,000+</span>
                            </div>
                        </div>
                    </FilterSection>
                </div>

                {/* Footer with Clear Button */}
                {activeFilterCount > 0 && (
                    <div className="border-t border-border/50 bg-gradient-to-r from-muted/20 via-transparent to-muted/20 p-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                'w-full gap-2 rounded-xl border-border/50 transition-all duration-200',
                                'hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive'
                            )}
                            onClick={handleClearAll}
                        >
                            <FilterX className="h-4 w-4" />
                            Clear All Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Keyboard hint */}
            <p className="px-2 text-center text-[10px] text-muted-foreground/50">
                Press <kbd className="rounded border border-border/50 bg-muted/30 px-1 py-0.5 font-mono text-[9px]">F</kbd> to
                toggle filters
            </p>
        </div>
    );
}
