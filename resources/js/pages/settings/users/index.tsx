import { Can, usePermission } from '@/components/Can';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type UserRecord, getUserColumns } from '@/components/users/columns';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { userSchema } from '@/utils/schemas';
import { Head, router } from '@inertiajs/react';
import { ChevronDown, Filter, Plus, Search, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface SiteOption { id: number; name: string; }
interface OrgOption { id: number; name: string; }

interface Props {
    users: UserRecord[];
    sites: SiteOption[];
    roles: string[];
    allOrgsMode?: boolean;
    organizations?: OrgOption[];
}

function getRoleLabel(role: string, t: (key: string) => string): string {
    const labels: Record<string, string> = {
        super_admin: t('Super Admin'),
        support: t('Support'),
        account_manager: t('Account Manager'),
        technician: t('Technician'),
        client_org_admin: t('Org Admin'),
        client_site_manager: t('Site Manager'),
        client_site_viewer: t('Site Viewer'),
    };
    return labels[role] ?? role.replace(/_/g, ' ');
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Users', href: '#' },
];

export default function UsersIndex({ users, sites, roles, allOrgsMode = false, organizations = [] }: Props) {
    const { t } = useLang();
    const { can } = usePermission();
    const [showCreate, setShowCreate] = useState(false);

    // Filters
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [orgFilter, setOrgFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(() => {
        try { return localStorage.getItem('users-filters') !== 'false'; } catch { return false; }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try { localStorage.setItem('users-filters', String(next)); } catch { /* */ }
    }

    const orgNames = useMemo(() => {
        if (!allOrgsMode) return [];
        return Array.from(new Set(users.map((u) => u.organization_name).filter(Boolean) as string[])).sort();
    }, [users, allOrgsMode]);

    const filteredUsers = useMemo(() => {
        let result = users;
        if (roleFilter !== 'all') result = result.filter((u) => u.role === roleFilter);
        if (statusFilter === 'active') result = result.filter((u) => !u.deactivated_at);
        else if (statusFilter === 'deactivated') result = result.filter((u) => !!u.deactivated_at);
        if (allOrgsMode && orgFilter !== 'all') result = result.filter((u) => u.organization_name === orgFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
        }
        return result;
    }, [users, roleFilter, statusFilter, orgFilter, allOrgsMode, searchQuery]);

    const hasFilters = roleFilter !== 'all' || statusFilter !== 'all' || orgFilter !== 'all' || searchQuery.trim() !== '';
    const activeFilterCount = (roleFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (orgFilter !== 'all' ? 1 : 0);
    function clearAllFilters() { setRoleFilter('all'); setStatusFilter('all'); setOrgFilter('all'); setSearchQuery(''); }

    // Stats
    const stats = useMemo(() => ({
        active: users.filter((u) => !u.deactivated_at).length,
        deactivated: users.filter((u) => !!u.deactivated_at).length,
        withApp: users.filter((u) => u.has_app_access).length,
    }), [users]);

    const columns = useMemo(() => getUserColumns({ t, allOrgsMode }), [t, allOrgsMode]);

    const emptyStateNode = (
        <EmptyState size="sm" variant="muted" icon={<Users className="h-5 w-5 text-muted-foreground" />}
            title={hasFilters ? t('No users match these filters') : t('No users registered')}
            description={hasFilters ? t('Try adjusting your filters to see more results') : t('Add your first user to get started')}
            action={hasFilters ? <Button variant="outline" size="sm" onClick={clearAllFilters}>{t('Clear filters')}</Button> : undefined}
        />
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Users')} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">

                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground md:text-[32px]">
                                {t('Users')}
                            </h1>
                            <p className="mt-1 text-[13px] font-light text-muted-foreground">
                                {t('Manage team members, roles, and site access.')}
                            </p>
                        </div>
                        <Can permission="manage users">
                            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                <DialogTrigger asChild>
                                    <Button className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
                                        <Plus className="mr-1.5 h-4 w-4" />{t('Add User')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader><DialogTitle>{t('Add User')}</DialogTitle></DialogHeader>
                                    <UserForm sites={sites} roles={roles} organizations={organizations} allOrgsMode={allOrgsMode} onSuccess={() => setShowCreate(false)} />
                                </DialogContent>
                            </Dialog>
                        </Can>
                    </div>
                </FadeIn>

                {/* ━━ SUMMARY STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={400}>
                    <div className="mt-6 flex items-stretch overflow-hidden rounded-lg border border-border bg-card">
                        <SummaryStat label={t('Total')} value={String(users.length).padStart(2, '0')} />
                        <SummaryStat label={t('Active')} value={String(stats.active).padStart(2, '0')} color="text-emerald-600 dark:text-emerald-400" />
                        <SummaryStat label={t('Deactivated')} value={String(stats.deactivated).padStart(2, '0')} color={stats.deactivated > 0 ? 'text-rose-600 dark:text-rose-400' : undefined} />
                        <SummaryStat label={t('App Access')} value={String(stats.withApp).padStart(2, '0')} last />
                    </div>
                </FadeIn>

                {/* ━━ SECTION DIVIDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={t('Directory')} />

                {/* ━━ TOOLBAR + FILTER DRAWER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={125} duration={400}>
                    <div className="mb-5 space-y-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('Search users...')}
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
                                {filteredUsers.length} {t('of')} {users.length}
                            </span>
                        </div>

                        {/* Filter drawer */}
                        <div className={`overflow-hidden transition-all duration-200 ${showFilters ? 'mt-3 max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="rounded-lg border border-border/50 bg-card p-4">
                                <div className={`grid gap-6 ${allOrgsMode ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                    {/* Role */}
                                    <div>
                                        <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{t('Role')}</p>
                                        <div className="flex flex-wrap gap-1">
                                            <FilterButton active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>{t('All Roles')}</FilterButton>
                                            {roles.map((role) => (
                                                <FilterButton key={role} active={roleFilter === role} onClick={() => setRoleFilter(role)}>
                                                    {getRoleLabel(role, t)}
                                                </FilterButton>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Status */}
                                    <div>
                                        <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{t('Status')}</p>
                                        <div className="flex flex-wrap gap-1">
                                            <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>{t('All')}</FilterButton>
                                            <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} dot="bg-emerald-400">{t('Active')}</FilterButton>
                                            <FilterButton active={statusFilter === 'deactivated'} onClick={() => setStatusFilter('deactivated')} dot="bg-rose-400">{t('Deactivated')}</FilterButton>
                                        </div>
                                    </div>
                                    {/* Organization (allOrgsMode) */}
                                    {allOrgsMode && (
                                        <div>
                                            <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{t('Organization')}</p>
                                            <div className="flex flex-wrap gap-1">
                                                <FilterButton active={orgFilter === 'all'} onClick={() => setOrgFilter('all')}>{t('All')}</FilterButton>
                                                {orgNames.map((name) => (
                                                    <FilterButton key={name} active={orgFilter === name} onClick={() => setOrgFilter(name)}>{name}</FilterButton>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ TABLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={175} duration={500}>
                    <Card className="editorial-table border-border shadow-none">
                        <DataTable columns={columns} data={filteredUsers} getRowId={(r) => String(r.id)} onRowClick={(u) => router.get(`/settings/users/${u.id}`)} bordered={false} emptyState={emptyStateNode} />
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

/* -- Filter Button --------------------------------------------------- */

function FilterButton({ children, active, onClick, dot }: { children: React.ReactNode; active: boolean; onClick: () => void; dot?: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                active ? 'bg-accent text-foreground' : 'text-muted-foreground/70 hover:bg-accent/30 hover:text-muted-foreground'
            }`}
        >
            {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
            {children}
        </button>
    );
}

/* -- User Form ------------------------------------------------------- */

function UserForm({ user, sites, roles, organizations = [], allOrgsMode = false, onSuccess }: { user?: UserRecord; sites: SiteOption[]; roles: string[]; organizations?: OrgOption[]; allOrgsMode?: boolean; onSuccess: () => void }) {
    const { t } = useLang();
    const isEdit = !!user;
    const [selectedOrgId, setSelectedOrgId] = useState<string>(user?.organization_name ? '' : '');
    const [orgSites, setOrgSites] = useState<SiteOption[]>(sites);
    const [loadingSites, setLoadingSites] = useState(false);

    const form = useValidatedForm(userSchema, {
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        whatsapp_phone: user?.whatsapp_phone ?? '',
        password: '',
        role: user?.role ?? '',
        site_ids: user?.sites.map((s) => s.id) ?? ([] as number[]),
        has_app_access: user?.has_app_access ?? false,
    });

    // When org changes in allOrgsMode, fetch sites for that org
    function handleOrgChange(orgId: string) {
        setSelectedOrgId(orgId);
        form.setData('site_ids', []);
        if (!orgId) { setOrgSites([]); return; }
        setLoadingSites(true);
        fetch(`/api/organizations/${orgId}/sites`, { headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => { setOrgSites(data); setLoadingSites(false); })
            .catch(() => { setOrgSites([]); setLoadingSites(false); });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.validate()) return;
        if (allOrgsMode && !isEdit && !selectedOrgId) return;
        if (isEdit) {
            form.put(`/settings/users/${user!.id}`, { preserveScroll: true, onSuccess });
        } else {
            // Include org_id for super_admin in all-orgs mode
            const submitData = allOrgsMode && selectedOrgId
                ? { ...form.data, org_id: Number(selectedOrgId) }
                : form.data;
            router.post('/settings/users', submitData as Record<string, unknown>, {
                preserveScroll: true,
                onSuccess: () => { form.reset(); onSuccess(); },
                onError: (errors) => {
                    form.setError(errors as Record<string, string>);
                },
            });
        }
    }

    function toggleSite(siteId: number) {
        const current = form.data.site_ids;
        form.setData('site_ids', current.includes(siteId) ? current.filter((id: number) => id !== siteId) : [...current, siteId]);
    }

    const availableSites = allOrgsMode && !isEdit ? orgSites : sites;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization selector — super_admin in allOrgsMode only */}
            {allOrgsMode && !isEdit && (
                <div className="space-y-2">
                    <Label>{t('Organization')}</Label>
                    <Select value={selectedOrgId} onValueChange={handleOrgChange}>
                        <SelectTrigger><SelectValue placeholder={t('Select organization')} /></SelectTrigger>
                        <SelectContent>
                            {organizations.map((org) => (
                                <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label>{t('Name')}</Label>
                    <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder={t('Full name')} />
                    <InputError message={form.errors.name} />
                </div>
                <div className="space-y-2">
                    <Label>{t('Email')}</Label>
                    <Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} placeholder={t('user@company.com')} />
                    <InputError message={form.errors.email} />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label>{t('Phone')}</Label>
                    <Input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} placeholder={t('Optional')} />
                </div>
                <div className="space-y-2">
                    <Label>{t('WhatsApp')}</Label>
                    <Input value={form.data.whatsapp_phone} onChange={(e) => form.setData('whatsapp_phone', e.target.value)} placeholder={t('Optional')} />
                </div>
            </div>

            {!isEdit && (
                <div className="space-y-2">
                    <Label>{t('Password')}</Label>
                    <Input type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} placeholder={t('Min. 8 characters')} />
                    <p className="text-[10px] text-muted-foreground">{t('The user can change this after first login.')}</p>
                    <InputError message={form.errors.password} />
                </div>
            )}

            <div className="space-y-2">
                <Label>{t('Role')}</Label>
                <Select value={form.data.role} onValueChange={(v) => form.setData('role', v)}>
                    <SelectTrigger><SelectValue placeholder={t('Select role')} /></SelectTrigger>
                    <SelectContent>
                        {roles.map((role) => (
                            <SelectItem key={role} value={role} className="capitalize">{getRoleLabel(role, t)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.role} />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>{t('Site Access')}</Label>
                    {availableSites.length > 0 && (
                        <button type="button" onClick={() => form.setData('site_ids', availableSites.map((s) => s.id))} className="text-[11px] text-primary transition-colors hover:text-primary/80">{t('Select all')}</button>
                    )}
                </div>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2 scrollbar-thin">
                    {loadingSites ? (
                        <p className="py-4 text-center text-[12px] text-muted-foreground">{t('Loading sites...')}</p>
                    ) : availableSites.length === 0 ? (
                        <p className="py-4 text-center text-[12px] text-muted-foreground">
                            {allOrgsMode && !selectedOrgId ? t('Select an organization first') : t('No sites available')}
                        </p>
                    ) : (
                        availableSites.map((site) => (
                            <label key={site.id} className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-1.5 text-[13px] transition-colors ${form.data.site_ids.includes(site.id) ? 'bg-primary/5' : 'hover:bg-accent/30'}`}>
                                <input type="checkbox" checked={form.data.site_ids.includes(site.id)} onChange={() => toggleSite(site.id)} className="accent-primary" />
                                {site.name}
                            </label>
                        ))
                    )}
                </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                    <p className="text-[13px] font-medium">{t('Mobile App Access')}</p>
                    <p className="text-[11px] text-muted-foreground">{t('Allow this user to use the Astrea mobile app')}</p>
                </div>
                <Switch checked={form.data.has_app_access} onCheckedChange={(v) => form.setData('has_app_access', v)} />
            </label>

            <Button type="submit" disabled={form.processing} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {form.processing ? t('Saving...') : isEdit ? t('Update User') : t('Create User')}
            </Button>
        </form>
    );
}

/* -- Skeleton -------------------------------------------------------- */

export function UsersIndexSkeleton() {
    return (
        <div className="obsidian flex flex-col bg-background p-5 md:p-8">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-64" />
            <div className="mt-6 flex overflow-hidden rounded-lg border border-border">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 flex-1" />)}
            </div>
            <div className="my-7 h-px bg-border" />
            <Skeleton className="mb-5 h-9 w-64" />
            <Card className="border-border">
                <Table>
                    <TableHeader><TableRow>{Array.from({ length: 6 }).map((_, i) => <TableHead key={i}><Skeleton className="h-3 w-14" /></TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-14" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
