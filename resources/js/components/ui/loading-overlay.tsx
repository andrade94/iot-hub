import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const loadingOverlayVariants = cva(
    'absolute inset-0 z-50 flex items-center justify-center transition-all duration-300',
    {
        variants: {
            variant: {
                default: 'bg-background/80 backdrop-blur-sm',
                solid: 'bg-background',
                transparent: 'bg-transparent',
                dark: 'bg-black/50 backdrop-blur-sm',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

const spinnerSizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
};

interface LoadingOverlayProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof loadingOverlayVariants> {
    loading?: boolean;
    spinnerSize?: keyof typeof spinnerSizes;
    text?: string;
    fullScreen?: boolean;
    children?: React.ReactNode;
}

function LoadingOverlay({
    className,
    variant,
    loading = true,
    spinnerSize = 'md',
    text,
    fullScreen = false,
    children,
    ...props
}: LoadingOverlayProps) {
    if (!loading) return null;

    const content = (
        <div
            className={cn(
                loadingOverlayVariants({ variant }),
                fullScreen && 'fixed',
                className
            )}
            role="status"
            aria-live="polite"
            aria-busy="true"
            {...props}
        >
            <div className="flex flex-col items-center gap-3">
                {children || (
                    <>
                        <Loader2 className={cn('animate-spin text-primary', spinnerSizes[spinnerSize])} />
                        {text && (
                            <p className="text-sm font-medium text-muted-foreground">{text}</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );

    if (fullScreen) {
        return content;
    }

    return content;
}

// Wrapper component that makes its children have relative positioning
function LoadingContainer({
    children,
    loading,
    className,
    ...overlayProps
}: LoadingOverlayProps & { children: React.ReactNode }) {
    return (
        <div className={cn('relative', className)}>
            {children}
            <LoadingOverlay loading={loading} {...overlayProps} />
        </div>
    );
}

export { LoadingOverlay, LoadingContainer, loadingOverlayVariants };
