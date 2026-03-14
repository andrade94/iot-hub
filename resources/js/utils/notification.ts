/**
 * Notification Utilities
 *
 * Helper functions for working with notifications
 */

import { formatDistanceToNow } from 'date-fns';
import type { DatabaseNotification } from '@/types';

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
 * Safely get valid notifications from an array that may contain null/undefined items
 */
function getValidNotifications(notifications: unknown): DatabaseNotification[] {
    if (!notifications) {
        return [];
    }

    // Handle Laravel Collection serialized as object with numeric keys
    const arr = Array.isArray(notifications)
        ? notifications
        : typeof notifications === 'object'
            ? Object.values(notifications)
            : [];

    return arr.filter(isValidNotification);
}

/**
 * Format notification timestamp as relative time
 */
export function formatNotificationTime(createdAt: string | null | undefined): string {
    if (!createdAt) {
        return '';
    }
    try {
        return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch {
        return '';
    }
}

/**
 * Get notification type color
 */
export function getNotificationTypeColor(type: string | null | undefined): string {
    const colors: Record<string, string> = {
        success: 'text-green-600 dark:text-green-400',
        error: 'text-red-600 dark:text-red-400',
        warning: 'text-yellow-600 dark:text-yellow-400',
        info: 'text-blue-600 dark:text-blue-400',
    };

    return colors[type || ''] || 'text-gray-600 dark:text-gray-400';
}

/**
 * Get notification type background color
 */
export function getNotificationTypeBgColor(type: string | null | undefined): string {
    const colors: Record<string, string> = {
        success: 'bg-green-100 dark:bg-green-900/20',
        error: 'bg-red-100 dark:bg-red-900/20',
        warning: 'bg-yellow-100 dark:bg-yellow-900/20',
        info: 'bg-blue-100 dark:bg-blue-900/20',
    };

    return colors[type || ''] || 'bg-gray-100 dark:bg-gray-900/20';
}

/**
 * Get notification type border color
 */
export function getNotificationTypeBorderColor(type: string | null | undefined): string {
    const colors: Record<string, string> = {
        success: 'border-green-200 dark:border-green-800',
        error: 'border-red-200 dark:border-red-800',
        warning: 'border-yellow-200 dark:border-yellow-800',
        info: 'border-blue-200 dark:border-blue-800',
    };

    return colors[type || ''] || 'border-gray-200 dark:border-gray-800';
}

/**
 * Get notification icon name
 */
export function getNotificationIcon(notification: DatabaseNotification | null | undefined): string {
    if (!notification?.data) {
        return 'Bell';
    }
    return notification.data.icon || 'Bell';
}

/**
 * Check if notification is unread
 */
export function isUnread(notification: DatabaseNotification | null | undefined): boolean {
    if (!notification) {
        return false;
    }
    return notification.read_at === null;
}

/**
 * Group notifications by date
 */
export function groupNotificationsByDate(
    notifications: unknown,
): Record<string, DatabaseNotification[]> {
    const groups: Record<string, DatabaseNotification[]> = {
        Today: [],
        Yesterday: [],
        'This Week': [],
        'This Month': [],
        Older: [],
    };

    const validNotifications = getValidNotifications(notifications);

    if (validNotifications.length === 0) {
        return groups;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(today);
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    validNotifications.forEach((notification) => {
        try {
            const createdAt = new Date(notification.created_at);

            if (createdAt >= today) {
                groups['Today'].push(notification);
            } else if (createdAt >= yesterday) {
                groups['Yesterday'].push(notification);
            } else if (createdAt >= thisWeek) {
                groups['This Week'].push(notification);
            } else if (createdAt >= thisMonth) {
                groups['This Month'].push(notification);
            } else {
                groups['Older'].push(notification);
            }
        } catch {
            // Skip notifications with invalid dates
        }
    });

    // Remove empty groups
    Object.keys(groups).forEach((key) => {
        if (groups[key].length === 0) {
            delete groups[key];
        }
    });

    return groups;
}

/**
 * Filter notifications by type
 */
export function filterNotificationsByType(
    notifications: unknown,
    type: string,
): DatabaseNotification[] {
    const validNotifications = getValidNotifications(notifications);

    if (type === 'all') {
        return validNotifications;
    }

    return validNotifications.filter((notification) => notification.data?.type === type);
}

/**
 * Sort notifications by date
 */
export function sortNotificationsByDate(
    notifications: unknown,
    order: 'asc' | 'desc' = 'desc',
): DatabaseNotification[] {
    const validNotifications = getValidNotifications(notifications);

    return [...validNotifications].sort((a, b) => {
        try {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return order === 'desc' ? dateB - dateA : dateA - dateB;
        } catch {
            return 0;
        }
    });
}

/**
 * Get notification title
 */
export function getNotificationTitle(notification: DatabaseNotification | null | undefined): string {
    if (!notification?.data) {
        return 'Notification';
    }
    return notification.data.title || 'Notification';
}

/**
 * Get notification message
 */
export function getNotificationMessage(notification: DatabaseNotification | null | undefined): string {
    if (!notification?.data) {
        return '';
    }
    return notification.data.message || '';
}

/**
 * Get notification action URL
 */
export function getNotificationActionUrl(notification: DatabaseNotification | null | undefined): string | null {
    if (!notification?.data) {
        return null;
    }
    return notification.data.action_url || null;
}

/**
 * Get notification action text
 */
export function getNotificationActionText(notification: DatabaseNotification | null | undefined): string {
    if (!notification?.data) {
        return 'View';
    }
    return notification.data.action_text || 'View';
}

/**
 * Get notification type
 */
export function getNotificationType(notification: DatabaseNotification | null | undefined): string {
    if (!notification?.data) {
        return 'info';
    }
    return notification.data.type || 'info';
}

/**
 * Format notification count for display
 */
export function formatNotificationCount(count: number | null | undefined): string {
    if (!count || count === 0) {
        return '';
    }

    if (count > 99) {
        return '99+';
    }

    return count.toString();
}

/**
 * Get unread notification count
 */
export function getUnreadCount(notifications: unknown): number {
    const validNotifications = getValidNotifications(notifications);
    return validNotifications.filter((n) => n.read_at === null).length;
}
