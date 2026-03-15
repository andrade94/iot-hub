import { Badge } from '@/components/ui/badge';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { MapPin, Radio } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    onboarding: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    inactive: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function Dashboard() {
    const { t } = useLang();
    const { current_organization, accessible_sites } = usePage<SharedData>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Dashboard')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                {/* Welcome */}
                <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 dark:border-sidebar-border">
                    <h1 className="text-2xl font-bold">
                        {t('Welcome')}
                        {current_organization ? ` — ${current_organization.name}` : ''}
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        {accessible_sites.length > 0
                            ? t(':count sites accessible', { count: accessible_sites.length })
                            : t('No sites configured yet')}
                    </p>
                </div>

                {/* Site cards */}
                {accessible_sites.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {accessible_sites.map((site) => (
                            <div
                                key={site.id}
                                className="flex flex-col gap-3 rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-semibold">{site.name}</h3>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className={statusColors[site.status] ?? statusColors.inactive}
                                    >
                                        {site.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Radio className="h-3.5 w-3.5" />
                                    <span>{t('No sensors configured')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-sidebar-border/70 p-12 dark:border-sidebar-border">
                        <div className="text-center">
                            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50" />
                            <p className="mt-3 text-muted-foreground">{t('No sites configured yet')}</p>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
