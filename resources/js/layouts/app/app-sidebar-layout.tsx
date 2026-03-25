import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { GlobalSearch } from '@/components/GlobalSearch';
import { PageTransition } from '@/components/ui/page-transition';
import { Toaster } from '@/components/ui/toaster';
import { useFlashMessages } from '@/hooks/use-flash-messages';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    useFlashMessages(); // Handle flash messages from Laravel

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <PageTransition>
                    {children}
                </PageTransition>
            </AppContent>
            <GlobalSearch />
            <Toaster />
        </AppShell>
    );
}
