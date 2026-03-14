import * as React from 'react';
import { X, Megaphone, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const bannerVariants = cva(
    'relative flex w-full items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-300',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground',
                info: 'bg-info text-info-foreground',
                success: 'bg-success text-success-foreground',
                warning: 'bg-warning text-warning-foreground',
                destructive: 'bg-destructive text-white',
                gradient:
                    'bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground',
                subtle: 'bg-muted text-muted-foreground',
            },
            position: {
                top: 'fixed left-0 right-0 top-0 z-50',
                relative: 'relative',
            },
        },
        defaultVariants: {
            variant: 'default',
            position: 'relative',
        },
    }
);

const iconMap = {
    default: Megaphone,
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    destructive: XCircle,
    gradient: Megaphone,
    subtle: Info,
};

interface AnnouncementBannerProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof bannerVariants> {
    message: React.ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
    dismissible?: boolean;
    onDismiss?: () => void;
    icon?: React.ReactNode;
    showIcon?: boolean;
}

function AnnouncementBanner({
    className,
    variant = 'default',
    position = 'relative',
    message,
    action,
    dismissible = true,
    onDismiss,
    icon,
    showIcon = true,
    ...props
}: AnnouncementBannerProps) {
    const [isVisible, setIsVisible] = React.useState(true);

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss?.();
    };

    if (!isVisible) return null;

    const Icon = iconMap[variant ?? 'default'];

    return (
        <div
            className={cn(bannerVariants({ variant, position }), className)}
            role="banner"
            aria-live="polite"
            {...props}
        >
            <div className="flex items-center gap-3">
                {showIcon && (icon || <Icon className="h-4 w-4 shrink-0" />)}
                <span>{message}</span>
            </div>

            <div className="flex items-center gap-2">
                {action && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={action.onClick}
                        className="h-7 bg-white/10 px-3 text-current hover:bg-white/20"
                    >
                        {action.label}
                    </Button>
                )}

                {dismissible && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleDismiss}
                        className="h-6 w-6 shrink-0 rounded-full text-current hover:bg-white/10"
                        aria-label="Dismiss announcement"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

export { AnnouncementBanner, bannerVariants };
