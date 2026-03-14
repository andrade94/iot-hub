/**
 * Notification Item Component
 *
 * Displays a single notification with action buttons
 */

import * as React from 'react';
import { Link } from '@inertiajs/react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    formatNotificationTime,
    getNotificationActionText,
    getNotificationActionUrl,
    getNotificationIcon,
    getNotificationMessage,
    getNotificationTitle,
    getNotificationType,
    getNotificationTypeBgColor,
    getNotificationTypeBorderColor,
    getNotificationTypeColor,
    isUnread,
} from '@/utils/notification';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { DatabaseNotification } from '@/types';

export interface NotificationItemProps {
    notification: DatabaseNotification;
    onMarkAsRead?: (id: string) => void;
    onDelete?: (id: string) => void;
    showActions?: boolean;
    className?: string;
}

export function NotificationItem({
    notification,
    onMarkAsRead,
    onDelete,
    showActions = true,
    className,
}: NotificationItemProps) {
    const title = getNotificationTitle(notification);
    const message = getNotificationMessage(notification);
    const type = getNotificationType(notification);
    const iconName = getNotificationIcon(notification);
    const actionUrl = getNotificationActionUrl(notification);
    const actionText = getNotificationActionText(notification);
    const unread = isUnread(notification);

    // Get the icon component
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Bell;

    const handleMarkAsRead = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onMarkAsRead?.(notification.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete?.(notification.id);
    };

    const content = (
        <Card
            className={cn(
                'overflow-hidden transition-all hover:shadow-md',
                unread && 'border-l-4',
                unread && getNotificationTypeBorderColor(type),
                !unread && 'opacity-75',
                className,
            )}
        >
            <div className="flex gap-4 p-4">
                {/* Icon */}
                <div
                    className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        getNotificationTypeBgColor(type),
                    )}
                >
                    <IconComponent className={cn('h-5 w-5', getNotificationTypeColor(type))} />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <p className="font-semibold leading-tight">{title}</p>
                            {unread && (
                                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary" />
                            )}
                        </div>

                        {/* Actions */}
                        {showActions && (
                            <div className="flex items-center gap-1">
                                {unread && onMarkAsRead && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleMarkAsRead}
                                        className="h-8 w-8"
                                        title="Mark as read"
                                    >
                                        <LucideIcons.Check className="h-4 w-4" />
                                    </Button>
                                )}

                                {onDelete && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleDelete}
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        title="Delete"
                                    >
                                        <LucideIcons.X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground">{message}</p>

                    <div className="flex items-center gap-2 pt-1">
                        <p className="text-xs text-muted-foreground">
                            {formatNotificationTime(notification.created_at)}
                        </p>

                        {actionUrl && (
                            <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                                    <Link href={actionUrl}>{actionText}</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );

    // If there's an action URL and it's clickable, wrap in Link
    if (actionUrl) {
        return (
            <Link href={actionUrl} className="block">
                {content}
            </Link>
        );
    }

    return content;
}
