/**
 * Progress Component
 *
 * Enhanced shadcn/ui Progress component with sizes, variants, and circular option
 */

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const progressVariants = cva(
    'relative w-full overflow-hidden rounded-full bg-primary/20',
    {
        variants: {
            size: {
                sm: 'h-1',
                md: 'h-2',
                lg: 'h-3',
                xl: 'h-4',
            },
            variant: {
                default: 'bg-primary/20',
                success: 'bg-success/20',
                warning: 'bg-warning/20',
                info: 'bg-info/20',
                destructive: 'bg-destructive/20',
            },
        },
        defaultVariants: {
            size: 'md',
            variant: 'default',
        },
    }
);

const indicatorVariants = cva('h-full w-full flex-1 transition-all duration-300', {
    variants: {
        variant: {
            default: 'bg-primary',
            success: 'bg-success',
            warning: 'bg-warning',
            info: 'bg-info',
            destructive: 'bg-destructive',
        },
        animated: {
            true: 'animate-pulse',
            false: '',
        },
    },
    defaultVariants: {
        variant: 'default',
        animated: false,
    },
});

interface ProgressProps
    extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
        VariantProps<typeof progressVariants> {
    showLabel?: boolean;
    label?: string;
    animated?: boolean;
    indeterminate?: boolean;
}

const Progress = React.forwardRef<
    React.ElementRef<typeof ProgressPrimitive.Root>,
    ProgressProps
>(({ className, value, size, variant, showLabel, label, animated, indeterminate, ...props }, ref) => (
    <div className="w-full">
        {(showLabel || label) && (
            <div className="mb-2 flex items-center justify-between text-sm">
                {label && <span className="font-medium text-foreground">{label}</span>}
                {showLabel && !indeterminate && (
                    <span className="text-muted-foreground">{Math.round(value || 0)}%</span>
                )}
            </div>
        )}
        <ProgressPrimitive.Root
            ref={ref}
            className={cn(progressVariants({ size, variant }), className)}
            {...props}
        >
            <ProgressPrimitive.Indicator
                className={cn(
                    indicatorVariants({ variant, animated }),
                    indeterminate && 'animate-[indeterminate_1.5s_ease-in-out_infinite] w-1/3'
                )}
                style={indeterminate ? undefined : { transform: `translateX(-${100 - (value || 0)}%)` }}
            />
        </ProgressPrimitive.Root>
    </div>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

// Circular Progress Component
interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'default' | 'success' | 'warning' | 'info' | 'destructive';
    strokeWidth?: number;
    showLabel?: boolean;
    indeterminate?: boolean;
}

const circularSizes = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
};

const circularStrokeWidths = {
    sm: 3,
    md: 4,
    lg: 5,
    xl: 6,
};

const circularColors = {
    default: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info',
    destructive: 'text-destructive',
};

function CircularProgress({
    value = 0,
    size = 'md',
    variant = 'default',
    strokeWidth,
    showLabel = false,
    indeterminate = false,
    className,
    ...props
}: CircularProgressProps) {
    const diameter = circularSizes[size];
    const stroke = strokeWidth ?? circularStrokeWidths[size];
    const radius = (diameter - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div
            className={cn('relative inline-flex items-center justify-center', className)}
            style={{ width: diameter, height: diameter }}
            role="progressbar"
            aria-valuenow={indeterminate ? undefined : value}
            aria-valuemin={0}
            aria-valuemax={100}
            {...props}
        >
            <svg
                className={cn(
                    'transform -rotate-90',
                    indeterminate && 'animate-spin'
                )}
                width={diameter}
                height={diameter}
            >
                {/* Background circle */}
                <circle
                    className="text-primary/20"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    fill="none"
                    r={radius}
                    cx={diameter / 2}
                    cy={diameter / 2}
                />
                {/* Progress circle */}
                <circle
                    className={cn(circularColors[variant], 'transition-all duration-300')}
                    stroke="currentColor"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                    r={radius}
                    cx={diameter / 2}
                    cy={diameter / 2}
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: indeterminate ? circumference * 0.75 : offset,
                    }}
                />
            </svg>
            {showLabel && !indeterminate && (
                <span
                    className={cn(
                        'absolute font-semibold',
                        size === 'sm' && 'text-[10px]',
                        size === 'md' && 'text-xs',
                        size === 'lg' && 'text-sm',
                        size === 'xl' && 'text-lg'
                    )}
                >
                    {Math.round(value)}%
                </span>
            )}
        </div>
    );
}

export { Progress, CircularProgress, progressVariants };
