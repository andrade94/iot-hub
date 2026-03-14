import type { User } from '@/types';

/**
 * Get the display name for a user with safe fallbacks
 */
export function getUserDisplayName(user: User): string {
    // First try the computed name attribute
    if (user.name && user.name.trim()) {
        return user.name.trim();
    }

    // Fallback to combining first_name and last_name (both are required fields)
    const combinedName = `${user.first_name.trim()} ${user.last_name.trim()}`.trim();

    if (combinedName) {
        return combinedName;
    }

    // Final fallback (should rarely be needed)
    return 'User';
}

/**
 * Get user initials for avatar fallbacks
 */
export function getUserInitials(user: User): string {
    const displayName = getUserDisplayName(user);

    if (!displayName || displayName === 'User') {
        return 'U';
    }

    const names = displayName.split(' ').filter((name) => name.length > 0);

    if (names.length === 0) return 'U';
    if (names.length === 1) return names[0].charAt(0).toUpperCase();

    const firstInitial = names[0].charAt(0);
    const lastInitial = names[names.length - 1].charAt(0);

    return `${firstInitial}${lastInitial}`.toUpperCase();
}
