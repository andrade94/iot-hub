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
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { TimeInput } from '@/components/ui/time-input';
import { formatTimeAgo } from '@/utils/date';
import { siteSchema } from '@/utils/schemas';
import { Head, Link, router } from '@inertiajs/react';
import { FileSpreadsheet, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface SiteRecord {
    id: number;
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    status: 'draft' | 'active' | 'suspended' | 'onboarding';
    timezone: string | null;
    opening_hour: string | null;
    device_count: number;
    gateway_count: number;
    organization_name?: string;
    created_at: string;
}

interface Props {
    sites: SiteRecord[];
    timezones: string[];
    allOrgsMode?: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Sites', href: '#' },
];

const statusBadgeVariant: Record<string, 'success' | 'outline' | 'warning' | 'info'> = {
    active: 'success',
    draft: 'outline',
    onboarding: 'info',
    suspended: 'warning',
};


export default function SitesIndex({ sites, timezones, allOrgsMode = false }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [editSite, setEditSite] = useState<SiteRecord | null>(null);
    const [deleteSite, setDeleteSite] = useState<SiteRecord | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filtered = useMemo(() => {
        let result = sites;
        if (statusFilter !== 'all') result = result.filter((s) => s.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((s) => s.name.toLowerCase().includes(q) || (s.address ?? '').toLowerCase().includes(q));
        }
        return result;
    }, [sites, search, statusFilter]);

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
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground md:text-[32px]">
                                {t('Site Management')}
                            </h1>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                <span className="font-mono tabular-nums font-medium text-foreground">{sites.length}</span>{' '}
                                {t('site(s) configured')}
                            </p>
                        </div>
                        <Can permission="manage sites">
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="text-[11px]" asChild>
                                    <Link href="/settings/sites/batch-import">
                                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />{t('Batch Import')}
                                    </Link>
                                </Button>
                                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="text-[11px]"><Plus className="mr-1.5 h-3.5 w-3.5" />{t('Create Site')}</Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>{t('Create Site')}</DialogTitle>
                                        </DialogHeader>
                                        <SiteForm timezones={timezones} onSuccess={() => setShowCreate(false)} />
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </Can>
                    </div>
                </FadeIn>

                {/* ━━ FILTERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={400}>
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('Search sites...')} className="h-8 pl-9 text-[12px]" />
                        </div>
                        <div className="flex overflow-hidden rounded-md border border-border">
                            {['all', 'active', 'draft', 'onboarding', 'suspended'].map((s) => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                    className={cn('px-3 py-1.5 font-mono text-[10px] font-medium transition-colors border-r border-border last:border-r-0',
                                        statusFilter === s ? 'bg-accent text-foreground' : 'text-muted-foreground/60 hover:bg-accent/30')}>
                                    {s === 'all' ? t('All') : <span className="capitalize">{s}</span>}
                                </button>
                            ))}
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground/60">{filtered.length}/{sites.length}</span>
                    </div>
                </FadeIn>

                {/* ━━ TABLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={100} duration={400}>
                    <Card className="mt-4 border-border shadow-none overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Name')}</TableHead>
                                    {allOrgsMode && <TableHead>{t('Organization')}</TableHead>}
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead>{t('Timezone')}</TableHead>
                                    <TableHead>{t('Devices')}</TableHead>
                                    <TableHead>{t('Gateways')}</TableHead>
                                    <TableHead>{t('Created')}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={allOrgsMode ? 8 : 7} className="py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <MapPin className="h-6 w-6 text-muted-foreground/30" />
                                                <p className="text-[13px] text-muted-foreground">{search ? t('No sites match your search') : t('No sites configured')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((site) => (
                                        <TableRow key={site.id} className="group">
                                            <TableCell>
                                                <Link href={`/sites/${site.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                                                    {site.name}
                                                </Link>
                                                {site.address && <p className="truncate text-[10px] text-muted-foreground/60 max-w-[200px]">{site.address}</p>}
                                            </TableCell>
                                            {allOrgsMode && (
                                                <TableCell className="text-[12px] text-muted-foreground">{site.organization_name ?? '-'}</TableCell>
                                            )}
                                            <TableCell>
                                                <Badge variant={statusBadgeVariant[site.status] ?? 'outline'} className="text-[9px] capitalize">
                                                    {site.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-[11px] text-muted-foreground">{site.timezone ?? '-'}</TableCell>
                                            <TableCell className="font-mono text-[11px] tabular-nums text-muted-foreground">{site.device_count}</TableCell>
                                            <TableCell className="font-mono text-[11px] tabular-nums text-muted-foreground">{site.gateway_count}</TableCell>
                                            <TableCell className="font-mono text-[10px] tabular-nums text-muted-foreground">{formatTimeAgo(site.created_at)}</TableCell>
                                            <TableCell>
                                                <Can permission="manage sites">
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {(site.status === 'onboarding' || site.status === 'draft') && (
                                                            <Button variant="outline" size="sm" className="h-7 text-[10px]"
                                                                onClick={() => router.get(`/sites/${site.id}/onboard`)}>
                                                                {t('Setup')}
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
                                                                <SiteForm site={site} timezones={timezones} onSuccess={() => setEditSite(null)} />
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleteSite(site)}>
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
        lat: site?.lat ?? '',
        lng: site?.lng ?? '',
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
                        value={form.data.lat}
                        onChange={(e) => form.setData('lat', e.target.value)}
                        placeholder="-90 to 90"
                        className="font-mono tabular-nums"
                    />
                    <InputError message={form.errors.lat} />
                </div>
                <div className="grid gap-2">
                    <Label>{t('Longitude')}</Label>
                    <Input
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        value={form.data.lng}
                        onChange={(e) => form.setData('lng', e.target.value)}
                        placeholder="-180 to 180"
                        className="font-mono tabular-nums"
                    />
                    <InputError message={form.errors.lng} />
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
                    <TimeInput
                        value={form.data.opening_hour}
                        onChange={(v) => form.setData('opening_hour', v)}
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
