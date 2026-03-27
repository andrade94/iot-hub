import InputError from '@/components/input-error';
import { type OrganizationRow, getOrganizationColumns } from '@/components/organizations/columns';
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
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

interface Props {
    organizations: OrganizationRow[];
}

const SEGMENTS = ['retail', 'cold_chain', 'industrial', 'commercial', 'foodservice'] as const;
const PLANS = ['starter', 'standard', 'enterprise'] as const;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Organizations', href: '#' },
];

/* -- Section Divider -------------------------------------------------- */

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

export default function OrganizationsIndex({ organizations }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [suspendOrg, setSuspendOrg] = useState<OrganizationRow | null>(null);
    const [archiveOrg, setArchiveOrg] = useState<OrganizationRow | null>(null);
    const [reactivateOrg, setReactivateOrg] = useState<OrganizationRow | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

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

    const columns = getOrganizationColumns({
        onView: (org) => router.get(`/settings/organizations/${org.id}`),
        onSuspend: (org) => setSuspendOrg(org),
        onReactivate: (org) => setReactivateOrg(org),
        onArchive: (org) => setArchiveOrg(org),
        t,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Organizations')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header -------------------------------------------------- */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Organizations')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Organization Catalog')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums font-medium text-foreground">{organizations.length}</span>{' '}
                                    {t('organization(s) registered')}
                                </p>
                            </div>
                            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Create Organization')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>{t('Create Organization')}</DialogTitle>
                                    </DialogHeader>
                                    <CreateOrganizationForm onSuccess={() => setShowCreate(false)} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </FadeIn>

                {/* -- Table Section ------------------------------------------- */}
                <FadeIn delay={75} duration={400}>
                    <SectionDivider label={t('All Organizations')} />
                </FadeIn>

                <FadeIn delay={150} duration={400}>
                    <Card className="shadow-elevation-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map((col) => (
                                        <TableHead key={col.key}>{col.header}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organizations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Building2 className="h-8 w-8 text-muted-foreground/50" />
                                                <p className="text-sm text-muted-foreground">{t('No organizations registered')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    organizations.map((org) => (
                                        <TableRow
                                            key={org.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => router.get(`/settings/organizations/${org.id}`)}
                                        >
                                            {columns.map((col) => (
                                                <TableCell key={col.key}>{col.render(org)}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
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

/* -- Create Organization Form ----------------------------------------- */

const organizationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    segment: z.string().min(1, 'Segment is required'),
    plan: z.string().min(1, 'Plan is required'),
    default_timezone: z.string().min(1, 'Timezone is required'),
    default_opening_hour: z.string().min(1, 'Opening hour is required'),
});

function CreateOrganizationForm({ onSuccess }: { onSuccess: () => void }) {
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
                            {SEGMENTS.map((seg) => (
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
