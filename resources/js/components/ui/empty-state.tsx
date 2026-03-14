import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef } from 'react';

const emptyStateVariants = cva(
    'flex flex-col items-center justify-center rounded-lg border border-dashed text-center',
    {
        variants: {
            size: {
                sm: 'min-h-[200px] p-6',
                md: 'min-h-[300px] p-8',
                lg: 'min-h-[400px] p-12',
            },
            variant: {
                default: 'border-border bg-background',
                muted: 'border-muted bg-muted/20',
            },
        },
        defaultVariants: {
            size: 'md',
            variant: 'default',
        },
    }
);

export interface EmptyStateProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof emptyStateVariants> {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
    ({ className, size, variant, icon, title, description, action, children, ...props }, ref) => {
        return (
            <div
                className={cn(emptyStateVariants({ size, variant }), className)}
                ref={ref}
                {...props}
            >
                {icon && (
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        {icon}
                    </div>
                )}
                {title && (
                    <h3 className="mb-2 text-lg font-semibold">
                        {title}
                    </h3>
                )}
                {description && (
                    <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
                {action && <div>{action}</div>}
                {children}
            </div>
        );
    }
);
EmptyState.displayName = 'EmptyState';

export { EmptyState, emptyStateVariants };