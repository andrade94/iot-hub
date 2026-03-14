/**
 * Notifications Hook
 *
 * Hook for managing user notifications
 */

import { router } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import type { DatabaseNotification } from '@/types';

interface UseNotificationsOptions {
    onSuccess?: (message?: string) => void;
    onError?: (error: string) => void;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Mark a notification as read
     */
    const markAsRead = useCallback(
        async (notificationId: string): Promise<void> => {
            setIsLoading(true);

            try {
                const response = await fetch(`/notifications/${notificationId}/mark-as-read`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') as string,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to mark notification as read');
                }

                // Reload to refresh notification count
                router.reload({ only: ['notifications'] });

                options.onSuccess?.('Notification marked as read');
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : 'Failed to mark notification as read';
                options.onError?.(errorMessage);
            } finally {
                setIsLoading(false);
            }
        },
        [options],
    );

    /**
     * Mark all notifications as read
     */
    const markAllAsRead = useCallback(async (): Promise<void> => {
        setIsLoading(true);

        try {
            const response = await fetch('/notifications/mark-all-as-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content') as string,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to mark all notifications as read');
            }

            // Reload to refresh notification list
            router.reload({ only: ['notifications'] });

            options.onSuccess?.('All notifications marked as read');
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Failed to mark all notifications as read';
            options.onError?.(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [options]);

    /**
     * Delete a notification
     */
    const deleteNotification = useCallback(
        (notificationId: string): void => {
            router.delete(`/notifications/${notificationId}`, {
                preserveScroll: true,
                onSuccess: () => {
                    options.onSuccess?.('Notification deleted');
                },
                onError: (errors) => {
                    const errorMessage = Object.values(errors)[0] as string;
                    options.onError?.(errorMessage || 'Failed to delete notification');
                },
            });
        },
        [options],
    );

    /**
     * Delete all read notifications
     */
    const deleteReadNotifications = useCallback((): void => {
        router.delete('/notifications/read/delete-all', {
            preserveScroll: true,
            onSuccess: () => {
                options.onSuccess?.('Read notifications deleted');
            },
            onError: (errors) => {
                const errorMessage = Object.values(errors)[0] as string;
                options.onError?.(errorMessage || 'Failed to delete read notifications');
            },
        });
    }, [options]);

    /**
     * Get unread notification count
     */
    const getUnreadCount = useCallback(
        async (): Promise<number> => {
            try {
                const response = await fetch('/notifications/unread-count');

                if (!response.ok) {
                    throw new Error('Failed to fetch unread count');
                }

                const data = await response.json();
                return data.count;
            } catch (error) {
                options.onError?.('Failed to fetch unread notification count');
                return 0;
            }
        },
        [options],
    );

    /**
     * Filter notifications by read status
     */
    const filterNotifications = useCallback(
        (notifications: DatabaseNotification[], filter: 'all' | 'unread' | 'read') => {
            if (filter === 'all') {
                return notifications;
            }

            if (filter === 'unread') {
                return notifications.filter((n) => n.read_at === null);
            }

            return notifications.filter((n) => n.read_at !== null);
        },
        [],
    );

    return {
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteReadNotifications,
        getUnreadCount,
        filterNotifications,
    };
}
