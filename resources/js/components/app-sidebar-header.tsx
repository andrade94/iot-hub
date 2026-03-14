import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationDropdown } from '@/components/ui/notification-dropdown';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { type BreadcrumbItem as BreadcrumbItemType, type DatabaseNotification, type SharedData } from '@/types';

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

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth, notifications: initialNotifications } = usePage<SharedData>().props;

    // Normalize initial notifications to ensure it's an array
    const normalizedInitial = useMemo(
        () => normalizeNotifications(initialNotifications),
        [initialNotifications]
    );

    const [notifications, setNotifications] = useState<DatabaseNotification[]>(normalizedInitial);

    // Update notifications when page props change (after marking as read, etc.)
    useEffect(() => {
        setNotifications(normalizedInitial);
    }, [normalizedInitial]);

    // Handle incoming real-time notifications
    const handleRealtimeNotification = useCallback((notification: { id: string; type: string; data: DatabaseNotification['data']; read_at: string | null; created_at: string }) => {
        // Add new notification to the list
        const newNotification: DatabaseNotification = {
            id: notification.id,
            type: notification.type,
            notifiable_type: 'App\\Models\\User',
            notifiable_id: auth.user?.id ?? 0,
            data: notification.data,
            read_at: notification.read_at,
            created_at: notification.created_at,
            updated_at: notification.created_at,
        };

        setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]);

        // Show toast for new notification
        toast(notification.data.title, {
            description: notification.data.message,
        });
    }, [auth.user?.id]);

    // Subscribe to real-time notifications
    useRealtimeNotifications({
        userId: auth.user?.id,
        enabled: !!auth.user,
        onNotification: handleRealtimeNotification,
    });

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-1">
                <AppearanceToggleDropdown />
                {auth.user && (
                    <NotificationDropdown notifications={notifications} />
                )}
            </div>
        </header>
    );
}
