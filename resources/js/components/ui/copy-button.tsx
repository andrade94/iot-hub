import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const copyButtonVariants = cva('transition-all duration-200', {
    variants: {
        variant: {
            default: '',
            ghost: '',
            outline: '',
        },
        size: {
            default: '',
            sm: '',
            icon: '',
            'icon-sm': '',
        },
    },
    defaultVariants: {
        variant: 'ghost',
        size: 'icon-sm',
    },
});

interface CopyButtonProps
    extends Omit<React.ComponentProps<typeof Button>, 'onClick'>,
        VariantProps<typeof copyButtonVariants> {
    value: string;
    onCopy?: () => void;
    copiedLabel?: string;
    copyLabel?: string;
    showTooltip?: boolean;
}

function CopyButton({
    className,
    variant = 'ghost',
    size = 'icon-sm',
    value,
    onCopy,
    copiedLabel = 'Copied!',
    copyLabel = 'Copy to clipboard',
    showTooltip = true,
    ...props
}: CopyButtonProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = React.useCallback(async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            onCopy?.();
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [value, onCopy]);

    const button = (
        <Button
            variant={variant}
            size={size}
            className={cn(
                copyButtonVariants({ variant, size }),
                copied && 'text-success',
                className
            )}
            onClick={handleCopy}
            aria-label={copied ? copiedLabel : copyLabel}
            {...props}
        >
            {copied ? (
                <Check className="h-4 w-4" />
            ) : (
                <Copy className="h-4 w-4" />
            )}
        </Button>
    );

    if (!showTooltip) {
        return button;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent>
                    <p>{copied ? copiedLabel : copyLabel}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export { CopyButton, copyButtonVariants };
