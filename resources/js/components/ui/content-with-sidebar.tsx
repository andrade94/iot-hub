import { cn } from '@/lib/utils';

interface ContentWithSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    showSidebar: boolean;
    sidebar: React.ReactNode;
    sidebarWidth?: string;
}

function ContentWithSidebar({
    showSidebar,
    sidebar,
    sidebarWidth = '260px',
    className,
    children,
    ...props
}: ContentWithSidebarProps) {
    return (
        <div
            className={cn(
                'grid gap-4 transition-all duration-200',
                showSidebar ? `lg:grid-cols-[${sidebarWidth}_1fr]` : 'lg:grid-cols-1',
                className,
            )}
            style={showSidebar ? { gridTemplateColumns: `${sidebarWidth} 1fr` } : undefined}
            {...props}
        >
            {showSidebar && (
                <aside className="animate-in fade-in slide-in-from-left-2 duration-200">
                    {sidebar}
                </aside>
            )}
            <main className="min-w-0">{children}</main>
        </div>
    );
}

export { ContentWithSidebar };
export type { ContentWithSidebarProps };
