import InputError from '@/components/input-error';
import { type OrganizationRow, getOrganizationColumns } from '@/components/organizations/columns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ContentWithSidebar } from '@/components/ui/content-with-sidebar';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import type { FilterPill } from '@/components/ui/filter-toolbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, Plus, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

interface Props {
    organizations: OrganizationRow[];
    segments: string[];
}

const PLANS = ['starter', 'standard', 'enterprise'] as const;

const SEGMENT_LABELS: Record<string, string> = {
    retail: 'Retail',
    cold_chain: 'Cold Chain',
    industrial: 'Industrial',
    commercial: 'Commercial',
    foodservice: 'Foodservice',
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    onboarding: 'Onboarding',
    suspended: 'Suspended',
    archived: 'Archived',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Organizations', href: '#' },
];

export default function OrganizationsIndex({ organizations, segments }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [suspendOrg, setSuspendOrg] = useState<OrganizationRow | null>(null);
    const [archiveOrg, setArchiveOrg] = useState<OrganizationRow | null>(null);
    const [reactivateOrg, setReactivateOrg] = useState<OrganizationRow | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Client-side filters
    const [segmentFilter, setSegmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter sidebar visibility with localStorage persistence
    const [showFilters, setShowFilters] = useState(() => {
        try {
            return localStorage.getItem('orgs-show-filters') === 'true';
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('orgs-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    // Client-side filtering
    const filteredOrgs = useMemo(() => {
        let result = organizations;

        if (segmentFilter !== 'all') {
            result = result.filter((org) => org.segment === segmentFilter);
        }

        if (statusFilter !== 'all') {
            result = result.filter((org) => org.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(
                (org) =>
                    org.name.toLowerCase().includes(query) ||
                    org.slug.toLowerCase().includes(query),
            );
        }

        return result;
    }, [organizations, segmentFilter, statusFilter, searchQuery]);

    const hasFilters = segmentFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';

    function clearAllFilters() {
        setSegmentFilter('all');
        setStatusFilter('all');
        setSearchQuery('');
    }

    // Computed stats
    const stats = useMemo(() => ({
        active: organizations.filter((o) => o.status === 'active').length,
        suspended: organizations.filter((o) => o.status === 'suspended').length,
        totalSites: organizations.reduce((sum, o) => sum + o.sites_count, 0),
        totalDevices: organizations.reduce((sum, o) => sum + o.devices_count, 0),
    }), [organizations]);

    // Build filter pills
    const filterPills = useMemo<FilterPill[]>(() => {
        const pills: FilterPill[] = [];
        if (segmentFilter !== 'all') {
            pills.push({
                key: 'segment',
                label: `Segment: ${SEGMENT_LABELS[segmentFilter] ?? segmentFilter}`,
                onRemove: () => setSegmentFilter('all'),
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
    }, [segmentFilter, statusFilter, searchQuery]);

    // Column definitions (memoized)
    const columns = useMemo(() => getOrganizationColumns({ t }), [t]);

    // Row click handler
    const handleRowClick = useCallback((org: OrganizationRow) => {
        router.get(`/settings/organizations/${org.id}`);
    }, []);

    // Actions
    function handleSuspend() {
        if (!suspendOrg) return;
        setActionLoading(true);
        router.post(`/settings/organizations/${suspendOrg.id}/suspend`, {}, {
            preserveScroll: true,
            onFinish: () => { setActionLoading(false); setSuspendOrg(null); },
        });
    }

    function handleReactivate() {
        if (!reactivateOrg) return;
        setActionLoading(true);
        router.post(`/settings/organizations/${reactivateOrg.id}/reactivate`, {}, {
            preserveScroll: true,
            onFinish: () => { setActionLoading(false); setReactivateOrg(null); },
        });
    }

    function handleArchive() {
        if (!archiveOrg) return;
        setActionLoading(true);
        router.delete(`/settings/organizations/${archiveOrg.id}`, {
            preserveScroll: true,
            onFinish: () => { setActionLoading(false); setArchiveOrg(null); },
        });
    }

    // Empty state
    const emptyStateNode = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
            title={
                hasFilters
                    ? t('No organizations match these filters')
                    : t('No organizations registered')
            }
            description={
                hasFilters
                    ? t('Try adjusting your filters to see more results')
                    : t('Create your first organization to get started')
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
        <Card className="border-border/10 shadow-none">
            <CardContent className="flex flex-col gap-5 p-5">
                <div className="space-y-2">
                    <Label className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        {t('Segment')}
                    </Label>
                    <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                        <SelectTrigger className="w-full border-border/10">
                            <SelectValue placeholder={t('Segment')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Segments')}</SelectItem>
                            {segments.map((seg) => (
                                <SelectItem key={seg} value={seg}>
                                    {seg.replace('_', ' ')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        {t('Status')}
                    </Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full border-border/10">
                            <SelectValue placeholder={t('Status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Status')}</SelectItem>
                            <SelectItem value="active">{t('Active')}</SelectItem>
                            <SelectItem value="onboarding">{t('Onboarding')}</SelectItem>
                            <SelectItem value="suspended">{t('Suspended')}</SelectItem>
                            <SelectItem value="archived">{t('Archived')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        {t('Search')}
                    </Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Name or slug...')}
                            className="border-border/10 pl-8 font-mono text-sm"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Organizations')} />
            <div className="obsidian flex h-full flex-1 flex-col gap-6 bg-background p-5 md:p-8">
                {/* -- Header -------------------------------------------------- */}
                <FadeIn direction="down" duration={400}>
                    <div className="rounded-2xl bg-card px-6 py-8 md:px-10 md:py-10">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                    {t('Platform Administration')}
                                </p>
                                <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                                    {t('Organizations')}
                                </h1>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {t('Manage client entities, subscriptions, and lifecycle status.')}
                                </p>
                            </div>
                            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                <DialogTrigger asChild>
                                    <Button size="lg" className="shrink-0">
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Create Organization')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>{t('Create Organization')}</DialogTitle>
                                    </DialogHeader>
                                    <CreateOrganizationForm segments={segments} onSuccess={() => setShowCreate(false)} />
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* -- KPI Strip ------------------------------------------- */}
                        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                            <KpiCard label={t('Total')} value={organizations.length} />
                            <KpiCard label={t('Active')} value={stats.active} accent="emerald" />
                            <KpiCard label={t('Suspended')} value={stats.suspended} accent="coral" />
                            <KpiCard label={t('Total Sites')} value={stats.totalSites} accent="cyan" />
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
                        <Card className="flex-1 border-border/10 shadow-none">
                            <DataTable
                                columns={columns}
                                data={filteredOrgs}
                                getRowId={(row) => String(row.id)}
                                onRowClick={handleRowClick}
                                bordered={false}
                                emptyState={emptyStateNode}
                            />
                        </Card>
                    </ContentWithSidebar>
                </FadeIn>
            </div>

            {/* -- Suspend Confirmation ---------------------------------------- */}
            <ConfirmationDialog
                open={!!suspendOrg}
                onOpenChange={(open) => !open && setSuspendOrg(null)}
                title={t('Suspend Organization')}
                description={suspendOrg ? `${t('Are you sure you want to suspend')} "${suspendOrg.name}"?` : ''}
                warningMessage={t('Monitoring will continue but users will see a suspension warning. The organization can be reactivated later.')}
                loading={actionLoading}
                onConfirm={handleSuspend}
                actionLabel={t('Suspend')}
            />

            {/* -- Reactivate Confirmation ------------------------------------- */}
            <ConfirmationDialog
                open={!!reactivateOrg}
                onOpenChange={(open) => !open && setReactivateOrg(null)}
                title={t('Reactivate Organization')}
                description={reactivateOrg ? `${t('Are you sure you want to reactivate')} "${reactivateOrg.name}"?` : ''}
                warningMessage={t('The organization will return to active status and all users will regain full access.')}
                loading={actionLoading}
                onConfirm={handleReactivate}
                actionLabel={t('Reactivate')}
            />

            {/* -- Archive Confirmation ---------------------------------------- */}
            <ConfirmationDialog
                open={!!archiveOrg}
                onOpenChange={(open) => !open && setArchiveOrg(null)}
                title={t('Archive Organization')}
                description={archiveOrg ? `${t('Are you sure you want to archive')} "${archiveOrg.name}"?` : ''}
                warningMessage={t('This is a permanent action. Data will be retained for 12 months then deleted. The organization cannot be reactivated.')}
                loading={actionLoading}
                onConfirm={handleArchive}
                actionLabel={t('Archive')}
            />
        </AppLayout>
    );
}

/* -- KPI Card (pure styling, uses obsidian tokens) -------------------- */

const KPI_ACCENTS = {
    emerald: 'border-l-ob-emerald',
    coral: 'border-l-ob-coral',
    cyan: 'border-l-ob-cyan',
    steel: 'border-l-ob-steel',
} as const;

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: keyof typeof KPI_ACCENTS }) {
    return (
        <div className={`rounded-lg bg-accent/40 px-4 py-3.5 ${accent ? `border-l-2 ${KPI_ACCENTS[accent]}` : ''}`}>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {label}
            </p>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                {String(value).padStart(2, '0')}
            </p>
        </div>
    );
}

/* -- Create Organization Form ----------------------------------------- */

const organizationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    segment: z.string().min(1, 'Segment is required'),
    plan: z.string().min(1, 'Plan is required'),
    default_timezone: z.string().min(1, 'Timezone is required'),
    default_opening_hour: z.string().min(1, 'Opening hour is required'),
});

function CreateOrganizationForm({ segments, onSuccess }: { segments: string[]; onSuccess: () => void }) {
    const { t } = useLang();
    const form = useValidatedForm(organizationSchema, {
        name: '',
        slug: '',
        segment: '',
        plan: '',
        default_timezone: 'America/Mexico_City',
        default_opening_hour: '08:00',
    });

    function generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/[\s]+/g, '-')
            .replace(/-+/g, '-');
    }

    function handleNameChange(value: string): void {
        form.setData('name', value);
        form.setData('slug', generateSlug(value));
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        form.submit('post', '/partner', {
            onSuccess: () => {
                form.reset();
                onSuccess();
            },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="org-name">{t('Name')}</Label>
                <Input
                    id="org-name"
                    value={form.data.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={t('e.g. Acme Corp')}
                />
                <InputError message={form.errors.name} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="org-slug">{t('Slug')}</Label>
                <Input
                    id="org-slug"
                    value={form.data.slug}
                    onChange={(e) => form.setData('slug', e.target.value)}
                    placeholder={t('e.g. acme-corp')}
                    className="font-mono"
                />
                <InputError message={form.errors.slug} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('Segment')}</Label>
                    <Select value={form.data.segment} onValueChange={(v) => form.setData('segment', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('Select segment')} />
                        </SelectTrigger>
                        <SelectContent>
                            {segments.map((seg) => (
                                <SelectItem key={seg} value={seg}>
                                    {seg.replace('_', ' ')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.segment} />
                </div>

                <div className="space-y-2">
                    <Label>{t('Plan')}</Label>
                    <Select value={form.data.plan} onValueChange={(v) => form.setData('plan', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('Select plan')} />
                        </SelectTrigger>
                        <SelectContent>
                            {PLANS.map((plan) => (
                                <SelectItem key={plan} value={plan}>
                                    {plan}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.plan} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="org-timezone">{t('Default Timezone')}</Label>
                    <Input
                        id="org-timezone"
                        value={form.data.default_timezone}
                        onChange={(e) => form.setData('default_timezone', e.target.value)}
                        placeholder="America/Mexico_City"
                        className="font-mono text-sm"
                    />
                    <InputError message={form.errors.default_timezone} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="org-opening">{t('Opening Hour')}</Label>
                    <Input
                        id="org-opening"
                        type="time"
                        value={form.data.default_opening_hour}
                        onChange={(e) => form.setData('default_opening_hour', e.target.value)}
                        className="font-mono"
                    />
                    <InputError message={form.errors.default_opening_hour} />
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={form.processing}>
                {form.processing ? t('Creating...') : t('Create Organization')}
            </Button>
        </form>
    );
}

/* -- Skeleton --------------------------------------------------------- */

export function OrganizationsSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-5 md:p-8">
            {/* Header */}
            <div className="rounded-2xl bg-card p-8 md:p-10">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="mt-3 h-9 w-56" />
                <Skeleton className="mt-2 h-4 w-48" />
                <div className="mt-8 grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-lg" />
                    ))}
                </div>
            </div>
            {/* Filter Toolbar */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
            </div>
            {/* Table */}
            <Card className="border-border/10">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <TableHead key={i}>
                                    <Skeleton className="h-3 w-16" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div>
                                            <Skeleton className="h-4 w-28" />
                                            <Skeleton className="mt-1 h-3 w-20" />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-3 w-16" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
