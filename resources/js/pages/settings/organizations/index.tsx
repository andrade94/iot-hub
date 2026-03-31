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
import { TimezoneSelect } from '@/components/ui/timezone-select';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, ChevronDown, Filter, Plus, Search, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

interface Props {
    organizations: OrganizationRow[];
    segments: string[];
    timezones: string[];
}

const PLANS = ['starter', 'standard', 'enterprise'] as const;

/** Capitalize segment slugs — handles known labels and falls back to title case */
function formatSegment(slug: string): string {
    const known: Record<string, string> = {
        retail: 'Retail',
        cold_chain: 'Cold Chain',
        industrial: 'Industrial',
        commercial: 'Commercial',
        foodservice: 'Foodservice',
        logistics: 'Logistics',
        hospitality: 'Hospitality',
        pharma: 'Pharma',
        smart_building: 'Smart Building',
        agriculture: 'Agriculture',
        energy: 'Energy',
    };
    return known[slug] ?? slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Organizations', href: '#' },
];

export default function OrganizationsIndex({ organizations, segments, timezones }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [suspendOrg, setSuspendOrg] = useState<OrganizationRow | null>(null);
    const [archiveOrg, setArchiveOrg] = useState<OrganizationRow | null>(null);
    const [reactivateOrg, setReactivateOrg] = useState<OrganizationRow | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [segmentFilter, setSegmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(() => {
        try { return localStorage.getItem('orgs-filters') !== 'false'; } catch { return false; }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try { localStorage.setItem('orgs-filters', String(next)); } catch { /* */ }
    }

    const filteredOrgs = useMemo(() => {
        let result = organizations;
        if (segmentFilter !== 'all') result = result.filter((org) => org.segment === segmentFilter);
        if (statusFilter !== 'all') result = result.filter((org) => org.status === statusFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter((org) => org.name.toLowerCase().includes(q) || org.slug.toLowerCase().includes(q));
        }
        return result;
    }, [organizations, segmentFilter, statusFilter, searchQuery]);

    const hasFilters = segmentFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';
    const activeFilterCount = (segmentFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);
    function clearAllFilters() { setSegmentFilter('all'); setStatusFilter('all'); setSearchQuery(''); }

    const stats = useMemo(() => ({
        active: organizations.filter((o) => o.status === 'active').length,
        suspended: organizations.filter((o) => o.status === 'suspended').length,
        totalSites: organizations.reduce((sum, o) => sum + o.sites_count, 0),
        totalDevices: organizations.reduce((sum, o) => sum + o.devices_count, 0),
    }), [organizations]);

    const columns = useMemo(() => getOrganizationColumns({ t }), [t]);
    const handleRowClick = useCallback((org: OrganizationRow) => { router.get(`/settings/organizations/${org.id}`); }, []);

    function handleSuspend() { if (!suspendOrg) return; setActionLoading(true); router.post(`/settings/organizations/${suspendOrg.id}/suspend`, {}, { preserveScroll: true, onFinish: () => { setActionLoading(false); setSuspendOrg(null); } }); }
    function handleReactivate() { if (!reactivateOrg) return; setActionLoading(true); router.post(`/settings/organizations/${reactivateOrg.id}/reactivate`, {}, { preserveScroll: true, onFinish: () => { setActionLoading(false); setReactivateOrg(null); } }); }
    function handleArchive() { if (!archiveOrg) return; setActionLoading(true); router.delete(`/settings/organizations/${archiveOrg.id}`, { preserveScroll: true, onFinish: () => { setActionLoading(false); setArchiveOrg(null); } }); }

    const emptyStateNode = (
        <EmptyState size="sm" variant="muted" icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
            title={hasFilters ? t('No organizations match these filters') : t('No organizations registered')}
            description={hasFilters ? t('Try adjusting your filters to see more results') : t('Create your first organization to get started')}
            action={hasFilters ? <Button variant="outline" size="sm" onClick={clearAllFilters}>{t('Clear filters')}</Button> : undefined}
        />
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Organizations')} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">

                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground md:text-[32px]">
                                {t('Organizations')}
                            </h1>
                            <p className="mt-1 text-[13px] font-light text-muted-foreground">
                                {t('Manage client entities, subscriptions, and lifecycle status.')}
                            </p>
                        </div>
                        <Dialog open={showCreate} onOpenChange={setShowCreate}>
                            <DialogTrigger asChild>
                                <Button className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {t('New Organization')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader><DialogTitle>{t('Create Organization')}</DialogTitle></DialogHeader>
                                <CreateOrganizationForm segments={segments} timezones={timezones} onSuccess={() => setShowCreate(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </FadeIn>

                {/* ━━ SUMMARY STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={400}>
                    <div className="mt-6 flex items-stretch overflow-hidden rounded-lg border border-border bg-card">
                        <SummaryStat label={t('Total')} value={String(organizations.length).padStart(2, '0')} />
                        <SummaryStat label={t('Active')} value={String(stats.active).padStart(2, '0')} color="text-emerald-600 dark:text-emerald-400" />
                        <SummaryStat label={t('Suspended')} value={String(stats.suspended).padStart(2, '0')} color="text-rose-600 dark:text-rose-400" />
                        <SummaryStat label={t('Sites')} value={String(stats.totalSites)} />
                        <SummaryStat label={t('Devices')} value={String(stats.totalDevices)} last />
                    </div>
                </FadeIn>

                {/* ━━ SECTION DIVIDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={t('Directory')} delay={100} />

                {/* ━━ FILTER BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={125} duration={400}>
                    <div className="mb-5 space-y-0">
                        {/* Toolbar row */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('Search organizations...')}
                                    className="w-64 rounded-md border border-border bg-card px-3.5 py-2 pl-9 text-xs font-light text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-muted-foreground/30"
                                />
                            </div>

                            <button
                                onClick={toggleFilters}
                                className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-medium transition-colors ${
                                    showFilters || activeFilterCount > 0
                                        ? 'border-primary/30 bg-primary/5 text-primary'
                                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Filter className="h-3 w-3" />
                                {t('Filters')}
                                {activeFilterCount > 0 && (
                                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 font-mono text-[9px] tabular-nums text-primary">
                                        {activeFilterCount}
                                    </span>
                                )}
                                <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>

                            {hasFilters && (
                                <button onClick={clearAllFilters} className="flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground">
                                    <X className="h-3 w-3" />{t('Clear')}
                                </button>
                            )}

                            <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground/30">
                                {filteredOrgs.length} {t('of')} {organizations.length}
                            </span>
                        </div>

                        {/* Collapsible filter drawer */}
                        <div className={`overflow-hidden transition-all duration-200 ${showFilters ? 'mt-3 max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="rounded-lg border border-border/50 bg-card p-4">
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Status */}
                                    <div>
                                        <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">{t('Status')}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {['all', 'active', 'onboarding', 'suspended', 'archived'].map((st) => (
                                                <button
                                                    key={st}
                                                    onClick={() => setStatusFilter(st)}
                                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                                                        statusFilter === st
                                                            ? 'bg-accent text-foreground'
                                                            : 'text-muted-foreground/50 hover:bg-accent/30 hover:text-muted-foreground'
                                                    }`}
                                                >
                                                    {st !== 'all' && (
                                                        <span className={`h-1.5 w-1.5 rounded-full ${
                                                            st === 'active' ? 'bg-emerald-400' : st === 'onboarding' ? 'bg-cyan-400' : st === 'suspended' ? 'bg-rose-400' : 'bg-muted-foreground/30'
                                                        }`} />
                                                    )}
                                                    {st === 'all' ? t('All Statuses') : st.charAt(0).toUpperCase() + st.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Segment */}
                                    <div>
                                        <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">{t('Segment')}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {['all', ...segments].map((seg) => (
                                                <button
                                                    key={seg}
                                                    onClick={() => setSegmentFilter(seg)}
                                                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                                                        segmentFilter === seg
                                                            ? 'bg-accent text-foreground'
                                                            : 'text-muted-foreground/50 hover:bg-accent/30 hover:text-muted-foreground'
                                                    }`}
                                                >
                                                    {seg === 'all' ? t('All Segments') : (formatSegment(seg))}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ TABLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={175} duration={500}>
                    <Card className="editorial-table border-border shadow-none">
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

            {/* Confirmation Dialogs */}
            <ConfirmationDialog open={!!suspendOrg} onOpenChange={(open) => !open && setSuspendOrg(null)} title={t('Suspend Organization')} description={suspendOrg ? `${t('Are you sure you want to suspend')} "${suspendOrg.name}"?` : ''} warningMessage={t('Monitoring will continue but users will see a suspension warning.')} loading={actionLoading} onConfirm={handleSuspend} actionLabel={t('Suspend')} />
            <ConfirmationDialog open={!!reactivateOrg} onOpenChange={(open) => !open && setReactivateOrg(null)} title={t('Reactivate Organization')} description={reactivateOrg ? `${t('Are you sure you want to reactivate')} "${reactivateOrg.name}"?` : ''} warningMessage={t('The organization will return to active status.')} loading={actionLoading} onConfirm={handleReactivate} actionLabel={t('Reactivate')} />
            <ConfirmationDialog open={!!archiveOrg} onOpenChange={(open) => !open && setArchiveOrg(null)} title={t('Archive Organization')} description={archiveOrg ? `${t('Are you sure you want to archive')} "${archiveOrg.name}"?` : ''} warningMessage={t('Data will be retained for 12 months then deleted.')} loading={actionLoading} onConfirm={handleArchive} actionLabel={t('Archive')} />
        </AppLayout>
    );
}

/* -- Summary Stat -------------------------------------------------------- */

function SummaryStat({ label, value, color, last }: { label: string; value: string; color?: string; last?: boolean }) {
    return (
        <div className={`relative flex flex-1 flex-col items-center gap-1.5 py-5 ${!last ? 'border-r border-border/50' : ''}`}>
            <span className={`font-display text-4xl font-bold leading-none tracking-tight ${color ?? 'text-foreground'}`}>
                {value}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {label}
            </span>
        </div>
    );
}

/* -- Section Divider ------------------------------------------------------ */

function SectionDivider({ label, delay = 0 }: { label: string; delay?: number }) {
    return (
        <FadeIn delay={delay} duration={400}>
            <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/40">
                    {label.toUpperCase()}
                </span>
                <div className="h-px flex-1 bg-border" />
            </div>
        </FadeIn>
    );
}

/* -- Create Organization Form --------------------------------------------- */

const organizationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
    segment: z.string().min(1, 'Segment is required'),
    plan: z.string().min(1, 'Plan is required'),
    default_timezone: z.string().min(1, 'Timezone is required'),
});

function CreateOrganizationForm({ segments, timezones, onSuccess }: { segments: string[]; timezones: string[]; onSuccess: () => void }) {
    const { t } = useLang();
    const form = useValidatedForm(organizationSchema, { name: '', slug: '', segment: '', plan: '', default_timezone: 'America/Mexico_City' });

    function generateSlug(name: string) { return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s]+/g, '-').replace(/-+/g, '-'); }
    function handleNameChange(value: string) { form.setData('name', value); form.setData('slug', generateSlug(value)); }
    function handleSubmit(e: React.FormEvent) { e.preventDefault(); form.submit('post', '/partner', { onSuccess: () => { form.reset(); onSuccess(); } }); }

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
                        <SelectTrigger><SelectValue placeholder={t('Select')} /></SelectTrigger>
                        <SelectContent>{segments.map((seg) => (<SelectItem key={seg} value={seg} className="capitalize">{formatSegment(seg)}</SelectItem>))}</SelectContent>
                    </Select>
                    <InputError message={form.errors.segment} />
                </div>
                <div className="space-y-2">
                    <Label>{t('Plan')}</Label>
                    <Select value={form.data.plan} onValueChange={(v) => form.setData('plan', v)}>
                        <SelectTrigger><SelectValue placeholder={t('Select')} /></SelectTrigger>
                        <SelectContent>{PLANS.map((p) => (<SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>))}</SelectContent>
                    </Select>
                    <InputError message={form.errors.plan} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>{t('Timezone')}</Label>
                <TimezoneSelect
                    timezones={timezones}
                    value={form.data.default_timezone}
                    onValueChange={(v) => form.setData('default_timezone', v)}
                />
                <InputError message={form.errors.default_timezone} />
            </div>
            <Button type="submit" className="w-full" disabled={form.processing}>{form.processing ? t('Creating...') : t('Create Organization')}</Button>
        </form>
    );
}
