import { Can } from '@/components/Can';
import { type SiteRow, getSiteColumns } from '@/components/sites/columns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimezoneSelect } from '@/components/ui/timezone-select';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ChevronDown, Filter, MapPin, Plus, Search, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface Props {
    sites: SiteRow[];
    timezones: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Sites', href: '/sites' },
];

export default function SiteIndex({ sites, timezones }: Props) {
    const { t } = useLang();
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.roles?.includes('super_admin');
    const [showCreate, setShowCreate] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(() => {
        try { return localStorage.getItem('sites-filters') !== 'false'; } catch { return false; }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try { localStorage.setItem('sites-filters', String(next)); } catch { /* */ }
    }

    const filteredSites = useMemo(() => {
        let result = sites;
        if (statusFilter !== 'all') result = result.filter((s) => s.status === statusFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter((s) => s.name.toLowerCase().includes(q));
        }
        return result;
    }, [sites, statusFilter, searchQuery]);

    const hasFilters = statusFilter !== 'all' || searchQuery.trim() !== '';
    const activeFilterCount = statusFilter !== 'all' ? 1 : 0;
    function clearAllFilters() { setStatusFilter('all'); setSearchQuery(''); }

    // Stats
    const stats = useMemo(() => ({
        active: sites.filter((s) => s.status === 'active').length,
        onboarding: sites.filter((s) => s.status === 'onboarding').length,
        draft: sites.filter((s) => s.status === 'draft').length,
        totalDevices: sites.reduce((sum, s) => sum + s.device_count, 0),
        totalOnline: sites.reduce((sum, s) => sum + s.online_count, 0),
    }), [sites]);

    const healthPct = stats.totalDevices > 0 ? Math.round((stats.totalOnline / stats.totalDevices) * 100) : 0;

    const columns = useMemo(() => getSiteColumns({ t, showOrg: isSuperAdmin }), [t, isSuperAdmin]);
    const handleRowClick = useCallback((site: SiteRow) => { router.get(`/sites/${site.id}`); }, []);

    const emptyStateNode = (
        <EmptyState size="sm" variant="muted" icon={<MapPin className="h-5 w-5 text-muted-foreground" />}
            title={hasFilters ? t('No sites match these filters') : t('No sites registered')}
            description={hasFilters ? t('Try adjusting your filters to see more results') : t('Add your first site to get started')}
            action={hasFilters ? <Button variant="outline" size="sm" onClick={clearAllFilters}>{t('Clear filters')}</Button> : undefined}
        />
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Sites')} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">

                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground md:text-[32px]">
                                {t('Sites')}
                            </h1>
                            <p className="mt-1 text-[13px] font-light text-muted-foreground">
                                {t('Monitor and manage your IoT deployment sites.')}
                            </p>
                        </div>
                        <Can permission="manage sites">
                            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                <DialogTrigger asChild>
                                    <Button className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
                                        <Plus className="mr-1.5 h-4 w-4" />{t('Add Site')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader><DialogTitle>{t('Add Site')}</DialogTitle></DialogHeader>
                                    <AddSiteForm timezones={timezones} onSuccess={() => setShowCreate(false)} />
                                </DialogContent>
                            </Dialog>
                        </Can>
                    </div>
                </FadeIn>

                {/* ━━ SUMMARY STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={400}>
                    <div className="mt-6 flex items-stretch overflow-hidden rounded-lg border border-border bg-card">
                        <SummaryStat label={t('Total')} value={String(sites.length).padStart(2, '0')} />
                        <SummaryStat label={t('Active')} value={String(stats.active).padStart(2, '0')} color="text-emerald-600 dark:text-emerald-400" />
                        <SummaryStat label={t('Onboarding')} value={String(stats.onboarding).padStart(2, '0')} color={stats.onboarding > 0 ? 'text-cyan-600 dark:text-cyan-400' : undefined} />
                        <SummaryStat label={t('Draft')} value={String(stats.draft).padStart(2, '0')} />
                        <SummaryStat label={t('Devices')} value={String(stats.totalDevices)} />
                        <SummaryStat label={t('Online')} value={`${healthPct}%`} color={healthPct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : healthPct > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'} last />
                    </div>
                </FadeIn>

                {/* ━━ SECTION DIVIDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={t('Fleet')} />

                {/* ━━ TOOLBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={125} duration={400}>
                    <div className="mb-5 space-y-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('Search sites...')}
                                    className="w-64 rounded-md border border-border bg-background px-3.5 py-2 pl-9 text-xs font-light text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-muted-foreground/70"
                                />
                            </div>
                            <button
                                onClick={toggleFilters}
                                className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-medium transition-colors ${
                                    showFilters || activeFilterCount > 0
                                        ? 'border-primary/30 bg-primary/5 text-primary'
                                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Filter className="h-3 w-3" />
                                {t('Filters')}
                                {activeFilterCount > 0 && (
                                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 font-mono text-[9px] tabular-nums text-primary">{activeFilterCount}</span>
                                )}
                                <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                            {hasFilters && (
                                <button onClick={clearAllFilters} className="flex items-center gap-1 text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground">
                                    <X className="h-3 w-3" />{t('Clear')}
                                </button>
                            )}
                            <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground/70">
                                {filteredSites.length} {t('of')} {sites.length}
                            </span>
                        </div>

                        {/* Filter drawer */}
                        <div className={`overflow-hidden transition-all duration-200 ${showFilters ? 'mt-3 max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="rounded-lg border border-border/50 bg-card p-4">
                                <div>
                                    <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{t('Status')}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {['all', 'active', 'onboarding', 'draft', 'inactive'].map((st) => (
                                            <button
                                                key={st}
                                                onClick={() => setStatusFilter(st)}
                                                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                                                    statusFilter === st ? 'bg-accent text-foreground' : 'text-muted-foreground/70 hover:bg-accent/30 hover:text-muted-foreground'
                                                }`}
                                            >
                                                {st !== 'all' && (
                                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                                        st === 'active' ? 'bg-emerald-400' : st === 'onboarding' ? 'bg-cyan-400' : st === 'draft' ? 'bg-muted-foreground/30' : 'bg-rose-400'
                                                    }`} />
                                                )}
                                                {st === 'all' ? t('All') : st.charAt(0).toUpperCase() + st.slice(1)}
                                            </button>
                                        ))}
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
                            data={filteredSites}
                            getRowId={(row) => String(row.id)}
                            onRowClick={handleRowClick}
                            bordered={false}
                            emptyState={emptyStateNode}
                        />
                    </Card>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

/* -- Summary Stat ---------------------------------------------------- */

function SummaryStat({ label, value, color, last }: { label: string; value: string; color?: string; last?: boolean }) {
    return (
        <div className={`flex flex-1 flex-col items-center gap-1.5 py-5 ${!last ? 'border-r border-border/50' : ''}`}>
            <span className={`font-display text-4xl font-bold leading-none tracking-tight ${color ?? 'text-foreground'}`}>{value}</span>
            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        </div>
    );
}

/* -- Section Divider ------------------------------------------------- */

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{label.toUpperCase()}</span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

/* -- Add Site Form --------------------------------------------------- */

function AddSiteForm({ timezones, onSuccess }: { timezones: string[]; onSuccess: () => void }) {
    const { t } = useLang();
    const form = useForm({ name: '', address: '', timezone: 'America/Mexico_City', status: 'draft' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/settings/sites', {
            preserveScroll: true,
            onSuccess: (page) => {
                onSuccess();
                const flash = (page.props as Record<string, unknown>).flash as Record<string, unknown> | undefined;
                const newId = flash?.created_id as number | undefined;
                if (newId) router.get(`/sites/${newId}/onboard`);
            },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-[13px] text-muted-foreground">{t('Create the site record, then set up gateways and devices in the onboarding wizard.')}</p>
            <div className="space-y-2">
                <Label>{t('Site Name')}</Label>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder={t('e.g. CEDIS Monterrey')} autoFocus />
                {form.errors.name && <p className="text-[11px] text-destructive-foreground">{form.errors.name}</p>}
            </div>
            <div className="space-y-2">
                <Label>{t('Address')}</Label>
                <Input value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} placeholder={t('Street address (optional)')} />
            </div>
            <div className="space-y-2">
                <Label>{t('Timezone')}</Label>
                <TimezoneSelect timezones={timezones} value={form.data.timezone} onValueChange={(v) => form.setData('timezone', v)} />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.processing || !form.data.name.trim()}>
                {form.processing ? t('Creating...') : t('Create & Set Up Site')}
            </Button>
        </form>
    );
}
