/**
 * Notification Bell Component
 *
 * Notification bell icon with badge showing unread count
 */

import * as React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNotificationCount } from '@/utils/notification';
import { Button } from '@/components/ui/button';

export interface NotificationBellProps {
    count: number;
    onClick?: () => void;
    className?: string;
    showBadge?: boolean;
}

export function NotificationBell({
    count,
    onClick,
    className,
    showBadge = true,
}: NotificationBellProps) {
    const hasNotifications = count > 0;
    const badgeText = formatNotificationCount(count);

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn('relative', className)}
            onClick={onClick}
            title={`${count} unread notification${count !== 1 ? 's' : ''}`}
        >
            <Bell className={cn('h-5 w-5', hasNotifications && 'animate-pulse')} />

            {showBadge && hasNotifications && (
                <span className="absolute right-0 top-0 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {badgeText}
                </span>
            )}

            <span className="sr-only">
                {count} unread notification{count !== 1 ? 's' : ''}
            </span>
        </Button>
    );
}
