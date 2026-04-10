import { Can } from '@/components/Can';
import { getDeviceColumns } from '@/components/devices/columns';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device, Site } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Cpu, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface PaginatedDevices {
    data: Device[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    devices: PaginatedDevices;
    sites: Pick<Site, 'id' | 'name'>[];
    models?: string[];
    filters: { status?: string; site_id?: string; model?: string; search?: string; sort?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Devices', href: '/devices' },
];

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
};

export default function DeviceIndex({ devices, sites, models = [], filters }: Props) {
    const { t } = useLang();
    const [search, setSearch] = useState(filters.search ?? '');
    const [showFilters, setShowFilters] = useState(() => {
        try {
            const stored = localStorage.getItem('devices-show-filters');
            return stored === 'true';
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('devices-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    function applyFilter(key: string, value: string | undefined) {
        const params: Record<string, string> = { ...filters };
        if (value && value !== 'all') params[key] = value;
        else delete params[key];
        router.get('/devices', params, { preserveState: true, replace: true });
    }

    function submitSearch() {
        const params: Record<string, string> = { ...filters };
        if (search) params.search = search;
        else delete params.search;
        router.get('/devices', params, { preserveState: true, replace: true });
    }

    function clearAllFilters() {
        setSearch('');
        router.get('/devices', {}, { preserveState: true, replace: true });
    }

    const columns = useMemo(() => getDeviceColumns(), []);
    const hasFilters = !!(filters.status || filters.site_id || filters.model || filters.search);

    // Build filter pills
    const filterPills = useMemo<FilterPill[]>(() => {
        const pills: FilterPill[] = [];
        if (filters.site_id) {
            const site = sites.find((s) => String(s.id) === filters.site_id);
            pills.push({
                key: 'site_id',
                label: `Site: ${site?.name ?? filters.site_id}`,
                onRemove: () => applyFilter('site_id', undefined),
            });
        }
        if (filters.status) {
            pills.push({
                key: 'status',
                label: `Status: ${STATUS_LABELS[filters.status] ?? filters.status}`,
                onRemove: () => applyFilter('status', undefined),
            });
        }
        if (filters.model) {
            pills.push({
                key: 'model',
                label: `Model: ${filters.model}`,
                onRemove: () => applyFilter('model', undefined),
            });
        }
        if (filters.search) {
            pills.push({
                key: 'search',
                label: `Search: "${filters.search}"`,
                onRemove: () => {
                    setSearch('');
                    const params: Record<string, string> = { ...filters };
                    delete params.search;
                    router.get('/devices', params, { preserveState: true, replace: true });
                },
            });
        }
        return pills;
    }, [filters, sites]);

    const emptyState = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<Cpu className="h-5 w-5 text-muted-foreground" />}
            title={
                hasFilters
                    ? t('No devices match these filters')
                    : t('No devices yet')
            }
            description={
                hasFilters
                    ? t('Try adjusting your filters')
                    : t('Add devices to your sites to start monitoring')
            }
            action={
                hasFilters ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.get('/devices', {}, { preserveState: true, replace: true })}
                    >
                        {t('Clear filters')}
                    </Button>
                ) : undefined
            }
        />
    );

    // Sidebar filter panel
    const filterSidebar = (
        <Card className="shadow-elevation-1">
            <CardContent className="flex flex-col gap-4 p-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Site')}
                    </Label>
                    <Select value={filters.site_id ?? 'all'} onValueChange={(v) => applyFilter('site_id', v)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Site')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Sites')}</SelectItem>
                            {sites.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Status')}
                    </Label>
                    <Select value={filters.status ?? 'all'} onValueChange={(v) => applyFilter('status', v)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Status')}</SelectItem>
                            <SelectItem value="active">{t('Active')}</SelectItem>
                            <SelectItem value="offline">{t('Offline')}</SelectItem>
                            <SelectItem value="pending">{t('Pending')}</SelectItem>
                            <SelectItem value="maintenance">{t('Maintenance')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Model')}
                    </Label>
                    <Select value={filters.model ?? 'all'} onValueChange={(v) => applyFilter('model', v)}>
                        <SelectTrigger className="w-full font-mono">
                            <SelectValue placeholder={t('All Models')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Models')}</SelectItem>
                            {models.map((m) => (
                                <SelectItem key={m} value={m}><span className="font-mono">{m}</span></SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Search')}
                    </Label>
                    <form onSubmit={(e) => { e.preventDefault(); submitSearch(); }}>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="w-full pl-8"
                                placeholder={t('Search name, EUI...')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="secondary" size="sm" type="submit" className="mt-2 w-full">
                            {t('Search')}
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Devices')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header ------------------------------------------------ */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Monitor')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Devices')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium text-foreground">{devices.total}</span>{' '}
                                    {t('devices across all sites')}
                                </p>
                            </div>
                            <Can permission="manage devices">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0}>
                                            <Button disabled>
                                                <Plus className="mr-2 h-4 w-4" />
                                                {t('Register Device')}
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {t('Register devices via site management')}
                                    </TooltipContent>
                                </Tooltip>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* -- FilterToolbar + ContentWithSidebar ------------------ */}
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
                                data={devices.data}
                                bordered={false}
                                onRowClick={(device) => router.get(`/devices/${device.id}`)}
                                rowClassName={() => 'transition-colors hover:bg-muted/50'}
                                emptyState={emptyState}
                                noResultsMessage={t('No devices found')}
                            />

                            {devices.last_page > 1 && (
                                <div className="flex items-center justify-between border-t px-4 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        {t('Page')}{' '}
                                        <span className="font-mono font-medium tabular-nums text-foreground">{devices.current_page}</span>{' '}
                                        {t('of')}{' '}
                                        <span className="font-mono tabular-nums">{devices.last_page}</span>
                                    </p>
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="icon-sm" disabled={!devices.prev_page_url} onClick={() => devices.prev_page_url && router.get(devices.prev_page_url, {}, { preserveState: true })}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon-sm" disabled={!devices.next_page_url} onClick={() => devices.next_page_url && router.get(devices.next_page_url, {}, { preserveState: true })}>
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

export function DeviceIndexSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-8 w-28" />
                <Skeleton className="mt-2 h-4 w-40" />
            </div>
            {/* Filters */}
            <div>
                <div className="mb-2 flex items-center gap-3">
                    <Skeleton className="h-3 w-14" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <div className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <Skeleton className="h-3.5 w-3.5" />
                        <Skeleton className="h-9 w-[180px]" />
                        <Skeleton className="h-9 w-[140px]" />
                        <Skeleton className="h-9 w-[200px]" />
                        <Skeleton className="h-9 w-16" />
                    </div>
                </div>
            </div>
            {/* Table */}
            <div className="rounded-xl border">
                <div className="space-y-0">
                    <div className="flex gap-4 border-b px-4 py-3">
                        {['w-24', 'w-16', 'w-16', 'w-12', 'w-14', 'w-16', 'w-20'].map((w, i) => (
                            <Skeleton key={i} className={`h-3 ${w}`} />
                        ))}
                    </div>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-14" />
                            <Skeleton className="h-5 w-14 rounded-full" />
                            <Skeleton className="h-4 w-10" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
