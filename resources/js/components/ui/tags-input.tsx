import * as React from 'react';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const tagsInputVariants = cva(
    'flex min-h-10 w-full flex-wrap gap-2 rounded-lg border bg-background/50 px-3 py-2 text-sm transition-all duration-150',
    {
        variants: {
            variant: {
                default:
                    'border-input shadow-xs shadow-black/[0.03] ring-1 ring-transparent hover:border-border/80 hover:shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 focus-within:shadow-sm focus-within:bg-background',
                ghost: 'border-transparent hover:bg-accent/50',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

interface TagsInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>,
        VariantProps<typeof tagsInputVariants> {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    maxTags?: number;
    allowDuplicates?: boolean;
    delimiter?: string | RegExp;
    validateTag?: (tag: string) => boolean;
    tagClassName?: string;
}

function TagsInput({
    className,
    variant,
    value = [],
    onChange,
    placeholder = 'Add tag...',
    maxTags,
    allowDuplicates = false,
    delimiter = /[,;\s]+/,
    validateTag,
    tagClassName,
    disabled,
    ...props
}: TagsInputProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = React.useState('');

    const addTag = React.useCallback(
        (tag: string) => {
            const trimmedTag = tag.trim();
            if (!trimmedTag) return;
            if (maxTags && value.length >= maxTags) return;
            if (!allowDuplicates && value.includes(trimmedTag)) return;
            if (validateTag && !validateTag(trimmedTag)) return;

            onChange([...value, trimmedTag]);
        },
        [value, onChange, maxTags, allowDuplicates, validateTag]
    );

    const removeTag = React.useCallback(
        (indexToRemove: number) => {
            onChange(value.filter((_, index) => index !== indexToRemove));
        },
        [value, onChange]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // Check for delimiter
        if (delimiter && typeof delimiter === 'string' && newValue.includes(delimiter)) {
            const parts = newValue.split(delimiter);
            parts.forEach((part, i) => {
                if (i < parts.length - 1) {
                    addTag(part);
                } else {
                    setInputValue(part);
                }
            });
        } else if (delimiter instanceof RegExp && delimiter.test(newValue)) {
            const parts = newValue.split(delimiter);
            parts.forEach((part, i) => {
                if (i < parts.length - 1) {
                    addTag(part);
                } else {
                    setInputValue(part);
                }
            });
        } else {
            setInputValue(newValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(inputValue);
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            removeTag(value.length - 1);
        }
    };

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div
            className={cn(
                tagsInputVariants({ variant }),
                disabled && 'cursor-not-allowed opacity-50',
                className
            )}
            onClick={handleContainerClick}
        >
            {value.map((tag, index) => (
                <Badge
                    key={`${tag}-${index}`}
                    variant="secondary"
                    className={cn(
                        'gap-1 pr-1 transition-all hover:bg-secondary/80',
                        tagClassName
                    )}
                >
                    {tag}
                    {!disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(index);
                            }}
                            className="ml-1 rounded-full p-0.5 hover:bg-foreground/10"
                            aria-label={`Remove ${tag}`}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </Badge>
            ))}
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={value.length === 0 ? placeholder : ''}
                disabled={disabled || (maxTags !== undefined && value.length >= maxTags)}
                className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
                {...props}
            />
        </div>
    );
}

export { TagsInput, tagsInputVariants };
