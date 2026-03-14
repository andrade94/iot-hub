import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const avatarGroupVariants = cva('flex', {
    variants: {
        direction: {
            ltr: 'flex-row -space-x-3',
            rtl: 'flex-row-reverse space-x-reverse -space-x-3',
        },
    },
    defaultVariants: {
        direction: 'ltr',
    },
});

const avatarSizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
};

interface AvatarItem {
    src?: string;
    alt?: string;
    fallback: string;
    name?: string;
}

interface AvatarGroupProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof avatarGroupVariants> {
    avatars: AvatarItem[];
    max?: number;
    size?: keyof typeof avatarSizes;
    showTooltip?: boolean;
    renderOverflow?: (count: number) => React.ReactNode;
}

function AvatarGroup({
    className,
    direction = 'ltr',
    avatars,
    max = 5,
    size = 'md',
    showTooltip = true,
    renderOverflow,
    ...props
}: AvatarGroupProps) {
    const visibleAvatars = avatars.slice(0, max);
    const overflowCount = Math.max(0, avatars.length - max);
    const overflowAvatars = avatars.slice(max);

    const avatarClassName = cn(
        avatarSizes[size],
        'ring-2 ring-background transition-transform hover:z-10 hover:scale-110'
    );

    const renderAvatar = (avatar: AvatarItem, index: number) => {
        const avatarElement = (
            <Avatar key={index} className={avatarClassName}>
                {avatar.src && <AvatarImage src={avatar.src} alt={avatar.alt || avatar.name || ''} />}
                <AvatarFallback className="text-xs font-medium">
                    {avatar.fallback}
                </AvatarFallback>
            </Avatar>
        );

        if (showTooltip && avatar.name) {
            return (
                <Tooltip key={index}>
                    <TooltipTrigger asChild>{avatarElement}</TooltipTrigger>
                    <TooltipContent>
                        <p>{avatar.name}</p>
                    </TooltipContent>
                </Tooltip>
            );
        }

        return avatarElement;
    };

    return (
        <TooltipProvider>
            <div className={cn(avatarGroupVariants({ direction }), className)} {...props}>
                {visibleAvatars.map(renderAvatar)}

                {overflowCount > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {renderOverflow ? (
                                renderOverflow(overflowCount)
                            ) : (
                                <Avatar className={cn(avatarClassName, 'bg-muted')}>
                                    <AvatarFallback className="text-xs font-semibold text-muted-foreground">
                                        +{overflowCount}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="space-y-1">
                                {overflowAvatars.map((avatar, index) => (
                                    <p key={index}>{avatar.name || avatar.fallback}</p>
                                ))}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </TooltipProvider>
    );
}

export { AvatarGroup, avatarGroupVariants };
