import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ContentWithSidebar } from '@/components/ui/content-with-sidebar';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import type { FilterPill } from '@/components/ui/filter-toolbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Gateway, Site } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Info, Radio, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface GatewayWithSite extends Gateway {
    site?: Pick<Site, 'id' | 'name'>;
    devices_count: number;
}

interface PaginatedGateways {
    data: GatewayWithSite[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    gateways: PaginatedGateways;
}

const STATUS_LABELS: Record<string, string> = {
    online: 'Online',
    offline: 'Offline',
    registered: 'Registered',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Gateways', href: '/settings/gateways' },
];

function GatewayStatusBadge({ status }: { status: string }) {
    const v: Record<string, 'success' | 'destructive' | 'outline'> = {
        online: 'success',
        offline: 'destructive',
        registered: 'outline',
    };
    return <Badge variant={v[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}

export default function GatewayGlobalIndex({ gateways }: Props) {
    const { t } = useLang();

    // Client-side filters
    const [siteFilter, setSiteFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter sidebar visibility with localStorage persistence
    const [showFilters, setShowFilters] = useState(() => {
        try {
            return localStorage.getItem('gateways-show-filters') === 'true';
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('gateways-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    // Extract unique site names from current page data
    const siteOptions = useMemo(() => {
        const sites = new Map<string, string>();
        for (const gw of gateways.data) {
            if (gw.site?.name) {
                sites.set(gw.site.name, gw.site.name);
            }
        }
        return Array.from(sites.values()).sort();
    }, [gateways.data]);

    // Client-side filtering on current page data
    const filteredGateways = useMemo(() => {
        let result = gateways.data;

        if (siteFilter !== 'all') {
            result = result.filter((gw) => gw.site?.name === siteFilter);
        }

        if (statusFilter !== 'all') {
            result = result.filter((gw) => gw.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(
                (gw) =>
                    gw.model.toLowerCase().includes(query) ||
                    gw.serial.toLowerCase().includes(query),
            );
        }

        return result;
    }, [gateways.data, siteFilter, statusFilter, searchQuery]);

    const hasFilters = siteFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';

    function clearAllFilters() {
        setSiteFilter('all');
        setStatusFilter('all');
        setSearchQuery('');
    }

    // Build filter pills
    const filterPills = useMemo<FilterPill[]>(() => {
        const pills: FilterPill[] = [];
        if (siteFilter !== 'all') {
            pills.push({
                key: 'site',
                label: `Site: ${siteFilter}`,
                onRemove: () => setSiteFilter('all'),
            });
        }
        if (statusFilter !== 'all') {
            pills.push({
                key: 'status',
                label: `Status: ${STATUS_LABELS[statusFilter] ?? statusFilter}`,
                onRemove: () => setStatusFilter('all'),
            });
        }
        if (searchQuery.trim()) {
            pills.push({
                key: 'search',
                label: `Search: "${searchQuery}"`,
                onRemove: () => setSearchQuery(''),
            });
        }
        return pills;
    }, [siteFilter, statusFilter, searchQuery]);

    // Column definitions (memoized)
    const columns = useMemo<ColumnDef<GatewayWithSite>[]>(() => [
        {
            accessorKey: 'model',
            header: t('Model'),
            cell: ({ row }) => <span className="font-medium">{row.original.model}</span>,
        },
        {
            accessorKey: 'serial',
            header: t('Serial'),
            cell: ({ row }) => <span className="font-mono text-xs">{row.original.serial}</span>,
        },
        {
            id: 'site',
            header: t('Site'),
            cell: ({ row }) => row.original.site?.name ?? '\u2014',
        },
        {
            id: 'devices',
            header: t('Devices'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{row.original.devices_count}</span>
            ),
        },
        {
            accessorKey: 'status',
            header: t('Status'),
            cell: ({ row }) => <GatewayStatusBadge status={row.original.status} />,
        },
        {
            id: 'type',
            header: t('Type'),
            cell: ({ row }) => (
                <Badge variant={row.original.is_addon ? 'outline' : 'secondary'} className="text-xs">
                    {row.original.is_addon ? t('Add-on') : t('Primary')}
                </Badge>
            ),
        },
    ], [t]);

    // Row click handler
    const handleRowClick = useCallback((gw: GatewayWithSite) => {
        if (gw.site) {
            router.get(`/sites/${gw.site.id}/gateways/${gw.id}`);
        }
    }, []);

    // Empty state
    const emptyStateNode = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<Radio className="h-5 w-5 text-muted-foreground" />}
            title={
                hasFilters
                    ? t('No gateways match these filters')
                    : t('No gateways found')
            }
            description={
                hasFilters
                    ? t('Try adjusting your filters to see more results')
                    : t('Register gateways during site onboarding')
            }
            action={
                hasFilters ? (
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                        {t('Clear filters')}
                    </Button>
                ) : undefined
            }
        />
    );

    // Filter sidebar
    const filterSidebar = (
        <Card className="shadow-elevation-1">
            <CardContent className="flex flex-col gap-4 p-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Site')}
                    </Label>
                    <Select value={siteFilter} onValueChange={setSiteFilter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Site')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Sites')}</SelectItem>
                            {siteOptions.map((site) => (
                                <SelectItem key={site} value={site}>
                                    {site}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Status')}
                    </Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Status')}</SelectItem>
                            <SelectItem value="online">{t('Online')}</SelectItem>
                            <SelectItem value="offline">{t('Offline')}</SelectItem>
                            <SelectItem value="registered">{t('Registered')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Search')}
                    </Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Model or serial...')}
                            className="pl-8"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Gateways')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header -------------------------------------------------- */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative p-6 md:p-8">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Infrastructure')}
                            </p>
                            <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                {t('Gateways')}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                <span className="font-mono font-medium text-foreground">{gateways.total}</span>{' '}
                                {t('gateways across all sites')}
                            </p>
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Info className="h-3.5 w-3.5 shrink-0" />
                                {t('Gateways are managed per site.')}{' '}
                                <Link href="/sites" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                                    {t('View Sites')}
                                </Link>
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* -- FilterToolbar + ContentWithSidebar ---------------------- */}
                <FadeIn delay={75} duration={400}>
                    <FilterToolbar
                        showSidebar={showFilters}
                        onToggleSidebar={toggleFilters}
                        pills={filterPills}
                        onClearAll={hasFilters ? clearAllFilters : undefined}
                    />
                </FadeIn>

                <FadeIn delay={150} duration={500}>
                    <ContentWithSidebar
                        showSidebar={showFilters}
                        sidebar={filterSidebar}
                    >
                        <Card className="flex-1 shadow-elevation-1">
                            <DataTable
                                columns={columns}
                                data={filteredGateways}
                                bordered={false}
                                onRowClick={handleRowClick}
                                emptyState={emptyStateNode}
                            />

                            {gateways.last_page > 1 && (
                                <div className="flex items-center justify-between border-t px-4 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        {t('Page')}{' '}
                                        <span className="font-mono font-medium tabular-nums text-foreground">
                                            {gateways.current_page}
                                        </span>{' '}
                                        {t('of')}{' '}
                                        <span className="font-mono tabular-nums">{gateways.last_page}</span>
                                    </p>
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="icon-sm" disabled={!gateways.prev_page_url} onClick={() => gateways.prev_page_url && router.get(gateways.prev_page_url, {}, { preserveState: true })}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon-sm" disabled={!gateways.next_page_url} onClick={() => gateways.next_page_url && router.get(gateways.next_page_url, {}, { preserveState: true })}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </ContentWithSidebar>
                </FadeIn>
            </div>
        </AppLayout>
    );
}
