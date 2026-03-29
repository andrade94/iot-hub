import InputError from '@/components/input-error';
import { type OrganizationRow, getOrganizationColumns } from '@/components/organizations/columns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
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
import { Building2, Filter, Plus, Search, X } from 'lucide-react';
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Organizations', href: '#' },
];

const SEGMENT_DOT_COLORS: Record<string, string> = {
    retail: 'bg-amber-400',
    cold_chain: 'bg-blue-400',
    industrial: 'bg-violet-400',
    commercial: 'bg-emerald-400',
    foodservice: 'bg-rose-400',
};

const STATUS_DOT_COLORS: Record<string, string> = {
    active: 'bg-emerald-400',
    onboarding: 'bg-blue-400',
    suspended: 'bg-red-400',
    archived: 'bg-muted-foreground',
};

export default function OrganizationsIndex({ organizations, segments }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [suspendOrg, setSuspendOrg] = useState<OrganizationRow | null>(null);
    const [archiveOrg, setArchiveOrg] = useState<OrganizationRow | null>(null);
    const [reactivateOrg, setReactivateOrg] = useState<OrganizationRow | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [segmentFilter, setSegmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [showSidebar, setShowSidebar] = useState(() => {
        try { return localStorage.getItem('orgs-sidebar') !== 'false'; } catch { return true; }
    });

    function toggleSidebar() {
        const next = !showSidebar;
        setShowSidebar(next);
        try { localStorage.setItem('orgs-sidebar', String(next)); } catch { /* */ }
    }

    const filteredOrgs = useMemo(() => {
        let result = organizations;
        if (segmentFilter !== 'all') result = result.filter((org) => org.segment === segmentFilter);
        if (statusFilter !== 'all') result = result.filter((org) => org.status === statusFilter);
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter((org) => org.name.toLowerCase().includes(query) || org.slug.toLowerCase().includes(query));
        }
        return result;
    }, [organizations, segmentFilter, statusFilter, searchQuery]);

    const hasFilters = segmentFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';
    const activeFilterCount = (segmentFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

    function clearAllFilters() {
        setSegmentFilter('all');
        setStatusFilter('all');
        setSearchQuery('');
    }

    const stats = useMemo(() => ({
        active: organizations.filter((o) => o.status === 'active').length,
        suspended: organizations.filter((o) => o.status === 'suspended').length,
        totalSites: organizations.reduce((sum, o) => sum + o.sites_count, 0),
        totalDevices: organizations.reduce((sum, o) => sum + o.devices_count, 0),
    }), [organizations]);

    const columns = useMemo(() => getOrganizationColumns({ t }), [t]);
    const handleRowClick = useCallback((org: OrganizationRow) => { router.get(`/settings/organizations/${org.id}`); }, []);

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

    const emptyStateNode = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
            title={hasFilters ? t('No organizations match these filters') : t('No organizations registered')}
            description={hasFilters ? t('Try adjusting your filters to see more results') : t('Create your first organization to get started')}
            action={hasFilters ? <Button variant="outline" size="sm" onClick={clearAllFilters}>{t('Clear filters')}</Button> : undefined}
        />
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Organizations')} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background">

                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="border-b border-border/5 bg-card px-6 py-6 md:px-8 md:py-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
                                    {t('Platform Administration')}
                                </p>
                                <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-foreground md:text-[28px]">
                                    {t('Organizations')}
                                </h1>
                                <p className="mt-1 text-[13px] text-muted-foreground">
                                    {t('Manage client entities, subscriptions, and lifecycle status.')}
                                </p>
                            </div>
                            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                <DialogTrigger asChild>
                                    <Button size="default" className="shrink-0">
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        {t('New Organization')}
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

                        {/* KPI Strip */}
                        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/10 bg-border/10 md:grid-cols-4">
                            <KpiCard label={t('Total')} value={organizations.length} />
                            <KpiCard label={t('Active')} value={stats.active} accentColor="text-ob-emerald" />
                            <KpiCard label={t('Suspended')} value={stats.suspended} accentColor="text-ob-coral" />
                            <KpiCard label={t('Sites / Devices')} value={stats.totalSites} suffix={`/ ${stats.totalDevices}`} accentColor="text-ob-cyan" />
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ TOOLBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={300}>
                    <div className="flex items-center gap-2 border-b border-border/5 px-6 py-2.5 md:px-8">
                        <Button
                            variant={showSidebar ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={toggleSidebar}
                            className="h-7 gap-1.5 px-2.5 text-xs"
                        >
                            <Filter className="h-3 w-3" />
                            {t('Filters')}
                            {activeFilterCount > 0 && (
                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-ob-cyan/20 px-1 font-mono text-[10px] tabular-nums text-ob-cyan">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>

                        {hasFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                                {t('Clear all')}
                            </button>
                        )}

                        <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground/50">
                            {filteredOrgs.length} {t('of')} {organizations.length}
                        </span>
                    </div>
                </FadeIn>

                {/* ━━ SPLIT CONTENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Filter Sidebar */}
                    <div
                        className={`shrink-0 overflow-y-auto border-r border-border/5 bg-card transition-all duration-200 ${
                            showSidebar ? 'w-[200px] opacity-100' : 'w-0 opacity-0'
                        }`}
                    >
                        <div className="w-[200px] p-4">
                            {/* Search */}
                            <div className="relative mb-5">
                                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('Search...')}
                                    className="h-8 border-border/10 bg-background pl-7 font-mono text-[11px]"
                                />
                            </div>

                            {/* Segment */}
                            <SidebarSection title={t('Segment')}>
                                <FilterItem
                                    label={t('All Segments')}
                                    count={organizations.length}
                                    active={segmentFilter === 'all'}
                                    onClick={() => setSegmentFilter('all')}
                                />
                                {segments.map((seg) => (
                                    <FilterItem
                                        key={seg}
                                        label={SEGMENT_LABELS[seg] ?? seg.replace('_', ' ')}
                                        count={organizations.filter((o) => o.segment === seg).length}
                                        active={segmentFilter === seg}
                                        onClick={() => setSegmentFilter(seg)}
                                        dotClass={SEGMENT_DOT_COLORS[seg]}
                                    />
                                ))}
                            </SidebarSection>

                            {/* Status */}
                            <SidebarSection title={t('Status')} className="mt-5">
                                <FilterItem
                                    label={t('All Statuses')}
                                    count={organizations.length}
                                    active={statusFilter === 'all'}
                                    onClick={() => setStatusFilter('all')}
                                />
                                {['active', 'onboarding', 'suspended', 'archived'].map((st) => (
                                    <FilterItem
                                        key={st}
                                        label={st.charAt(0).toUpperCase() + st.slice(1)}
                                        count={organizations.filter((o) => o.status === st).length}
                                        active={statusFilter === st}
                                        onClick={() => setStatusFilter(st)}
                                        dotClass={STATUS_DOT_COLORS[st]}
                                    />
                                ))}
                            </SidebarSection>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-5">
                        <FadeIn delay={100} duration={400}>
                            <Card className="border-border/10 shadow-none">
                                <DataTable
                                    columns={columns}
                                    data={filteredOrgs}
                                    getRowId={(row) => String(row.id)}
                                    onRowClick={handleRowClick}
                                    bordered={false}
                                    emptyState={emptyStateNode}
                                />
                            </Card>
                        </FadeIn>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialogs */}
            <ConfirmationDialog open={!!suspendOrg} onOpenChange={(open) => !open && setSuspendOrg(null)} title={t('Suspend Organization')} description={suspendOrg ? `${t('Are you sure you want to suspend')} "${suspendOrg.name}"?` : ''} warningMessage={t('Monitoring will continue but users will see a suspension warning. The organization can be reactivated later.')} loading={actionLoading} onConfirm={handleSuspend} actionLabel={t('Suspend')} />
            <ConfirmationDialog open={!!reactivateOrg} onOpenChange={(open) => !open && setReactivateOrg(null)} title={t('Reactivate Organization')} description={reactivateOrg ? `${t('Are you sure you want to reactivate')} "${reactivateOrg.name}"?` : ''} warningMessage={t('The organization will return to active status and all users will regain full access.')} loading={actionLoading} onConfirm={handleReactivate} actionLabel={t('Reactivate')} />
            <ConfirmationDialog open={!!archiveOrg} onOpenChange={(open) => !open && setArchiveOrg(null)} title={t('Archive Organization')} description={archiveOrg ? `${t('Are you sure you want to archive')} "${archiveOrg.name}"?` : ''} warningMessage={t('This is a permanent action. Data will be retained for 12 months then deleted. The organization cannot be reactivated.')} loading={actionLoading} onConfirm={handleArchive} actionLabel={t('Archive')} />
        </AppLayout>
    );
}

/* -- Sidebar Section ---------------------------------------------------- */

function SidebarSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <p className="mb-1.5 font-label text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                {title}
            </p>
            <div className="flex flex-col gap-px">{children}</div>
        </div>
    );
}

/* -- Filter Item -------------------------------------------------------- */

function FilterItem({ label, count, active, onClick, dotClass }: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    dotClass?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[12px] transition-colors ${
                active
                    ? 'bg-accent font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
            }`}
        >
            {dotClass && <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />}
            <span className="flex-1 truncate">{label}</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/40">{count}</span>
        </button>
    );
}

/* -- KPI Card ----------------------------------------------------------- */

function KpiCard({ label, value, suffix, accentColor }: {
    label: string;
    value: number;
    suffix?: string;
    accentColor?: string;
}) {
    return (
        <div className="bg-card px-4 py-3">
            <p className="font-label text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                {label}
            </p>
            <p className={`mt-0.5 font-display text-xl font-extrabold tabular-nums ${accentColor ?? 'text-foreground'}`}>
                {String(value).padStart(2, '0')}
                {suffix && <span className="ml-0.5 text-[13px] font-normal text-muted-foreground">{suffix}</span>}
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
        return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s]+/g, '-').replace(/-+/g, '-');
    }

    function handleNameChange(value: string): void {
        form.setData('name', value);
        form.setData('slug', generateSlug(value));
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        form.submit('post', '/partner', {
            onSuccess: () => { form.reset(); onSuccess(); },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="org-name">{t('Name')}</Label>
                <Input id="org-name" value={form.data.name} onChange={(e) => handleNameChange(e.target.value)} placeholder={t('e.g. Acme Corp')} />
                <InputError message={form.errors.name} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="org-slug">{t('Slug')}</Label>
                <Input id="org-slug" value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} placeholder={t('e.g. acme-corp')} className="font-mono" />
                <InputError message={form.errors.slug} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('Segment')}</Label>
                    <Select value={form.data.segment} onValueChange={(v) => form.setData('segment', v)}>
                        <SelectTrigger><SelectValue placeholder={t('Select segment')} /></SelectTrigger>
                        <SelectContent>
                            {segments.map((seg) => (<SelectItem key={seg} value={seg}>{seg.replace('_', ' ')}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.segment} />
                </div>
                <div className="space-y-2">
                    <Label>{t('Plan')}</Label>
                    <Select value={form.data.plan} onValueChange={(v) => form.setData('plan', v)}>
                        <SelectTrigger><SelectValue placeholder={t('Select plan')} /></SelectTrigger>
                        <SelectContent>
                            {PLANS.map((plan) => (<SelectItem key={plan} value={plan}>{plan}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.plan} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="org-timezone">{t('Default Timezone')}</Label>
                    <Input id="org-timezone" value={form.data.default_timezone} onChange={(e) => form.setData('default_timezone', e.target.value)} placeholder="America/Mexico_City" className="font-mono text-sm" />
                    <InputError message={form.errors.default_timezone} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="org-opening">{t('Opening Hour')}</Label>
                    <Input id="org-opening" type="time" value={form.data.default_opening_hour} onChange={(e) => form.setData('default_opening_hour', e.target.value)} className="font-mono" />
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
        <div className="obsidian flex flex-col bg-background">
            <div className="border-b border-border/5 bg-card px-6 py-6 md:px-8 md:py-7">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="mt-3 h-7 w-48" />
                <Skeleton className="mt-2 h-4 w-64" />
                <div className="mt-5 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-border/10">
                    {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-14" />))}
                </div>
            </div>
            <div className="flex items-center gap-2 border-b border-border/5 px-6 py-2.5 md:px-8">
                <Skeleton className="h-7 w-20 rounded-md" />
            </div>
            <div className="flex flex-1">
                <div className="hidden w-[200px] border-r border-border/5 bg-card p-4 lg:block">
                    {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="mb-1 h-6 w-full rounded-md" />))}
                </div>
                <div className="flex-1 p-4 md:p-5">
                    <Card className="border-border/10">
                        <Table>
                            <TableHeader>
                                <TableRow>{Array.from({ length: 8 }).map((_, i) => (<TableHead key={i}><Skeleton className="h-3 w-16" /></TableHead>))}</TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div><Skeleton className="h-4 w-28" /><Skeleton className="mt-1 h-3 w-20" /></div></div></TableCell>
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
            </div>
        </div>
    );
}
