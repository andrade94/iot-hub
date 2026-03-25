import { Can } from '@/components/Can';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { useValidatedForm } from '@/hooks/use-validated-form';
import { formatTimeAgo } from '@/utils/date';
import { siteSchema } from '@/utils/schemas';
import { Head, router } from '@inertiajs/react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface SiteRecord {
    id: number;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    status: 'draft' | 'active' | 'suspended';
    timezone: string | null;
    opening_hour: string | null;
    device_count: number;
    gateway_count: number;
    created_at: string;
}

interface Props {
    sites: SiteRecord[];
    timezones: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Sites', href: '#' },
];

const statusBadgeVariant: Record<string, 'success' | 'outline' | 'warning'> = {
    active: 'success',
    draft: 'outline',
    suspended: 'warning',
};

/* ── Section Divider ──────────────────────────────── */

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {label}
            </span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

export default function SitesIndex({ sites, timezones }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [editSite, setEditSite] = useState<SiteRecord | null>(null);
    const [deleteSite, setDeleteSite] = useState<SiteRecord | null>(null);
    const [deleting, setDeleting] = useState(false);

    function handleDelete() {
        if (!deleteSite) return;
        setDeleting(true);
        router.delete(`/settings/sites/${deleteSite.id}`, {
            preserveScroll: true,
            onFinish: () => { setDeleting(false); setDeleteSite(null); },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Sites')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-center justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Site Management')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Sites')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums font-medium text-foreground">{sites.length}</span>{' '}
                                    {t('site(s) configured')}
                                </p>
                            </div>
                            <Can permission="manage sites">
                                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                    <DialogTrigger asChild>
                                        <Button><Plus className="mr-2 h-4 w-4" />{t('Create Site')}</Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>{t('Create Site')}</DialogTitle>
                                        </DialogHeader>
                                        <SiteForm
                                            timezones={timezones}
                                            onSuccess={() => setShowCreate(false)}
                                        />
                                    </DialogContent>
                                </Dialog>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Table Section ────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <SectionDivider label={t('All Sites')} />
                </FadeIn>

                <FadeIn delay={150} duration={400}>
                    <Card className="shadow-elevation-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Name')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead>{t('Timezone')}</TableHead>
                                    <TableHead>{t('Opening Hour')}</TableHead>
                                    <TableHead>{t('Devices')}</TableHead>
                                    <TableHead>{t('Gateways')}</TableHead>
                                    <TableHead>{t('Created')}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sites.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <MapPin className="h-8 w-8 text-muted-foreground/50" />
                                                <p className="text-sm text-muted-foreground">{t('No sites configured')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sites.map((site) => (
                                        <TableRow key={site.id}>
                                            <TableCell className="font-medium">{site.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusBadgeVariant[site.status] ?? 'outline'}>
                                                    {site.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{site.timezone ?? '-'}</TableCell>
                                            <TableCell className="font-mono tabular-nums text-muted-foreground">{site.opening_hour ?? '-'}</TableCell>
                                            <TableCell className="font-mono tabular-nums text-muted-foreground">{site.device_count}</TableCell>
                                            <TableCell className="font-mono tabular-nums text-muted-foreground">{site.gateway_count}</TableCell>
                                            <TableCell className="font-mono tabular-nums text-muted-foreground">
                                                {formatTimeAgo(site.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <Can permission="manage sites">
                                                    <div className="flex gap-1">
                                                        {site.status === 'onboarding' && (
                                                            <Button variant="outline" size="sm" onClick={() => router.get(`/sites/${site.id}/onboard`)}>
                                                                {t('Onboard')}
                                                            </Button>
                                                        )}
                                                        <Dialog open={editSite?.id === site.id} onOpenChange={(open) => !open && setEditSite(null)}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon-sm" onClick={() => setEditSite(site)}>
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-lg">
                                                                <DialogHeader>
                                                                    <DialogTitle>{t('Edit Site')}</DialogTitle>
                                                                </DialogHeader>
                                                                <SiteForm
                                                                    site={site}
                                                                    timezones={timezones}
                                                                    onSuccess={() => setEditSite(null)}
                                                                />
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="text-destructive"
                                                            onClick={() => setDeleteSite(site)}
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
                </FadeIn>
            </div>

            <ConfirmationDialog
                open={!!deleteSite}
                onOpenChange={(open) => !open && setDeleteSite(null)}
                title={t('Delete Site')}
                description={`${t('Are you sure you want to delete')} ${deleteSite?.name}?`}
                warningMessage={t('This action cannot be undone. All associated devices and gateways will be unlinked.')}
                loading={deleting}
                onConfirm={handleDelete}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}

function SiteForm({
    site,
    timezones,
    onSuccess,
}: {
    site?: SiteRecord;
    timezones: string[];
    onSuccess: () => void;
}) {
    const { t } = useLang();
    const isEdit = !!site;

    const form = useValidatedForm(siteSchema, {
        name: site?.name ?? '',
        address: site?.address ?? '',
        latitude: site?.latitude ?? '',
        longitude: site?.longitude ?? '',
        timezone: site?.timezone ?? '',
        opening_hour: site?.opening_hour ?? '',
        status: site?.status ?? 'draft',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.validate()) return;
        if (isEdit) {
            form.put(`/settings/sites/${site!.id}`, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            form.post('/settings/sites', {
                preserveScroll: true,
                onSuccess: () => { form.reset(); onSuccess(); },
            });
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
                <Label>{t('Address')}</Label>
                <Input value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
                <InputError message={form.errors.address} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>{t('Latitude')}</Label>
                    <Input
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        value={form.data.latitude}
                        onChange={(e) => form.setData('latitude', e.target.value)}
                        placeholder="-90 to 90"
                        className="font-mono tabular-nums"
                    />
                    <InputError message={form.errors.latitude} />
                </div>
                <div className="grid gap-2">
                    <Label>{t('Longitude')}</Label>
                    <Input
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        value={form.data.longitude}
                        onChange={(e) => form.setData('longitude', e.target.value)}
                        placeholder="-180 to 180"
                        className="font-mono tabular-nums"
                    />
                    <InputError message={form.errors.longitude} />
                </div>
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
                    <Input
                        type="time"
                        value={form.data.opening_hour}
                        onChange={(e) => form.setData('opening_hour', e.target.value)}
                        className="font-mono tabular-nums"
                    />
                    <InputError message={form.errors.opening_hour} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label>{t('Status')}</Label>
                <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('Select status')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                        <SelectItem value="active">{t('Active')}</SelectItem>
                        <SelectItem value="suspended">{t('Suspended')}</SelectItem>
                    </SelectContent>
                </Select>
                <InputError message={form.errors.status} />
            </div>

            <Button type="submit" disabled={form.processing} className="w-full">
                {isEdit ? t('Update Site') : t('Create Site')}
            </Button>
        </form>
    );
}
