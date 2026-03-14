import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { CopyButton } from '@/components/ui/copy-button';

const codeBlockVariants = cva(
    'relative overflow-hidden rounded-lg border font-mono text-sm',
    {
        variants: {
            variant: {
                default: 'border-border bg-muted/50',
                dark: 'border-zinc-800 bg-zinc-950 text-zinc-100',
                terminal: 'border-zinc-700 bg-zinc-900 text-green-400',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

interface CodeBlockProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof codeBlockVariants> {
    code: string;
    language?: string;
    filename?: string;
    showLineNumbers?: boolean;
    showCopyButton?: boolean;
    highlightLines?: number[];
    maxHeight?: string | number;
}

function CodeBlock({
    className,
    variant,
    code,
    language,
    filename,
    showLineNumbers = false,
    showCopyButton = true,
    highlightLines = [],
    maxHeight,
    ...props
}: CodeBlockProps) {
    const lines = code.split('\n');

    return (
        <div className={cn(codeBlockVariants({ variant }), className)} {...props}>
            {/* Header */}
            {(filename || language) && (
                <div className="flex items-center justify-between border-b border-inherit bg-muted/30 px-4 py-2">
                    <div className="flex items-center gap-3">
                        {/* macOS-style dots */}
                        <div className="flex gap-1.5">
                            <div className="h-3 w-3 rounded-full bg-red-500/80" />
                            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                            <div className="h-3 w-3 rounded-full bg-green-500/80" />
                        </div>
                        {filename && (
                            <span className="text-xs text-muted-foreground">{filename}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {language && (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase text-muted-foreground">
                                {language}
                            </span>
                        )}
                        {showCopyButton && <CopyButton value={code} />}
                    </div>
                </div>
            )}

            {/* Code content */}
            <div
                className="overflow-auto"
                style={{ maxHeight: maxHeight }}
            >
                <pre className="p-4">
                    <code className="block">
                        {lines.map((line, index) => (
                            <div
                                key={index}
                                className={cn(
                                    'flex',
                                    highlightLines.includes(index + 1) &&
                                        'bg-primary/10 -mx-4 px-4'
                                )}
                            >
                                {showLineNumbers && (
                                    <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground/50">
                                        {index + 1}
                                    </span>
                                )}
                                <span className="flex-1">{line || ' '}</span>
                            </div>
                        ))}
                    </code>
                </pre>
            </div>

            {/* Copy button for simple code blocks without header */}
            {!filename && !language && showCopyButton && (
                <div className="absolute right-2 top-2">
                    <CopyButton value={code} />
                </div>
            )}
        </div>
    );
}

// Inline code component
function InlineCode({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLElement>) {
    return (
        <code
            className={cn(
                'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
                className
            )}
            {...props}
        >
            {children}
        </code>
    );
}

export { CodeBlock, InlineCode, codeBlockVariants };
