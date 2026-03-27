/**
 * NavMain Component
 *
 * Collapsible sidebar navigation with role/permission filtering.
 * Clean minimal style with enterprise power features.
 */

import * as Collapsible from '@radix-ui/react-collapsible';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { cn, resolveUrl } from '@/lib/utils';
import { type NavGroup, type NavItem } from '@/types';

/**
 * Filter nav items based on requiredRole and requiredPermission.
 * Items without these fields are always shown.
 */
function filterNavItems(
    items: NavItem[],
    roles: string[],
    permissions: string[],
): NavItem[] {
    return items.filter((item) => {
        if (item.requiredRole && !roles.includes(item.requiredRole)) return false;
        if (item.requiredPermission && !permissions.includes(item.requiredPermission)) return false;
        return true;
    });
}

function filterNavGroups(
    groups: NavGroup[],
    roles: string[],
    permissions: string[],
): NavGroup[] {
    return groups
        .map((group) => ({
            ...group,
            items: filterNavItems(group.items, roles, permissions),
        }))
        .filter((group) => group.items.length > 0);
}

// Storage key for section open states
const NAV_SECTIONS_KEY = 'nav-sections-state';

function getStoredSections(): Record<string, boolean> {
    if (typeof window === 'undefined') return {};
    try {
        const stored = localStorage.getItem(NAV_SECTIONS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function storeSectionState(title: string, isOpen: boolean) {
    if (typeof window === 'undefined') return;
    try {
        const current = getStoredSections();
        current[title] = isOpen;
        localStorage.setItem(NAV_SECTIONS_KEY, JSON.stringify(current));
    } catch {
        // Ignore storage errors
    }
}

interface NavSectionProps {
    group: NavGroup;
    index: number;
}

function NavSection({ group, index }: NavSectionProps) {
    const page = usePage();
    const { state: sidebarState } = useSidebar();
    const isCollapsed = sidebarState === 'collapsed';

    const hasActiveItem = group.items.some(
        (item) =>
            page.url === resolveUrl(item.href) ||
            page.url.startsWith(resolveUrl(item.href) + '/'),
    );

    const [isOpen, setIsOpen] = React.useState(() => {
        const stored = getStoredSections();
        if (stored[group.title] !== undefined) return stored[group.title];
        return hasActiveItem || index < 2;
    });

    React.useEffect(() => {
        if (hasActiveItem && !isOpen) {
            setIsOpen(true);
        }
    }, [hasActiveItem]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        storeSectionState(group.title, open);
    };

    // Collapsed mode — icon-only with separator between groups
    if (isCollapsed) {
        return (
            <SidebarGroup className="px-2 py-0">
                {index > 0 && (
                    <div className="mx-auto my-1.5 h-px w-4 bg-sidebar-border/50" />
                )}
                <SidebarMenu className="gap-0.5">
                    {group.items.map((item) => {
                        const isActive =
                            page.url === resolveUrl(item.href) ||
                            page.url.startsWith(resolveUrl(item.href) + '/');

                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                    tooltip={{ children: item.title }}
                                    className={cn(
                                        'h-8 transition-colors duration-150',
                                        isActive
                                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                            : 'text-muted-foreground hover:text-sidebar-foreground',
                                    )}
                                >
                                    <Link href={item.href} prefetch>
                                        {item.icon && (
                                            <item.icon
                                                className={cn(
                                                    'size-4 shrink-0',
                                                    isActive
                                                        ? 'text-sidebar-accent-foreground'
                                                        : 'text-muted-foreground/70',
                                                )}
                                            />
                                        )}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroup>
        );
    }

    // Expanded mode — collapsible sections
    return (
        <Collapsible.Root
            open={isOpen}
            onOpenChange={handleOpenChange}
            className="group/section"
        >
            <SidebarGroup className="px-2 py-0">
                {/* Section header */}
                <Collapsible.Trigger asChild>
                    <button
                        className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors duration-150',
                            'text-muted-foreground/60 hover:text-muted-foreground',
                            index > 0 && 'mt-4',
                        )}
                    >
                        <span className="flex-1 text-left">{group.title}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground/40">
                            {group.items.length}
                        </span>
                        <ChevronRight
                            className={cn(
                                'size-3 shrink-0 text-muted-foreground/40 transition-transform duration-200',
                                isOpen && 'rotate-90',
                            )}
                        />
                    </button>
                </Collapsible.Trigger>

                {/* Section content */}
                <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <SidebarGroupContent className="mt-0.5">
                        <SidebarMenu className="gap-0.5">
                            {group.items.map((item) => {
                                const isActive =
                                    page.url === resolveUrl(item.href) ||
                                    page.url.startsWith(
                                        resolveUrl(item.href) + '/',
                                    );

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        {item.subGroupLabel && (
                                            <div className="px-2 pb-0.5 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 first:pt-0">
                                                {item.subGroupLabel}
                                            </div>
                                        )}
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            className={cn(
                                                'h-8 transition-colors duration-150',
                                                isActive
                                                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                                    : 'text-muted-foreground hover:text-sidebar-foreground',
                                            )}
                                        >
                                            <Link
                                                href={item.href}
                                                prefetch
                                            >
                                                {item.icon && (
                                                    <item.icon
                                                        className={cn(
                                                            'size-4 shrink-0',
                                                            isActive
                                                                ? 'text-sidebar-accent-foreground'
                                                                : 'text-muted-foreground/70',
                                                        )}
                                                    />
                                                )}
                                                <span className="truncate">
                                                    {item.title}
                                                </span>
                                                {item.badge && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="ml-auto h-5 rounded px-1.5 text-[10px] font-medium"
                                                    >
                                                        {item.badge}
                                                    </Badge>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </Collapsible.Content>
            </SidebarGroup>
        </Collapsible.Root>
    );
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
    const { auth } = usePage<{
        auth: { roles: string[]; permissions: string[] };
    }>().props;

    const filteredGroups = filterNavGroups(
        groups,
        auth.roles ?? [],
        auth.permissions ?? [],
    );

    return (
        <div className="flex flex-col">
            {filteredGroups.map((group, index) => (
                <NavSection key={group.title} group={group} index={index} />
            ))}
        </div>
    );
}
