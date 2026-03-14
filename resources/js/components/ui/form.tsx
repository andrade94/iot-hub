import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef } from 'react';

const formVariants = cva('space-y-6', {
    variants: {
        variant: {
            default: '',
            card: 'rounded-lg border bg-card p-6 shadow-sm',
            inline: 'space-y-4',
        },
        size: {
            sm: 'space-y-4',
            md: 'space-y-6',
            lg: 'space-y-8',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'md',
    },
});

const formGroupVariants = cva('space-y-2', {
    variants: {
        variant: {
            default: '',
            horizontal: 'flex items-center space-x-4 space-y-0',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

export interface FormProps
    extends React.FormHTMLAttributes<HTMLFormElement>,
        VariantProps<typeof formVariants> {}

const Form = forwardRef<HTMLFormElement, FormProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <form
                className={cn(formVariants({ variant, size }), className)}
                ref={ref}
                {...props}
            />
        );
    }
);
Form.displayName = 'Form';

export interface FormGroupProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof formGroupVariants> {}

const FormGroup = forwardRef<HTMLDivElement, FormGroupProps>(
    ({ className, variant, ...props }, ref) => {
        return (
            <div
                className={cn(formGroupVariants({ variant }), className)}
                ref={ref}
                {...props}
            />
        );
    }
);
FormGroup.displayName = 'FormGroup';

export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
    align?: 'left' | 'center' | 'right';
}

const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(
    ({ className, align = 'right', ...props }, ref) => {
        const alignClasses = {
            left: 'justify-start',
            center: 'justify-center',
            right: 'justify-end',
        };

        return (
            <div
                className={cn(
                    'flex items-center space-x-2 pt-4',
                    alignClasses[align],
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
FormActions.displayName = 'FormActions';

export { Form, FormGroup, FormActions, formVariants, formGroupVariants };