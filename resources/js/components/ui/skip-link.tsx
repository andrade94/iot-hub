import * as React from 'react';

import { cn } from '@/lib/utils';

interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    targetId?: string;
}

/**
 * Skip Link Component
 *
 * Provides keyboard users a way to skip navigation and go directly to main content.
 * Only visible when focused via keyboard navigation.
 *
 * Usage:
 * 1. Add <SkipLink /> at the top of your layout
 * 2. Add id="main-content" to your main content area
 */
function SkipLink({
    className,
    targetId = 'main-content',
    children = 'Skip to main content',
    ...props
}: SkipLinkProps) {
    return (
        <a
            href={`#${targetId}`}
            className={cn(
                'sr-only focus:not-sr-only',
                'fixed left-4 top-4 z-[100]',
                'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                'ring-offset-background transition-all',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'shadow-lg',
                className
            )}
            {...props}
        >
            {children}
        </a>
    );
}

export { SkipLink };
