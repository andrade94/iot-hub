/**
 * Role Gate Component
 *
 * Conditionally renders children based on user roles
 */

import { usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';
import type { User } from '@/types';

interface HasRoleProps {
    /**
     * Role name(s) to check
     * Can be a single role or an array of roles
     */
    role: string | string[];

    /**
     * If true, user needs ALL specified roles (AND logic)
     * If false, user needs ANY of the specified roles (OR logic)
     * @default false
     */
    requireAll?: boolean;

    /**
     * Content to render if user has role
     */
    children: ReactNode;

    /**
     * Optional content to render if user lacks role
     */
    fallback?: ReactNode;
}

export function HasRole({ role, requireAll = false, children, fallback = null }: HasRoleProps) {
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

    const roles = Array.isArray(role) ? role : [role];
    const userRoles = auth.roles || [];

    // Check if user has the required role(s)
    const hasRole = requireAll
        ? roles.every((r) => userRoles.includes(r))
        : roles.some((r) => userRoles.includes(r));

    return hasRole ? children : fallback;
}

/**
 * Hook version for imperative role checks
 */
export function useRole() {
    const { auth } = usePage<{
        auth: {
            user: User | null;
            permissions: string[];
            roles: string[];
        };
    }>().props;

    const hasRole = (role: string | string[], requireAll = false): boolean => {
        if (!auth.user) {
            return false;
        }

        const roles = Array.isArray(role) ? role : [role];
        const userRoles = auth.roles || [];

        return requireAll
            ? roles.every((r) => userRoles.includes(r))
            : roles.some((r) => userRoles.includes(r));
    };

    const lacksRole = (role: string | string[], requireAll = false): boolean => {
        return !hasRole(role, requireAll);
    };

    const isAdmin = (): boolean => {
        return hasRole(['super-admin', 'admin']);
    };

    const isSuperAdmin = (): boolean => {
        return hasRole('super-admin');
    };

    return { hasRole, lacksRole, isAdmin, isSuperAdmin, roles: auth.roles || [] };
}
