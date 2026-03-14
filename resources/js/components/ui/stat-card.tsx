import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const statCardVariants = cva(
    'relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all duration-200',
    {
        variants: {
            variant: {
                default: 'border-border/50',
                elevated:
                    'border-border/30 shadow-elevation-2 hover:shadow-elevation-3 hover:-translate-y-0.5',
                glass: 'border-white/10 bg-white/5 backdrop-blur-xl dark:bg-black/5',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

interface StatCardProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof statCardVariants> {
    title: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        label?: string;
        isPositive?: boolean;
    };
    loading?: boolean;
}

function StatCard({
    className,
    variant,
    title,
    value,
    description,
    icon,
    trend,
    loading,
    ...props
}: StatCardProps) {
    const TrendIcon =
        trend?.value === 0
            ? MinusIcon
            : trend?.isPositive ?? (trend?.value ?? 0) > 0
              ? ArrowUpIcon
              : ArrowDownIcon;

    const trendColor =
        trend?.value === 0
            ? 'text-muted-foreground'
            : trend?.isPositive ?? (trend?.value ?? 0) > 0
              ? 'text-success'
              : 'text-destructive';

    if (loading) {
        return (
            <div className={cn(statCardVariants({ variant }), className)} {...props}>
                <div className="space-y-3">
                    <div className="h-4 w-24 animate-shimmer rounded" />
                    <div className="h-8 w-32 animate-shimmer rounded" />
                    <div className="h-3 w-20 animate-shimmer rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn(statCardVariants({ variant }), className)} {...props}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold tracking-tight">{value}</p>
                </div>
                {icon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {icon}
                    </div>
                )}
            </div>

            {(trend || description) && (
                <div className="mt-4 flex items-center gap-2">
                    {trend && (
                        <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
                            <TrendIcon className="h-4 w-4" />
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                    {(trend?.label || description) && (
                        <span className="text-sm text-muted-foreground">
                            {trend?.label || description}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export { StatCard, statCardVariants };
