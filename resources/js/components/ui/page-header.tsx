import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef } from 'react';

const pageHeaderVariants = cva(
    'flex flex-col space-y-1.5 border-b bg-background px-6 py-6',
    {
        variants: {
            size: {
                sm: 'py-4',
                md: 'py-6',
                lg: 'py-8',
            },
            variant: {
                default: 'border-border',
                ghost: 'border-transparent',
            },
        },
        defaultVariants: {
            size: 'md',
            variant: 'default',
        },
    }
);

export interface PageHeaderProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof pageHeaderVariants> {
    title?: string;
    description?: string;
    actions?: React.ReactNode;
}

const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
    ({ className, size, variant, title, description, actions, children, ...props }, ref) => {
        return (
            <div
                className={cn(pageHeaderVariants({ size, variant }), className)}
                ref={ref}
                {...props}
            >
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        {title && (
                            <h1 className="text-3xl font-bold tracking-tight">
                                {title}
                            </h1>
                        )}
                        {description && (
                            <p className="text-base text-muted-foreground leading-relaxed">
                                {description}
                            </p>
                        )}
                    </div>
                    {actions && <div className="flex items-center space-x-2">{actions}</div>}
                </div>
                {children}
            </div>
        );
    }
);
PageHeader.displayName = 'PageHeader';

export { PageHeader, pageHeaderVariants };