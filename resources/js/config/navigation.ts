/**
 * Navigation Configuration
 *
 * IoT platform navigation structure.
 */

import type { BreadcrumbItem, NavGroup, NavItem } from '@/types';
import {
    Activity,
    BarChart3,
    Bell,
    BookOpen,
    Building2,
    CalendarCheck,
    ClipboardList,
    Cpu,
    CreditCard,
    GitBranch,
    LayoutGrid,
    MapPin,
    Monitor,
    Palette,
    Radio,
    Shield,
    User,
    Users,
    Wrench,
} from 'lucide-react';

/**
 * Main navigation structure
 */
export const navigation: NavGroup[] = [
    {
        title: 'Overview',
        items: [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: LayoutGrid,
                tooltip: 'Platform overview',
            },
            {
                title: 'Alerts',
                href: '/alerts',
                icon: Bell,
                tooltip: 'Alert center',
            },
            {
                title: 'Activity',
                href: '/activity-log',
                icon: Activity,
                tooltip: 'View activity log',
                requiredPermission: 'view activity log',
            },
            {
                title: 'Alert Tuning',
                href: '/analytics/alerts',
                icon: BarChart3,
                tooltip: 'Alert analytics & tuning',
                requiredPermission: 'view alert analytics',
            },
        ],
    },
    {
        title: 'Operations',
        items: [
            {
                title: 'Command Center',
                href: '/command-center',
                icon: Monitor,
                tooltip: 'Global operations view',
                requiredRole: 'super_admin',
            },
            {
                title: 'Partner Portal',
                href: '/partner',
                icon: Building2,
                tooltip: 'Partner management',
                requiredRole: 'super_admin',
            },
            {
                title: 'Work Orders',
                href: '/work-orders',
                icon: ClipboardList,
                tooltip: 'Manage work orders',
            },
        ],
    },
    {
        title: 'Monitor',
        items: [
            {
                title: 'Sites',
                href: '/sites',
                icon: MapPin,
                tooltip: 'Manage sites',
            },
            {
                title: 'Devices',
                href: '/devices',
                icon: Cpu,
                tooltip: 'Manage devices',
            },
            {
                title: 'Reports',
                href: '/reports',
                icon: BarChart3,
                tooltip: 'View reports',
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
    {
        title: 'Administration',
        items: [
            {
                title: 'Organization',
                href: '/settings/organization',
                icon: Building2,
                tooltip: 'Organization settings',
                requiredPermission: 'manage org settings',
            },
            {
                title: 'Sites',
                href: '/settings/sites',
                icon: MapPin,
                tooltip: 'Manage sites',
                requiredPermission: 'manage sites',
            },
            {
                title: 'Gateways',
                href: '/settings/gateways',
                icon: Radio,
                tooltip: 'Manage gateways',
                requiredPermission: 'manage devices',
            },
            {
                title: 'Recipes',
                href: '/recipes',
                icon: BookOpen,
                tooltip: 'Sensor recipes',
            },
            {
                title: 'Escalation Chains',
                href: '/settings/escalation-chains',
                icon: GitBranch,
                tooltip: 'Alert escalation setup',
                requiredPermission: 'manage alert rules',
            },
            {
                title: 'Compliance',
                href: '/settings/compliance',
                icon: CalendarCheck,
                tooltip: 'Compliance calendar',
                requiredPermission: 'manage org settings',
            },
            {
                title: 'Maintenance Windows',
                href: '/settings/maintenance-windows',
                icon: Wrench,
                tooltip: 'Schedule maintenance windows',
                requiredPermission: 'manage maintenance windows',
            },
            {
                title: 'Users',
                href: '/settings/users',
                icon: Users,
                tooltip: 'Manage users',
                requiredPermission: 'manage users',
            },
            {
                title: 'Billing',
                href: '/settings/billing',
                icon: CreditCard,
                tooltip: 'Billing & invoices',
                requiredPermission: 'manage org settings',
            },
        ],
    },
];

/**
 * Flatten all navigation items into a single array
 */
export function getAllNavigationItems(navGroups: NavGroup[] = navigation): NavItem[] {
    const items: NavItem[] = [];

    navGroups.forEach((group) => {
        group.items.forEach((item) => {
            items.push(item);
            if (item.items && item.items.length > 0) {
                items.push(...getAllNavigationItems([{ title: '', items: item.items }]));
            }
        });
    });

    return items;
}

/**
 * Find the active navigation item based on the current URL
 */
export function findActiveNavItem(
    url: string,
    navGroups: NavGroup[] = navigation,
): NavItem | null {
    const allItems = getAllNavigationItems(navGroups);

    const exactMatch = allItems.find((item) => item.href === url);
    if (exactMatch) return exactMatch;

    const partialMatch = allItems.find((item) => typeof item.href === 'string' && url.startsWith(item.href));
    return partialMatch || null;
}

/**
 * Build breadcrumbs from the current URL
 */
export function buildBreadcrumbs(
    url: string,
    navGroups: NavGroup[] = navigation,
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
 */
export function markActiveNavigation(
    url: string,
    navGroups: NavGroup[] = navigation,
): NavGroup[] {
    return navGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
            ...item,
            isActive: typeof item.href === 'string' && (url === item.href || url.startsWith(item.href + '/')),
        })),
    }));
}
