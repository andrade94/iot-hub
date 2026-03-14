import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef } from 'react';
import { Container } from './container';
import { PageHeader } from './page-header';

const pageLayoutVariants = cva('min-h-screen bg-background', {
    variants: {
        spacing: {
            none: '',
            sm: 'py-4',
            md: 'py-6',
            lg: 'py-8',
        },
    },
    defaultVariants: {
        spacing: 'md',
    },
});

export interface PageLayoutProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof pageLayoutVariants> {
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    containerSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    headerVariant?: 'default' | 'ghost';
}

const PageLayout = forwardRef<HTMLDivElement, PageLayoutProps>(
    ({
        className,
        spacing,
        title,
        description,
        actions,
        breadcrumbs,
        containerSize = 'lg',
        headerVariant = 'default',
        children,
        ...props
    }, ref) => {
        return (
            <div
                className={cn(pageLayoutVariants({ spacing }), className)}
                ref={ref}
                {...props}
            >
                {breadcrumbs}
                {(title || description || actions) && (
                    <PageHeader
                        title={title}
                        description={description}
                        actions={actions}
                        variant={headerVariant}
                    />
                )}
                <Container size={containerSize} className="flex-1">
                    {children}
                </Container>
            </div>
        );
    }
);
PageLayout.displayName = 'PageLayout';

export interface ListPageLayoutProps extends Omit<PageLayoutProps, 'children'> {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    filters?: React.ReactNode;
}

const ListPageLayout = forwardRef<HTMLDivElement, ListPageLayoutProps>(
    ({ sidebar, filters, children, ...props }, ref) => {
        return (
            <PageLayout ref={ref} {...props}>
                <div className="flex flex-col space-y-6 lg:flex-row lg:space-x-6 lg:space-y-0">
                    {sidebar && (
                        <aside className="w-full lg:w-64">
                            {sidebar}
                        </aside>
                    )}
                    <main className="flex-1 space-y-6">
                        {filters && (
                            <div className="rounded-lg border bg-card p-4">
                                {filters}
                            </div>
                        )}
                        {children}
                    </main>
                </div>
            </PageLayout>
        );
    }
);
ListPageLayout.displayName = 'ListPageLayout';

export interface DetailPageLayoutProps extends Omit<PageLayoutProps, 'children'> {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    tabs?: React.ReactNode;
}

const DetailPageLayout = forwardRef<HTMLDivElement, DetailPageLayoutProps>(
    ({ sidebar, tabs, children, ...props }, ref) => {
        return (
            <PageLayout ref={ref} {...props}>
                {tabs && (
                    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <Container size={props.containerSize}>
                            {tabs}
                        </Container>
                    </div>
                )}
                <div className="flex flex-col space-y-6 lg:flex-row lg:space-x-6 lg:space-y-0">
                    <main className={cn('flex-1', sidebar ? 'lg:w-2/3' : 'w-full')}>
                        {children}
                    </main>
                    {sidebar && (
                        <aside className="w-full lg:w-1/3">
                            <div className="space-y-6">
                                {sidebar}
                            </div>
                        </aside>
                    )}
                </div>
            </PageLayout>
        );
    }
);
DetailPageLayout.displayName = 'DetailPageLayout';

export interface FormPageLayoutProps extends Omit<PageLayoutProps, 'children'> {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const FormPageLayout = forwardRef<HTMLDivElement, FormPageLayoutProps>(
    ({ sidebar, maxWidth = 'lg', children, ...props }, ref) => {
        const containerSize = maxWidth === 'full' ? 'full' : maxWidth;
        
        return (
            <PageLayout ref={ref} containerSize={containerSize} {...props}>
                <div className="flex flex-col space-y-6 lg:flex-row lg:space-x-6 lg:space-y-0">
                    <main className={cn('flex-1', sidebar ? 'lg:w-2/3' : 'w-full')}>
                        <div className={cn(
                            'mx-auto',
                            maxWidth === 'sm' && 'max-w-md',
                            maxWidth === 'md' && 'max-w-lg',
                            maxWidth === 'lg' && 'max-w-2xl',
                            maxWidth === 'xl' && 'max-w-4xl',
                            maxWidth === '2xl' && 'max-w-6xl',
                            maxWidth === 'full' && 'max-w-full'
                        )}>
                            {children}
                        </div>
                    </main>
                    {sidebar && (
                        <aside className="w-full lg:w-1/3">
                            {sidebar}
                        </aside>
                    )}
                </div>
            </PageLayout>
        );
    }
);
FormPageLayout.displayName = 'FormPageLayout';

export { PageLayout, ListPageLayout, DetailPageLayout, FormPageLayout };