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
    Calendar,
    CalendarCheck,
    ClipboardList,
    Copy,
    Cpu,
    CreditCard,
    Download,
    GitBranch,
    LayoutGrid,
    MapPin,
    Monitor,
    Radio,
    Scale,
    TrendingUp,
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
                title: 'Reports',
                href: '/reports',
                icon: BarChart3,
                tooltip: 'View reports',
            },
            {
                title: 'Performance',
                href: '/analytics/performance',
                icon: TrendingUp,
                tooltip: 'SLA & KPI dashboard',
            },
            {
                title: 'Compare Sites',
                href: '/sites/compare',
                icon: Scale,
                tooltip: 'Rank and compare site performance',
            },
        ],
    },
    {
        title: 'Operations',
        items: [
            {
                title: 'Work Orders',
                href: '/work-orders',
                icon: ClipboardList,
                tooltip: 'Manage work orders',
            },
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
        ],
    },
    {
        title: 'Monitor',
        items: [
            {
                title: 'Sites',
                href: '/sites',
                icon: MapPin,
                tooltip: 'View sites',
            },
            {
                title: 'Devices',
                href: '/devices',
                icon: Cpu,
                tooltip: 'View devices',
            },
            {
                title: 'Gateways',
                href: '/settings/gateways',
                icon: Radio,
                tooltip: 'View gateways',
            },
        ],
    },
    {
        title: 'Analytics',
        items: [
            {
                title: 'Alert Tuning',
                href: '/analytics/alerts',
                icon: BarChart3,
                tooltip: 'Alert analytics & tuning',
                requiredPermission: 'view alert analytics',
            },
            {
                title: 'Activity',
                href: '/activity-log',
                icon: Activity,
                tooltip: 'View activity log',
                requiredPermission: 'view activity log',
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
                title: 'Users',
                href: '/settings/users',
                icon: Users,
                tooltip: 'Manage users',
                requiredPermission: 'manage users',
            },
            {
                title: 'Site Management',
                href: '/settings/sites',
                icon: MapPin,
                tooltip: 'Create and configure sites',
                requiredPermission: 'manage sites',
            },
            {
                title: 'Escalation Chains',
                href: '/settings/escalation-chains',
                icon: GitBranch,
                tooltip: 'Alert escalation setup',
                requiredPermission: 'manage alert rules',
            },
            {
                title: 'Recipes',
                href: '/recipes',
                icon: BookOpen,
                tooltip: 'Sensor recipes',
            },
            {
                title: 'Compliance',
                href: '/settings/compliance',
                icon: CalendarCheck,
                tooltip: 'Compliance calendar',
                requiredPermission: 'manage org settings',
            },
            {
                title: 'Maintenance',
                href: '/settings/maintenance-windows',
                icon: Wrench,
                tooltip: 'Schedule maintenance windows',
                requiredPermission: 'manage maintenance windows',
            },
            {
                title: 'Report Schedules',
                href: '/settings/report-schedules',
                icon: Calendar,
                tooltip: 'Automated report delivery',
                requiredPermission: 'manage report schedules',
            },
            {
                title: 'Site Templates',
                href: '/settings/site-templates',
                icon: Copy,
                tooltip: 'Site configuration templates',
                requiredPermission: 'manage site templates',
            },
            {
                title: 'Data Export',
                href: '/settings/export-data',
                icon: Download,
                tooltip: 'Export organization data',
                requiredPermission: 'export organization data',
            },
            // Billing deactivated for MVP — reactivate when payment processing is needed
            // {
            //     title: 'Billing',
            //     href: '/settings/billing',
            //     icon: CreditCard,
            //     tooltip: 'Billing & invoices',
            //     requiredPermission: 'manage org settings',
            // },
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
