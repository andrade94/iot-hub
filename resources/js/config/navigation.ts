/**
 * Navigation Configuration
 *
 * This file defines the navigation structure for the application.
 * It includes main navigation items, groups, and helper functions
 * for managing navigation state and breadcrumbs.
 */

import type { BreadcrumbItem, NavGroup, NavItem } from '@/types';
import {
    Home,
    Settings,
    User,
    FileText,
    Package,
    LayoutGrid,
    Activity,
    Bell,
    Shield,
    Palette,
    Upload,
    Sparkles,
    Layers,
    Code2,
} from 'lucide-react';

/**
 * Main navigation structure
 * Customize this array to define your application's navigation menu
 */
export const navigation: NavGroup[] = [
    {
        title: 'Overview',
        items: [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: LayoutGrid,
                tooltip: 'Application dashboard',
            },
            {
                title: 'Activity',
                href: '/activity-log',
                icon: Activity,
                tooltip: 'View activity log',
            },
            {
                title: 'Notifications',
                href: '/notifications',
                icon: Bell,
                tooltip: 'Notification center',
                badge: 'New',
            },
        ],
    },
    {
        title: 'Manage',
        items: [
            {
                title: 'Products',
                href: '/products',
                icon: Package,
                tooltip: 'Manage products',
            },
        ],
    },
    {
        title: 'Examples',
        items: [
            {
                title: 'UI Components',
                href: '/ui-demo',
                icon: Layers,
                tooltip: 'View component examples',
            },
            {
                title: 'Components',
                href: '/components-demo',
                icon: Code2,
                tooltip: 'Component showcase',
            },
            {
                title: 'File Upload',
                href: '/file-upload-demo',
                icon: Upload,
                tooltip: 'File upload demo',
            },
        ],
    },
    {
        title: 'Account',
        items: [
            {
                title: 'Profile',
                href: '/settings/profile',
                icon: User,
                tooltip: 'Manage your profile',
            },
            {
                title: 'Security',
                href: '/settings/password',
                icon: Shield,
                tooltip: 'Security settings',
            },
            {
                title: 'Appearance',
                href: '/settings/appearance',
                icon: Palette,
                tooltip: 'Theme settings',
            },
        ],
    },
];

/**
 * Flatten all navigation items into a single array
 * Useful for searching or filtering navigation items
 */
export function getAllNavigationItems(navGroups: NavGroup[] = navigation): NavItem[] {
    const items: NavItem[] = [];

    navGroups.forEach((group) => {
        group.items.forEach((item) => {
            items.push(item);
            // Recursively add nested items if they exist
            if (item.items && item.items.length > 0) {
                items.push(...getAllNavigationItems([{ title: '', items: item.items }]));
            }
        });
    });

    return items;
}

/**
 * Find the active navigation item based on the current URL
 * Supports nested navigation items
 */
export function findActiveNavItem(
    url: string,
    navGroups: NavGroup[] = navigation
): NavItem | null {
    const allItems = getAllNavigationItems(navGroups);

    // Find exact match first
    const exactMatch = allItems.find((item) => item.href === url);
    if (exactMatch) return exactMatch;

    // Find partial match (for nested routes)
    const partialMatch = allItems.find((item) => url.startsWith(item.href));
    return partialMatch || null;
}

/**
 * Build breadcrumbs from the current URL
 * This is a basic implementation - enhance based on your routing needs
 */
export function buildBreadcrumbs(
    url: string,
    navGroups: NavGroup[] = navigation
): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/dashboard',
        },
    ];

    const activeItem = findActiveNavItem(url, navGroups);
    if (activeItem && activeItem.href !== '/dashboard') {
        breadcrumbs.push({
            title: activeItem.title,
            href: activeItem.href,
        });
    }

    return breadcrumbs;
}

/**
 * Mark navigation items as active based on current URL
 * Returns a new navigation structure with isActive flags set
 */
export function markActiveNavigation(
    url: string,
    navGroups: NavGroup[] = navigation
): NavGroup[] {
    return navGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
            ...item,
            isActive: url === item.href || url.startsWith(item.href + '/'),
        })),
    }));
}
