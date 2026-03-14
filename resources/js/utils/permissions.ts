/**
 * Permission Utility Functions
 *
 * Helper functions for working with permissions and roles
 */

/**
 * Common permission names used throughout the application
 */
export const PERMISSIONS = {
    // User management
    VIEW_USERS: 'view users',
    CREATE_USERS: 'create users',
    EDIT_USERS: 'edit users',
    DELETE_USERS: 'delete users',

    // Content management
    VIEW_CONTENT: 'view content',
    CREATE_CONTENT: 'create content',
    EDIT_CONTENT: 'edit content',
    DELETE_CONTENT: 'delete content',
    PUBLISH_CONTENT: 'publish content',

    // Settings
    MANAGE_SETTINGS: 'manage settings',
    VIEW_ACTIVITY_LOG: 'view activity log',
} as const;

/**
 * Common role names used throughout the application
 */
export const ROLES = {
    SUPER_ADMIN: 'super-admin',
    ADMIN: 'admin',
    EDITOR: 'editor',
    USER: 'user',
} as const;

/**
 * Check if a permission exists in a list of permissions
 */
export function hasPermission(userPermissions: string[], permission: string | string[]): boolean {
    const permissions = Array.isArray(permission) ? permission : [permission];
    return permissions.some((perm) => userPermissions.includes(perm));
}

/**
 * Check if all permissions exist in a list of permissions
 */
export function hasAllPermissions(userPermissions: string[], permissions: string[]): boolean {
    return permissions.every((perm) => userPermissions.includes(perm));
}

/**
 * Check if a role exists in a list of roles
 */
export function hasRole(userRoles: string[], role: string | string[]): boolean {
    const roles = Array.isArray(role) ? role : [role];
    return roles.some((r) => userRoles.includes(r));
}

/**
 * Check if all roles exist in a list of roles
 */
export function hasAllRoles(userRoles: string[], roles: string[]): boolean {
    return roles.every((role) => userRoles.includes(role));
}

/**
 * Check if user is an admin (super-admin or admin role)
 */
export function isAdmin(userRoles: string[]): boolean {
    return hasRole(userRoles, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(userRoles: string[]): boolean {
    return hasRole(userRoles, ROLES.SUPER_ADMIN);
}

/**
 * Get a user-friendly role name
 */
export function getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
        'super-admin': 'Super Admin',
        admin: 'Admin',
        editor: 'Editor',
        user: 'User',
    };

    return roleNames[role] || role;
}

/**
 * Get a user-friendly permission name
 */
export function getPermissionDisplayName(permission: string): string {
    // Convert "view users" to "View Users"
    return permission
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
