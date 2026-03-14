/**
 * AppSidebar Component
 *
 * Main application sidebar with premium navigation design.
 * Features collapsible sections, refined aesthetics, and smooth animations.
 */

import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { navigation } from '@/config/navigation';
import { dashboard } from '@/routes';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder } from 'lucide-react';
import AppLogo from './app-logo';

const footerNavItems = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="floating">
            {/* Header with Logo */}
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="group/logo relative overflow-hidden transition-all duration-300 hover:bg-muted/50"
                        >
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator className="mx-2" />

            {/* Main Navigation */}
            <SidebarContent className="scrollbar-thin">
                <NavMain groups={navigation} />
            </SidebarContent>

            <SidebarSeparator className="mx-2" />

            {/* Footer */}
            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
