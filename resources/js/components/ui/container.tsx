import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef } from 'react';

const containerVariants = cva('mx-auto w-full', {
    variants: {
        size: {
            sm: 'max-w-3xl',
            md: 'max-w-5xl',
            lg: 'max-w-7xl',
            xl: 'max-w-screen-xl',
            '2xl': 'max-w-screen-2xl',
            full: 'max-w-full',
        },
        padding: {
            none: '',
            sm: 'px-4',
            md: 'px-6',
            lg: 'px-8',
        },
    },
    defaultVariants: {
        size: 'lg',
        padding: 'md',
    },
});

export interface ContainerProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof containerVariants> {}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
    ({ className, size, padding, ...props }, ref) => {
        return (
            <div
                className={cn(containerVariants({ size, padding }), className)}
                ref={ref}
                {...props}
            />
        );
    }
);
Container.displayName = 'Container';

export { Container, containerVariants };