/**
 * NavMain Component
 *
 * Premium navigation with collapsible dropdown sections.
 * Features smooth animations, visual hierarchy, and refined aesthetics.
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
import { type NavGroup } from '@/types';

// Accent colors for each section (light and dark mode compatible)
const sectionAccents: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    'Overview': {
        color: 'text-sky-600 dark:text-sky-400',
        bgColor: 'bg-sky-500/10',
        borderColor: 'border-sky-500/30 dark:border-sky-500/20',
    },
    'Manage': {
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30 dark:border-emerald-500/20',
    },
    'Examples': {
        color: 'text-violet-600 dark:text-violet-400',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/30 dark:border-violet-500/20',
    },
    'Account': {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30 dark:border-amber-500/20',
    },
};

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

    // Check if any item in this group is active
    const hasActiveItem = group.items.some(
        (item) => page.url === resolveUrl(item.href) || page.url.startsWith(resolveUrl(item.href) + '/')
    );

    // Initialize open state - open by default if has active item or stored state
    const [isOpen, setIsOpen] = React.useState(() => {
        const stored = getStoredSections();
        if (stored[group.title] !== undefined) return stored[group.title];
        return hasActiveItem || index < 2; // First two sections open by default
    });

    // Update open state when stored state changes
    React.useEffect(() => {
        if (hasActiveItem && !isOpen) {
            setIsOpen(true);
        }
    }, [hasActiveItem]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        storeSectionState(group.title, open);
    };

    const accent = sectionAccents[group.title] || sectionAccents['Overview'];

    // In collapsed mode, just show icons
    if (isCollapsed) {
        return (
            <SidebarGroup className="px-2 py-1">
                <SidebarMenu>
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
                                        'transition-all duration-200',
                                        isActive && accent.bgColor
                                    )}
                                >
                                    <Link href={item.href} prefetch>
                                        {item.icon && (
                                            <item.icon
                                                className={cn(
                                                    'h-4 w-4 transition-colors duration-200',
                                                    isActive ? accent.color : 'text-muted-foreground'
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

    return (
        <Collapsible.Root open={isOpen} onOpenChange={handleOpenChange} className="group/section">
            <SidebarGroup className="px-2 py-1">
                {/* Section Header */}
                <Collapsible.Trigger asChild>
                    <button
                        className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200',
                            'text-muted-foreground/70 hover:text-foreground',
                            'hover:bg-muted/50',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                            hasActiveItem && 'text-foreground'
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {/* Animated accent line */}
                        <span
                            className={cn(
                                'h-4 w-0.5 rounded-full transition-all duration-300',
                                isOpen ? accent.color.replace('text-', 'bg-') : 'bg-muted-foreground/30',
                                hasActiveItem && accent.color.replace('text-', 'bg-')
                            )}
                        />
                        <span className="flex-1 text-left">{group.title}</span>
                        {/* Item count badge */}
                        <span
                            className={cn(
                                'flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[10px] font-medium tabular-nums transition-all duration-200',
                                isOpen
                                    ? cn(accent.bgColor, accent.color)
                                    : 'bg-muted/50 text-muted-foreground'
                            )}
                        >
                            {group.items.length}
                        </span>
                        {/* Chevron */}
                        <ChevronRight
                            className={cn(
                                'h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-300 ease-out',
                                isOpen && 'rotate-90'
                            )}
                        />
                    </button>
                </Collapsible.Trigger>

                {/* Section Content */}
                <Collapsible.Content
                    className={cn(
                        'overflow-hidden',
                        'data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up'
                    )}
                >
                    <SidebarGroupContent className="mt-1">
                        <SidebarMenu className="relative pl-3">
                            {/* Vertical connector line */}
                            <div
                                className={cn(
                                    'absolute left-[1.125rem] top-1 bottom-1 w-px transition-colors duration-300',
                                    accent.bgColor.replace('/10', '/20')
                                )}
                            />

                            {group.items.map((item, itemIndex) => {
                                const isActive =
                                    page.url === resolveUrl(item.href) ||
                                    page.url.startsWith(resolveUrl(item.href) + '/');

                                return (
                                    <SidebarMenuItem
                                        key={item.title}
                                        className="relative"
                                        style={{ animationDelay: `${(index * 50) + (itemIndex * 30)}ms` }}
                                    >
                                        {/* Horizontal connector */}
                                        <div
                                            className={cn(
                                                'absolute left-0 top-1/2 h-px w-2 -translate-y-1/2 transition-colors duration-200',
                                                isActive
                                                    ? accent.color.replace('text-', 'bg-')
                                                    : accent.bgColor.replace('/10', '/20')
                                            )}
                                        />

                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            className={cn(
                                                'relative ml-3 transition-all duration-200',
                                                'hover:translate-x-0.5',
                                                isActive && [
                                                    accent.bgColor,
                                                    'shadow-sm',
                                                    `border-l-2 ${accent.borderColor.replace('/20', '')}`,
                                                ]
                                            )}
                                        >
                                            <Link href={item.href} prefetch className="group/item">
                                                {item.icon && (
                                                    <span
                                                        className={cn(
                                                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-200',
                                                            isActive
                                                                ? cn(accent.bgColor, accent.color)
                                                                : 'bg-muted/50 text-muted-foreground group-hover/item:bg-muted group-hover/item:text-foreground'
                                                        )}
                                                    >
                                                        <item.icon className="h-3.5 w-3.5" />
                                                    </span>
                                                )}
                                                <span
                                                    className={cn(
                                                        'flex-1 truncate transition-colors duration-200',
                                                        isActive ? 'font-medium' : 'text-muted-foreground group-hover/item:text-foreground'
                                                    )}
                                                >
                                                    {item.title}
                                                </span>
                                                {item.badge && (
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn(
                                                            'ml-auto h-5 px-1.5 text-[10px] font-medium',
                                                            accent.bgColor,
                                                            accent.color
                                                        )}
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
    return (
        <div className="flex flex-col gap-1 stagger-item" style={{ animationDelay: '100ms' }}>
            {groups.map((group, index) => (
                <NavSection key={group.title} group={group} index={index} />
            ))}
        </div>
    );
}
