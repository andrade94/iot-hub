/**
 * Activity Log Utility Functions
 *
 * Helper functions for working with activity logs
 */

import { formatDistanceToNow, format } from 'date-fns';

export interface Activity {
    id: number;
    log_name: string | null;
    description: string;
    subject_type: string | null;
    event: string | null;
    subject_id: number | null;
    causer_type: string | null;
    causer_id: number | null;
    properties: Record<string, any>;
    batch_uuid: string | null;
    created_at: string;
    updated_at: string;
    causer?: {
        id: number;
        name: string;
        email: string;
    };
    subject?: {
        id: number;
        [key: string]: any;
    };
}

/**
 * Get a human-readable event name
 */
export function getEventName(event: string | null): string {
    if (!event) return 'Unknown';

    const eventNames: Record<string, string> = {
        created: 'Created',
        updated: 'Updated',
        deleted: 'Deleted',
        retrieved: 'Retrieved',
        restored: 'Restored',
        login: 'Logged in',
        logout: 'Logged out',
    };

    return eventNames[event] || event.charAt(0).toUpperCase() + event.slice(1);
}

/**
 * Get a color class for an event type
 */
export function getEventColor(event: string | null): string {
    if (!event) return 'bg-gray-500';

    const eventColors: Record<string, string> = {
        created: 'bg-green-500',
        updated: 'bg-blue-500',
        deleted: 'bg-red-500',
        restored: 'bg-yellow-500',
        login: 'bg-purple-500',
        logout: 'bg-gray-500',
    };

    return eventColors[event] || 'bg-gray-500';
}

/**
 * Get an icon name for an event type
 */
export function getEventIcon(event: string | null): string {
    if (!event) return 'Circle';

    const eventIcons: Record<string, string> = {
        created: 'Plus',
        updated: 'Pencil',
        deleted: 'Trash2',
        restored: 'RotateCcw',
        login: 'LogIn',
        logout: 'LogOut',
    };

    return eventIcons[event] || 'Circle';
}

/**
 * Format a date relative to now (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format a date as a full datetime
 */
export function formatDateTime(date: string): string {
    return format(new Date(date), 'PPpp'); // e.g., "Apr 29, 2023, 9:30 AM"
}

/**
 * Get the model name from a fully qualified class name
 */
export function getModelName(subjectType: string | null): string {
    if (!subjectType) return 'Unknown';

    // Extract class name from namespace (e.g., "App\\Models\\User" -> "User")
    const parts = subjectType.split('\\');
    return parts[parts.length - 1];
}

/**
 * Get causer name or fallback to "System"
 */
export function getCauserName(activity: Activity): string {
    if (activity.causer) {
        return activity.causer.name;
    }
    return 'System';
}

/**
 * Check if activity has property changes
 */
export function hasPropertyChanges(activity: Activity): boolean {
    return (
        activity.properties &&
        (activity.properties.attributes || activity.properties.old || activity.properties.changes)
    );
}

/**
 * Get the changed properties from an activity
 */
export function getChangedProperties(activity: Activity): Array<{ field: string; old: any; new: any }> {
    if (!activity.properties) return [];

    const changes: Array<{ field: string; old: any; new: any }> = [];

    if (activity.properties.attributes && activity.properties.old) {
        // Updated event
        const newValues = activity.properties.attributes;
        const oldValues = activity.properties.old;

        Object.keys(newValues).forEach((key) => {
            if (oldValues[key] !== newValues[key]) {
                changes.push({
                    field: key,
                    old: oldValues[key],
                    new: newValues[key],
                });
            }
        });
    } else if (activity.properties.attributes) {
        // Created event
        Object.entries(activity.properties.attributes).forEach(([key, value]) => {
            changes.push({
                field: key,
                old: null,
                new: value,
            });
        });
    }

    return changes;
}

/**
 * Format a field name for display (e.g., "user_name" -> "User Name")
 */
export function formatFieldName(field: string): string {
    return field
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Truncate a value for display
 */
export function truncateValue(value: any, maxLength: number = 50): string {
    const str = String(value);
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}
