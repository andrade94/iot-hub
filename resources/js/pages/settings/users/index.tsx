import { Can, usePermission } from '@/components/Can';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

interface SiteOption {
    id: number;
    name: string;
}

interface Props {
    users: UserRecord[];
    sites: SiteOption[];
    roles: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Users', href: '#' },
];

export default function UsersIndex({ users, sites, roles }: Props) {
    const { t } = useLang();
    const { can } = usePermission();
    const [showCreate, setShowCreate] = useState(false);
    const [editUser, setEditUser] = useState<UserRecord | null>(null);
    const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
    const [deleting, setDeleting] = useState(false);

    const canManage = can('manage users');

    const columns = useMemo(
        () =>
            getUserColumns({
                onEdit: (user) => setEditUser(user),
                onDelete: (user) => setDeleteUser(user),
                t,
                canManage,
            }),
        [t, canManage],
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Users')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header card with bg-dots ── */}
                <FadeIn>
                    <Card className="shadow-elevation-1 overflow-hidden">
                        <div className="bg-dots relative border-b px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                        {t('User Management')}
                                    </p>
                                    <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">
                                        {t('Users')}
                                    </h1>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        <span className="font-mono tabular-nums">{users.length}</span>{' '}
                                        {t('user(s)')}
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
                    </Card>
                </FadeIn>

                {/* ── Users table ── */}
                <FadeIn delay={100}>
                    <Card className="shadow-elevation-1">
                        <DataTable
                            columns={columns}
                            data={users}
                            bordered={false}
                            noResultsMessage={t('No users')}
                        />
                    </Card>
                </FadeIn>
            </div>

            {/* ── Edit dialog (controlled outside table) ── */}
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

/* ── User Form ───────────────────────────────────── */

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

/* ── Skeleton ────────────────────────────────────── */

export function UsersIndexSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Header card */}
            <Card className="shadow-elevation-1 overflow-hidden">
                <div className="border-b px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-9 w-28" />
                    </div>
                </div>
            </Card>

            <Card className="shadow-elevation-1">
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
