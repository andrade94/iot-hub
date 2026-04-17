import { usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import AppearanceToggleDropdown from '@/components/appearance-dropdown';
// Button import removed — using native <button> for search trigger
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { NotificationDropdown } from '@/components/ui/notification-dropdown';
import { Separator } from '@/components/ui/separator';
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
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border/40 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-1.5">
                <SidebarTrigger className="-ml-1 size-7 text-muted-foreground" />
                <Separator orientation="vertical" className="mx-1 !h-4" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="ml-auto flex items-center gap-1">
                <button
                    className="hidden h-8 w-56 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/80 md:flex"
                    onClick={() => {
                        document.dispatchEvent(
                            new KeyboardEvent('keydown', { key: 'k', metaKey: true }),
                        );
                    }}
                >
                    <Search className="size-3.5" />
                    <span className="flex-1 text-left">Search...</span>
                    <kbd className="pointer-events-none flex h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground/70">
                        <span className="text-xs">&#8984;</span>K
                    </kbd>
                </button>
                <button
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
                    onClick={() => {
                        document.dispatchEvent(
                            new KeyboardEvent('keydown', { key: 'k', metaKey: true }),
                        );
                    }}
                >
                    <Search className="size-4" />
                </button>
                <LanguageSwitcher size="icon" />
                <AppearanceToggleDropdown />
                {auth.user && (
                    <NotificationDropdown notifications={notifications} />
                )}
            </div>
        </header>
    );
}
