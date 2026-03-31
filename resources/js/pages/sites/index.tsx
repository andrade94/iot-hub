import { Can } from '@/components/Can';
import InputError from '@/components/input-error';
import { type SiteRow, getSiteColumns } from '@/components/sites/columns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ContentWithSidebar } from '@/components/ui/content-with-sidebar';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import type { FilterPill } from '@/components/ui/filter-toolbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import { TimeInput } from '@/components/ui/time-input';
import type { BreadcrumbItem, SharedData } from '@/types';
import { siteSchema } from '@/utils/schemas';
import { Head, router, usePage } from '@inertiajs/react';
import { MapPin, Plus, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface Props {
    sites: SiteRow[];
    timezones: string[];
}

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    onboarding: 'Onboarding',
    inactive: 'Inactive',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Sites', href: '/sites' },
];

export default function SiteIndex({ sites, timezones }: Props) {
    const { t } = useLang();
    const { auth, all_organizations } = usePage<SharedData>().props;
    const [showCreate, setShowCreate] = useState(false);

    // Determine if user is super_admin (sees multiple orgs)
    const isSuperAdmin = auth.roles?.includes('super_admin');
    const organizations = (all_organizations ?? []) as { id: number; name: string; slug: string }[];

    // Client-side filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [orgFilter, setOrgFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter sidebar visibility with localStorage persistence
    const [showFilters, setShowFilters] = useState(() => {
        try {
            return localStorage.getItem('sites-show-filters') === 'true';
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('sites-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    // Client-side filtering
    const filteredSites = useMemo(() => {
        let result = sites;

        if (statusFilter !== 'all') {
            result = result.filter((site) => site.status === statusFilter);
        }

        if (orgFilter !== 'all') {
            const orgName = organizations.find((o) => String(o.id) === orgFilter)?.name;
            if (orgName) {
                result = result.filter((site) => site.organization_name === orgName);
            }
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter((site) => site.name.toLowerCase().includes(query));
        }

        return result;
    }, [sites, statusFilter, orgFilter, searchQuery, organizations]);

    const hasFilters = statusFilter !== 'all' || orgFilter !== 'all' || searchQuery.trim() !== '';

    function clearAllFilters() {
        setStatusFilter('all');
        setOrgFilter('all');
        setSearchQuery('');
    }

    // Build filter pills
    const filterPills = useMemo<FilterPill[]>(() => {
        const pills: FilterPill[] = [];
        if (statusFilter !== 'all') {
            pills.push({
                key: 'status',
                label: `Status: ${STATUS_LABELS[statusFilter] ?? statusFilter}`,
                onRemove: () => setStatusFilter('all'),
            });
        }
        if (orgFilter !== 'all') {
            const orgName = organizations.find((o) => String(o.id) === orgFilter)?.name ?? orgFilter;
            pills.push({
                key: 'org',
                label: `Org: ${orgName}`,
                onRemove: () => setOrgFilter('all'),
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
    }, [statusFilter, orgFilter, searchQuery, organizations]);

    // Column definitions (memoized)
    const columns = useMemo(() => getSiteColumns({ t }), [t]);

    // Row click handler
    const handleRowClick = useCallback((site: SiteRow) => {
        router.get(`/sites/${site.id}`);
    }, []);

    // Empty state
    const emptyStateNode = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<MapPin className="h-5 w-5 text-muted-foreground" />}
            title={
                hasFilters
                    ? t('No sites match these filters')
                    : t('No sites accessible')
            }
            description={
                hasFilters
                    ? t('Try adjusting your filters to see more results')
                    : t('Create your first site to get started')
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
                        {t('Status')}
                    </Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Status')}</SelectItem>
                            <SelectItem value="active">{t('Active')}</SelectItem>
                            <SelectItem value="onboarding">{t('Onboarding')}</SelectItem>
                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {isSuperAdmin && organizations.length > 0 && (
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                            {t('Organization')}
                        </Label>
                        <Select value={orgFilter} onValueChange={setOrgFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('Organization')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Organizations')}</SelectItem>
                                {organizations.map((org) => (
                                    <SelectItem key={org.id} value={String(org.id)}>
                                        {org.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Search')}
                    </Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Site name...')}
                            className="pl-8"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Sites')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header ------------------------------------------------ */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Sites')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Site Catalog')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums font-medium text-foreground">{sites.length}</span>{' '}
                                    {t('sites accessible')}
                                </p>
                            </div>
                            <Can permission="manage sites">
                                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('Create Site')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>{t('Create Site')}</DialogTitle>
                                        </DialogHeader>
                                        <CreateSiteForm
                                            timezones={timezones}
                                            onSuccess={() => setShowCreate(false)}
                                        />
                                    </DialogContent>
                                </Dialog>
                            </Can>
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
                                data={filteredSites}
                                getRowId={(row) => String(row.id)}
                                onRowClick={handleRowClick}
                                bordered={false}
                                emptyState={emptyStateNode}
                            />
                        </Card>
                    </ContentWithSidebar>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

/* -- Create Site Form --------------------------------------------------- */

function CreateSiteForm({
    timezones,
    onSuccess,
}: {
    timezones: string[];
    onSuccess: () => void;
}) {
    const { t } = useLang();

    const form = useValidatedForm(siteSchema, {
        name: '',
        address: '',
        latitude: '' as string | number,
        longitude: '' as string | number,
        timezone: '',
        opening_hour: '',
        status: 'draft',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.validate()) return;
        form.post('/settings/sites', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onSuccess();
            },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>{t('Name')}</Label>
                <Input
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder={t('Site name')}
                    required
                />
                <InputError message={form.errors.name} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Address')}</Label>
                <Input
                    value={form.data.address ?? ''}
                    onChange={(e) => form.setData('address', e.target.value)}
                    placeholder={t('Street address')}
                />
                <InputError message={form.errors.address} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>{t('Timezone')}</Label>
                    <Select value={form.data.timezone} onValueChange={(v) => form.setData('timezone', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('Select timezone')} />
                        </SelectTrigger>
                        <SelectContent>
                            {timezones.map((tz) => (
                                <SelectItem key={tz} value={tz}>
                                    {tz}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.timezone} />
                </div>
                <div className="grid gap-2">
                    <Label>{t('Opening Hour')}</Label>
                    <TimeInput
                        value={form.data.opening_hour ?? ''}
                        onChange={(v) => form.setData('opening_hour', v)}
                    />
                    <InputError message={form.errors.opening_hour} />
                </div>
            </div>

            <DialogFooter>
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? t('Creating...') : t('Create Site')}
                </Button>
            </DialogFooter>
        </form>
    );
}

/* -- Skeleton --------------------------------------------------------- */

export function SiteIndexSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-3 h-8 w-36" />
                <Skeleton className="mt-2 h-4 w-28" />
            </div>
            {/* Filter Toolbar */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
            </div>
            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Array.from({ length: 9 }).map((_, i) => (
                                <TableHead key={i}>
                                    <Skeleton className="h-3 w-16" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-3 w-28" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
