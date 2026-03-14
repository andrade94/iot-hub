/**
 * useRealtimeNotifications Hook
 *
 * Hook for subscribing to real-time notifications via Laravel Echo/Reverb.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { getEcho, isEchoAvailable } from '@/lib/echo';
import type { DatabaseNotification, NotificationData } from '@/types';

interface RealtimeNotification {
    id: string;
    type: string;
    data: NotificationData;
    read_at: string | null;
    created_at: string;
}

interface UseRealtimeNotificationsOptions {
    userId?: number;
    onNotification?: (notification: RealtimeNotification) => void;
    enabled?: boolean;
}

interface UseRealtimeNotificationsReturn {
    isConnected: boolean;
    isAvailable: boolean;
    lastNotification: RealtimeNotification | null;
    notifications: RealtimeNotification[];
    clearNotifications: () => void;
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}): UseRealtimeNotificationsReturn {
    const { userId, onNotification, enabled = true } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
    const [lastNotification, setLastNotification] = useState<RealtimeNotification | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelRef = useRef<any>(null);

    const handleNotification = useCallback(
        (notification: RealtimeNotification) => {
            setLastNotification(notification);
            setNotifications((prev) => [notification, ...prev]);
            onNotification?.(notification);
        },
        [onNotification]
    );

    useEffect(() => {
        if (!enabled || !userId) {
            return;
        }

        const echo = getEcho();
        if (!echo) {
            return;
        }

        // Subscribe to user's private channel
        const channel = echo.private(`App.Models.User.${userId}`);

        // Listen for notification events
        channel.listen('.notification.created', (event: RealtimeNotification) => {
            handleNotification(event);
        });

        // Track connection state
        channel.subscribed(() => {
            setIsConnected(true);
        });

        channelRef.current = channel;

        // Cleanup on unmount
        return () => {
            if (channelRef.current) {
                echo.leave(`App.Models.User.${userId}`);
                channelRef.current = null;
            }
            setIsConnected(false);
        };
    }, [userId, enabled, handleNotification]);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
        setLastNotification(null);
    }, []);

    return {
        isConnected,
        isAvailable: isEchoAvailable(),
        lastNotification,
        notifications,
        clearNotifications,
    };
}

/**
 * Hook for getting the unread notification count in real-time
 */
interface UseNotificationCountOptions {
    userId?: number;
    initialCount?: number;
    enabled?: boolean;
}

export function useNotificationCount(options: UseNotificationCountOptions = {}) {
    const { userId, initialCount = 0, enabled = true } = options;

    const [count, setCount] = useState(initialCount);

    const { lastNotification } = useRealtimeNotifications({
        userId,
        enabled,
        onNotification: () => {
            setCount((prev) => prev + 1);
        },
    });

    const decrementCount = useCallback(() => {
        setCount((prev) => Math.max(0, prev - 1));
    }, []);

    const resetCount = useCallback(() => {
        setCount(0);
    }, []);

    const setCountValue = useCallback((value: number) => {
        setCount(Math.max(0, value));
    }, []);

    return {
        count,
        decrementCount,
        resetCount,
        setCount: setCountValue,
        lastNotification,
    };
}
