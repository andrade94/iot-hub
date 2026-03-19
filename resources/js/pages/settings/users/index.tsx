import { Can } from '@/components/Can';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface UserRecord {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    whatsapp_phone: string | null;
    has_app_access: boolean;
    role: string | null;
    sites: { id: number; name: string }[];
    created_at: string;
}

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

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
    org_admin: 'default',
    site_manager: 'secondary',
    site_viewer: 'outline',
    technician: 'outline',
};

export default function UsersIndex({ users, sites, roles }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [editUser, setEditUser] = useState<UserRecord | null>(null);
    const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
    const [deleting, setDeleting] = useState(false);

    function handleDelete() {
        if (!deleteUser) return;
        setDeleting(true);
        router.delete(`/settings/users/${deleteUser.id}`, {
            preserveScroll: true,
            onFinish: () => { setDeleting(false); setDeleteUser(null); },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Users')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Users')}</h1>
                        <p className="text-sm text-muted-foreground">{users.length} {t('user(s)')}</p>
                    </div>
                    <Can permission="manage users">
                        <Dialog open={showCreate} onOpenChange={setShowCreate}>
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2 h-4 w-4" />{t('Add User')}</Button>
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

                <Card className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Email')}</TableHead>
                                <TableHead>{t('Role')}</TableHead>
                                <TableHead>{t('Sites')}</TableHead>
                                <TableHead>{t('App Access')}</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                                        {t('No users')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                        <TableCell>
                                            {user.role && (
                                                <Badge variant={roleBadgeVariant[user.role] ?? 'outline'}>
                                                    {user.role.replace('_', ' ')}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {user.sites.slice(0, 2).map((s) => (
                                                    <Badge key={s.id} variant="outline" className="text-[10px]">{s.name}</Badge>
                                                ))}
                                                {user.sites.length > 2 && (
                                                    <Badge variant="outline" className="text-[10px]">+{user.sites.length - 2}</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.has_app_access ? 'success' : 'outline'} className="text-xs">
                                                {user.has_app_access ? t('Yes') : t('No')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Can permission="manage users">
                                                <div className="flex gap-1">
                                                    <Dialog open={editUser?.id === user.id} onOpenChange={(open) => !open && setEditUser(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon-sm" onClick={() => setEditUser(user)}>
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-lg">
                                                            <DialogHeader>
                                                                <DialogTitle>{t('Edit User')}</DialogTitle>
                                                            </DialogHeader>
                                                            <UserForm
                                                                user={user}
                                                                sites={sites}
                                                                roles={roles}
                                                                onSuccess={() => setEditUser(null)}
                                                            />
                                                        </DialogContent>
                                                    </Dialog>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="text-destructive"
                                                        onClick={() => setDeleteUser(user)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </Can>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

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

function UserForm({
    user,
    sites,
    roles,
    onSuccess,
}: {
    user?: UserRecord;
    sites: SiteOption[];
    roles: string[];
    onSuccess: () => void;
}) {
    const { t } = useLang();
    const isEdit = !!user;

    const form = useForm({
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
        if (isEdit) {
            form.put(`/settings/users/${user!.id}`, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            form.post('/settings/users', {
                preserveScroll: true,
                onSuccess: () => { form.reset(); onSuccess(); },
            });
        }
    }

    function toggleSite(siteId: number) {
        const current = form.data.site_ids;
        if (current.includes(siteId)) {
            form.setData('site_ids', current.filter((id) => id !== siteId));
        } else {
            form.setData('site_ids', [...current, siteId]);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>{t('Name')}</Label>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                <InputError message={form.errors.name} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Email')}</Label>
                <Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} required />
                <InputError message={form.errors.email} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>{t('Phone')}</Label>
                    <Input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                    <InputError message={form.errors.phone} />
                </div>
                <div className="grid gap-2">
                    <Label>{t('WhatsApp')}</Label>
                    <Input value={form.data.whatsapp_phone} onChange={(e) => form.setData('whatsapp_phone', e.target.value)} />
                    <InputError message={form.errors.whatsapp_phone} />
                </div>
            </div>

            {!isEdit && (
                <div className="grid gap-2">
                    <Label>{t('Password')}</Label>
                    <Input type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} required />
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
