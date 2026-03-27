import { Can, usePermission } from '@/components/Can';
import InputError from '@/components/input-error';
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
import { Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

interface SiteOption {
    id: number;
    name: string;
}

interface Props {
    users: UserRecord[];
    sites: SiteOption[];
    roles: string[];
    allOrgsMode?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    support: 'Support',
    account_manager: 'Account Manager',
    technician: 'Technician',
    client_org_admin: 'Org Admin',
    client_site_manager: 'Site Manager',
    client_site_viewer: 'Site Viewer',
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    deactivated: 'Deactivated',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Users', href: '#' },
];

export default function UsersIndex({ users, sites, roles, allOrgsMode = false }: Props) {
    const { t } = useLang();
    const { can } = usePermission();
    const [showCreate, setShowCreate] = useState(false);
    const [editUser, setEditUser] = useState<UserRecord | null>(null);
    const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
    const [deleting, setDeleting] = useState(false);

    const canManage = can('manage users');

    // Client-side filters
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [orgFilter, setOrgFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Unique org names for filter dropdown (only used in allOrgsMode)
    const orgNames = useMemo(() => {
        if (!allOrgsMode) return [];
        const names = new Set(users.map((u) => u.organization_name).filter(Boolean) as string[]);
        return Array.from(names).sort();
    }, [users, allOrgsMode]);

    // Filter sidebar visibility with localStorage persistence
    const [showFilters, setShowFilters] = useState(() => {
        try {
            return localStorage.getItem('users-show-filters') === 'true';
        } catch {
            return true;
        }
    });

    function toggleFilters() {
        const next = !showFilters;
        setShowFilters(next);
        try {
            localStorage.setItem('users-show-filters', String(next));
        } catch {
            // ignore
        }
    }

    // Client-side filtering
    const filteredUsers = useMemo(() => {
        let result = users;

        if (roleFilter !== 'all') {
            result = result.filter((user) => user.role === roleFilter);
        }

        if (statusFilter !== 'all') {
            if (statusFilter === 'active') {
                result = result.filter((user) => !user.deactivated_at);
            } else if (statusFilter === 'deactivated') {
                result = result.filter((user) => !!user.deactivated_at);
            }
        }

        if (allOrgsMode && orgFilter !== 'all') {
            result = result.filter((user) => user.organization_name === orgFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(
                (user) =>
                    user.name.toLowerCase().includes(query) ||
                    user.email.toLowerCase().includes(query),
            );
        }

        return result;
    }, [users, roleFilter, statusFilter, orgFilter, allOrgsMode, searchQuery]);

    const hasFilters = roleFilter !== 'all' || statusFilter !== 'all' || orgFilter !== 'all' || searchQuery.trim() !== '';

    function clearAllFilters() {
        setRoleFilter('all');
        setStatusFilter('all');
        setOrgFilter('all');
        setSearchQuery('');
    }

    // Build filter pills
    const filterPills = useMemo<FilterPill[]>(() => {
        const pills: FilterPill[] = [];
        if (orgFilter !== 'all') {
            pills.push({
                key: 'org',
                label: `Organization: ${orgFilter}`,
                onRemove: () => setOrgFilter('all'),
            });
        }
        if (roleFilter !== 'all') {
            pills.push({
                key: 'role',
                label: `Role: ${ROLE_LABELS[roleFilter] ?? roleFilter.replace('_', ' ')}`,
                onRemove: () => setRoleFilter('all'),
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
    }, [orgFilter, roleFilter, statusFilter, searchQuery]);

    const columns = useMemo(
        () =>
            getUserColumns({
                onEdit: (user) => setEditUser(user),
                onDelete: (user) => setDeleteUser(user),
                t,
                canManage,
                allOrgsMode,
            }),
        [t, canManage, allOrgsMode],
    );

    function handleDelete() {
        if (!deleteUser) return;
        setDeleting(true);
        router.delete(`/settings/users/${deleteUser.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteUser(null);
            },
        });
    }

    // Empty state
    const emptyStateNode = (
        <EmptyState
            size="sm"
            variant="muted"
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            title={
                hasFilters
                    ? t('No users match these filters')
                    : t('No users registered')
            }
            description={
                hasFilters
                    ? t('Try adjusting your filters to see more results')
                    : t('Add your first user to get started')
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
                {allOrgsMode && (
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
                                {orgNames.map((name) => (
                                    <SelectItem key={name} value={name}>
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t('Role')}
                    </Label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('Role')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Roles')}</SelectItem>
                            {roles.map((role) => (
                                <SelectItem key={role} value={role}>
                                    {ROLE_LABELS[role] ?? role.replace('_', ' ')}
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
                            <SelectItem value="active">{t('Active')}</SelectItem>
                            <SelectItem value="deactivated">{t('Deactivated')}</SelectItem>
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
                            placeholder={t('Name or email...')}
                            className="pl-8"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Users')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header -------------------------------------------------- */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('User Management')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Users')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums font-medium text-foreground">{users.length}</span>{' '}
                                    {t('user(s) registered')}
                                </p>
                            </div>
                            <Can permission="manage users">
                                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('Add User')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>{t('Add User')}</DialogTitle>
                                        </DialogHeader>
                                        <UserForm
                                            sites={sites}
                                            roles={roles}
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
                                data={filteredUsers}
                                bordered={false}
                                emptyState={emptyStateNode}
                            />
                        </Card>
                    </ContentWithSidebar>
                </FadeIn>
            </div>

            {/* -- Edit dialog (controlled outside table) -- */}
            <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('Edit User')}</DialogTitle>
                    </DialogHeader>
                    {editUser && (
                        <UserForm
                            user={editUser}
                            sites={sites}
                            roles={roles}
                            onSuccess={() => setEditUser(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                open={!!deleteUser}
                onOpenChange={(open) => !open && setDeleteUser(null)}
                title={t('Delete User')}
                description={`${t('Are you sure you want to delete')} ${deleteUser?.name}?`}
                warningMessage={t('This action cannot be undone.')}
                loading={deleting}
                onConfirm={handleDelete}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

/* -- User Form --------------------------------------------------- */

function UserForm({
    user,
    sites,
    roles,
    onSuccess,
}: {
    user?: UserRecord;
    sites: { id: number; name: string }[];
    roles: string[];
    onSuccess: () => void;
}) {
    const { t } = useLang();
    const isEdit = !!user;

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

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.validate()) return;
        if (isEdit) {
            form.put(`/settings/users/${user!.id}`, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            form.post('/settings/users', {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    onSuccess();
                },
            });
        }
    }

    function toggleSite(siteId: number) {
        const current = form.data.site_ids;
        if (current.includes(siteId)) {
            form.setData(
                'site_ids',
                current.filter((id: number) => id !== siteId),
            );
        } else {
            form.setData('site_ids', [...current, siteId]);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>{t('Name')}</Label>
                <Input
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    required
                />
                <InputError message={form.errors.name} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Email')}</Label>
                <Input
                    type="email"
                    value={form.data.email}
                    onChange={(e) => form.setData('email', e.target.value)}
                    required
                />
                <InputError message={form.errors.email} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>{t('Phone')}</Label>
                    <Input
                        value={form.data.phone}
                        onChange={(e) => form.setData('phone', e.target.value)}
                    />
                    <InputError message={form.errors.phone} />
                </div>
                <div className="grid gap-2">
                    <Label>{t('WhatsApp')}</Label>
                    <Input
                        value={form.data.whatsapp_phone}
                        onChange={(e) => form.setData('whatsapp_phone', e.target.value)}
                    />
                    <InputError message={form.errors.whatsapp_phone} />
                </div>
            </div>

            {!isEdit && (
                <div className="grid gap-2">
                    <Label>{t('Password')}</Label>
                    <Input
                        type="password"
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        required
                    />
                    <InputError message={form.errors.password} />
                </div>
            )}

            <div className="grid gap-2">
                <Label>{t('Role')}</Label>
                <Select value={form.data.role} onValueChange={(v) => form.setData('role', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('Select role')} />
                    </SelectTrigger>
                    <SelectContent>
                        {roles.map((role) => (
                            <SelectItem key={role} value={role}>
                                {role.replace('_', ' ')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.role} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Site Access')}</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                    {sites.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('No sites available')}</p>
                    ) : (
                        sites.map((site) => (
                            <label key={site.id} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.data.site_ids.includes(site.id)}
                                    onChange={() => toggleSite(site.id)}
                                    className="rounded border-input"
                                />
                                {site.name}
                            </label>
                        ))
                    )}
                </div>
                <InputError message={form.errors.site_ids} />
            </div>

            <div className="flex items-center gap-2">
                <Switch
                    checked={form.data.has_app_access}
                    onCheckedChange={(v) => form.setData('has_app_access', v)}
                />
                <Label>{t('App Access')}</Label>
            </div>

            <Button type="submit" disabled={form.processing} className="w-full">
                {isEdit ? t('Update User') : t('Create User')}
            </Button>
        </form>
    );
}

/* -- Skeleton --------------------------------------------------------- */

export function UsersIndexSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-20" />
                <Skeleton className="mt-2 h-4 w-24" />
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
                            <TableHead><Skeleton className="h-3 w-12" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-12" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-10" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-10" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-20" /></TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Skeleton className="h-5 w-16" />
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Skeleton className="h-7 w-7 rounded-md" />
                                        <Skeleton className="h-7 w-7 rounded-md" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
