/**
 * Notification Dropdown Component
 *
 * Dropdown menu showing recent notifications with actions
 */

import * as React from 'react';
import { Link } from '@inertiajs/react';
import { CheckCheck, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUnreadCount } from '@/utils/notification';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/ui/notification-bell';
import { NotificationItem } from '@/components/ui/notification-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DatabaseNotification } from '@/types';

export interface NotificationDropdownProps {
    notifications?: DatabaseNotification[] | null;
    maxDisplay?: number;
    className?: string;
}

/**
 * Type guard to check if a notification is valid (not null/undefined)
 */
function isValidNotification(notification: unknown): notification is DatabaseNotification {
    return (
        notification !== null &&
        notification !== undefined &&
        typeof notification === 'object' &&
        'id' in notification &&
        'data' in notification
    );
}

/**
 * Normalize notifications to ensure it's always an array of valid notifications.
 * Handles Laravel Collections that may serialize as objects with numeric keys,
 * and filters out null/undefined items.
 */
function normalizeNotifications(notifications: unknown): DatabaseNotification[] {
    if (!notifications) {
        return [];
    }

    // Handle Laravel Collection serialized as object with numeric keys
    const arr = Array.isArray(notifications)
        ? notifications
        : typeof notifications === 'object'
            ? Object.values(notifications)
            : [];

    // Filter out null/undefined/invalid items
    return arr.filter(isValidNotification);
}

export function NotificationDropdown({
    notifications,
    maxDisplay = 5,
    className,
}: NotificationDropdownProps) {
    const { toast } = useToast();

    // Ensure notifications is always an array
    const safeNotifications = normalizeNotifications(notifications);

    const unreadCount = getUnreadCount(safeNotifications);
    const displayedNotifications = safeNotifications.slice(0, maxDisplay);
    const hasMore = safeNotifications.length > maxDisplay;

    const { markAsRead, markAllAsRead, deleteNotification } = useNotifications({
        onSuccess: (message) => {
            if (message) {
                toast({
                    title: 'Success',
                    description: message,
                });
            }
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error,
                variant: 'destructive',
            });
        },
    });

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div>
                    <NotificationBell count={unreadCount} className={className} />
                </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-96">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="h-auto px-2 py-1 text-xs"
                        >
                            <CheckCheck className="mr-1 h-3 w-3" />
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {safeNotifications.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-muted-foreground">No notifications</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="max-h-[400px]">
                            <div className="space-y-2 p-2">
                                {displayedNotifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onMarkAsRead={markAsRead}
                                        onDelete={deleteNotification}
                                        showActions={true}
                                    />
                                ))}
                            </div>
                        </ScrollArea>

                        <DropdownMenuSeparator />

                        <div className="flex items-center justify-between p-2">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/notifications">View all notifications</Link>
                            </Button>

                            {hasMore && (
                                <span className="text-xs text-muted-foreground">
                                    +{safeNotifications.length - maxDisplay} more
                                </span>
                            )}
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
