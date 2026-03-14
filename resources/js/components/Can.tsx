/**
 * Permission Gate Component
 *
 * Conditionally renders children based on user permissions
 */

import { usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';
import type { User } from '@/types';

interface CanProps {
    /**
     * Permission name(s) to check
     * Can be a single permission or an array of permissions
     */
    permission: string | string[];

    /**
     * If true, user needs ALL specified permissions (AND logic)
     * If false, user needs ANY of the specified permissions (OR logic)
     * @default false
     */
    requireAll?: boolean;

    /**
     * Content to render if user has permission
     */
    children: ReactNode;

    /**
     * Optional content to render if user lacks permission
     */
    fallback?: ReactNode;
}

export function Can({ permission, requireAll = false, children, fallback = null }: CanProps) {
    const { auth } = usePage<{
        auth: {
            user: User | null;
            permissions: string[];
            roles: string[];
        };
    }>().props;

    // If no user is authenticated, don't show anything
    if (!auth.user) {
        return fallback;
    }

    const permissions = Array.isArray(permission) ? permission : [permission];
    const userPermissions = auth.permissions || [];

    // Check if user has the required permission(s)
    const hasPermission = requireAll
        ? permissions.every((perm) => userPermissions.includes(perm))
        : permissions.some((perm) => userPermissions.includes(perm));

    return hasPermission ? children : fallback;
}

/**
 * Hook version for imperative permission checks
 */
export function usePermission() {
    const { auth } = usePage<{
        auth: {
            user: User | null;
            permissions: string[];
            roles: string[];
        };
    }>().props;

    const can = (permission: string | string[], requireAll = false): boolean => {
        if (!auth.user) {
            return false;
        }

        const permissions = Array.isArray(permission) ? permission : [permission];
        const userPermissions = auth.permissions || [];

        return requireAll
            ? permissions.every((perm) => userPermissions.includes(perm))
            : permissions.some((perm) => userPermissions.includes(perm));
    };

    const cannot = (permission: string | string[], requireAll = false): boolean => {
        return !can(permission, requireAll);
    };

    return { can, cannot, permissions: auth.permissions || [] };
}
