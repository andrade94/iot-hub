import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DataTable } from '@/components/ui/data-table';
import { DetailCard } from '@/components/ui/detail-card';
import { FadeIn } from '@/components/ui/fade-in';
import { FormSection } from '@/components/ui/form-section';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Subscription } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    ArrowLeft,
    MapPin,
    Palette,
    Pencil,
    Save,
    Settings,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';

/* -- Types ------------------------------------------------------------ */

interface SiteWithCounts {
    id: number;
    name: string;
    status: string;
    timezone: string | null;
    devices_count: number;
    gateways_count: number;
}

interface UserSummary {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
}

interface OrganizationDetail {
    id: number;
    name: string;
    slug: string;
    segment: string | null;
    plan: string | null;
    status: string;
    logo: string | null;
    branding: Record<string, string> | null;
    default_timezone: string | null;
    default_opening_hour: string | null;
    created_at: string;
}

interface Props {
    organization: OrganizationDetail;
    sites: SiteWithCounts[];
    users: UserSummary[];
    subscription?: Subscription | null;
    timezones: string[];
}

/* -- Constants -------------------------------------------------------- */

const SEGMENTS = ['retail', 'cold_chain', 'industrial', 'commercial', 'foodservice'] as const;
const PLANS = ['starter', 'standard', 'enterprise'] as const;

const statusVariants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    active: 'success',
    onboarding: 'warning',
    suspended: 'destructive',
    archived: 'secondary',
};

const segmentVariants: Record<string, 'info' | 'secondary' | 'outline' | 'warning' | 'success'> = {
    retail: 'info',
    cold_chain: 'secondary',
    industrial: 'warning',
    commercial: 'outline',
    foodservice: 'success',
};

const siteStatusVariants: Record<string, 'success' | 'warning' | 'outline'> = {
    active: 'success',
    onboarding: 'warning',
    draft: 'outline',
    suspended: 'warning',
};

/* -- Section Divider -------------------------------------------------- */

function SectionDivider({ label, badge }: { label: string; badge?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {label}
            </span>
            {badge}
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

/* -- Main Component --------------------------------------------------- */

export default function OrganizationShow({ organization, sites, users, timezones }: Props) {
    const { t } = useLang();
    const [suspendOpen, setSuspendOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [reactivateOpen, setReactivateOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Settings', href: '/settings/profile' },
        { title: 'Organizations', href: '/settings/organizations' },
        { title: organization.name, href: '#' },
    ];

    const totalDevices = sites.reduce((sum, s) => sum + s.devices_count, 0);

    function handleSuspend() {
        setActionLoading(true);
        router.post(`/settings/organizations/${organization.id}/suspend`, {}, {
            preserveScroll: true,
            onFinish: () => { setActionLoading(false); setSuspendOpen(false); },
        });
    }

    function handleReactivate() {
        setActionLoading(true);
        router.post(`/settings/organizations/${organization.id}/reactivate`, {}, {
            preserveScroll: true,
            onFinish: () => { setActionLoading(false); setReactivateOpen(false); },
        });
    }

    function handleArchive() {
        setActionLoading(true);
        router.delete(`/settings/organizations/${organization.id}`, {
            onFinish: () => { setActionLoading(false); setArchiveOpen(false); },
        });
    }

    // -- Sites DataTable columns --
    const siteColumns = useMemo<ColumnDef<SiteWithCounts>[]>(
        () => [
            {
                accessorKey: 'name',
                header: () => t('Name'),
                cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
            },
            {
                accessorKey: 'status',
                header: () => t('Status'),
                cell: ({ row }) => (
                    <Badge variant={siteStatusVariants[row.original.status] ?? 'outline'} className="text-xs capitalize">
                        {row.original.status}
                    </Badge>
                ),
            },
            {
                accessorKey: 'devices_count',
                header: () => t('Devices'),
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums">{row.original.devices_count}</span>
                ),
            },
            {
                accessorKey: 'gateways_count',
                header: () => t('Gateways'),
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums">{row.original.gateways_count}</span>
                ),
            },
        ],
        [t],
    );

    // -- Users DataTable columns --
    const userColumns = useMemo<ColumnDef<UserSummary>[]>(
        () => [
            {
                accessorKey: 'name',
                header: () => t('Name'),
                cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
            },
            {
                accessorKey: 'email',
                header: () => t('Email'),
                cell: ({ row }) => (
                    <span className="text-muted-foreground">{row.original.email}</span>
                ),
            },
            {
                accessorKey: 'role',
                header: () => t('Role'),
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-xs">
                        {row.original.role.replace('_', ' ')}
                    </Badge>
                ),
            },
        ],
        [t],
    );

    // -- Sites empty state --
    const sitesEmptyState = (
        <div className="flex flex-col items-center gap-2 py-8">
            <MapPin className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t('No sites configured')}</p>
        </div>
    );

    // -- Users empty state --
    const usersEmptyState = (
        <div className="flex flex-col items-center gap-2 py-8">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t('No users')}</p>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${organization.name} — ${t('Organizations')}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header -------------------------------------------------- */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start gap-4 p-6 md:p-8">
                            <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => router.get('/settings/organizations')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex-1">
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Organization')}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                                    <h1 className="font-display text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                        {organization.name}
                                    </h1>
                                    <Badge variant={statusVariants[organization.status] ?? 'outline'} className="capitalize">
                                        {organization.status}
                                    </Badge>
                                    {organization.segment && (
                                        <Badge variant={segmentVariants[organization.segment] ?? 'outline'} className="capitalize">
                                            {organization.segment.replace('_', ' ')}
                                        </Badge>
                                    )}
                                    {organization.plan && (
                                        <Badge variant="secondary" className="capitalize">
                                            {organization.plan}
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums">{sites.length}</span> {t('sites')} /{' '}
                                    <span className="font-mono tabular-nums">{totalDevices}</span> {t('devices')} /{' '}
                                    <span className="font-mono tabular-nums">{users.length}</span> {t('users')}
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                    {/* -- Left Column: Main Content ------------------------------- */}
                    <div className="space-y-6">
                        {/* Overview */}
                        <FadeIn delay={75} duration={400}>
                            <SectionDivider label={t('Overview')} />
                        </FadeIn>
                        <FadeIn delay={100} duration={400}>
                            <DetailCard
                                title={t('Organization Details')}
                                className="shadow-elevation-1"
                                items={[
                                    { label: t('Name'), value: organization.name },
                                    { label: t('Slug'), value: <code className="font-mono text-xs">{organization.slug}</code> },
                                    {
                                        label: t('Segment'),
                                        value: organization.segment ? (
                                            <Badge variant={segmentVariants[organization.segment] ?? 'outline'} className="text-xs capitalize">
                                                {organization.segment.replace('_', ' ')}
                                            </Badge>
                                        ) : '--',
                                    },
                                    {
                                        label: t('Plan'),
                                        value: organization.plan ? (
                                            <Badge variant="secondary" className="text-xs capitalize">{organization.plan}</Badge>
                                        ) : '--',
                                    },
                                    { label: t('Timezone'), value: organization.default_timezone ?? '--' },
                                    {
                                        label: t('Opening Hour'),
                                        value: <span className="font-mono tabular-nums">{organization.default_opening_hour ?? '--'}</span>,
                                    },
                                    { label: t('Created'), value: <span className="font-mono tabular-nums">{formatTimeAgo(organization.created_at)}</span> },
                                ]}
                            />
                        </FadeIn>

                        {/* Sites */}
                        <FadeIn delay={150} duration={400}>
                            <SectionDivider
                                label={t('Sites')}
                                badge={
                                    <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                                        {sites.length}
                                    </Badge>
                                }
                            />
                        </FadeIn>
                        <FadeIn delay={175} duration={400}>
                            <Card className="shadow-elevation-1">
                                <DataTable
                                    columns={siteColumns}
                                    data={sites}
                                    getRowId={(row) => String(row.id)}
                                    onRowClick={(site) => router.get(`/sites/${site.id}`)}
                                    bordered={false}
                                    emptyState={sitesEmptyState}
                                />
                            </Card>
                        </FadeIn>

                        {/* Users */}
                        <FadeIn delay={225} duration={400}>
                            <SectionDivider
                                label={t('Users')}
                                badge={
                                    <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                                        {users.length}
                                    </Badge>
                                }
                            />
                        </FadeIn>
                        <FadeIn delay={250} duration={400}>
                            <Card className="shadow-elevation-1">
                                <DataTable
                                    columns={userColumns}
                                    data={users}
                                    getRowId={(row) => String(row.id)}
                                    bordered={false}
                                    emptyState={usersEmptyState}
                                />
                            </Card>
                        </FadeIn>
                    </div>

                    {/* -- Right Sidebar ------------------------------------------- */}
                    <div className="space-y-6">
                        {/* Edit Form */}
                        <FadeIn delay={100} duration={400}>
                            <EditOrganizationForm organization={organization} timezones={timezones} />
                        </FadeIn>

                        {/* Branding */}
                        <FadeIn delay={175} duration={400}>
                            <BrandingSection organization={organization} />
                        </FadeIn>

                        {/* Actions */}
                        <FadeIn delay={250} duration={400}>
                            <SectionDivider label={t('Actions')} />
                        </FadeIn>
                        <FadeIn delay={275} duration={400}>
                            <FormSection title={t('Lifecycle')} icon={Settings} description={t('Organization lifecycle management')} className="shadow-elevation-1">
                                <div className="space-y-3">
                                    {['active', 'onboarding'].includes(organization.status) && (
                                        <Button
                                            variant="outline"
                                            className="w-full text-amber-600 hover:text-amber-700"
                                            onClick={() => setSuspendOpen(true)}
                                        >
                                            {t('Suspend Organization')}
                                        </Button>
                                    )}
                                    {organization.status === 'suspended' && (
                                        <Button
                                            variant="outline"
                                            className="w-full text-emerald-600 hover:text-emerald-700"
                                            onClick={() => setReactivateOpen(true)}
                                        >
                                            {t('Reactivate Organization')}
                                        </Button>
                                    )}
                                    {organization.status !== 'archived' && (
                                        <Button
                                            variant="outline"
                                            className="w-full text-destructive hover:text-destructive"
                                            onClick={() => setArchiveOpen(true)}
                                        >
                                            {t('Archive Organization')}
                                        </Button>
                                    )}
                                </div>
                            </FormSection>
                        </FadeIn>
                    </div>
                </div>
            </div>

            {/* -- Confirmation Dialogs ---------------------------------------- */}
            <ConfirmationDialog
                open={suspendOpen}
                onOpenChange={setSuspendOpen}
                title={t('Suspend Organization')}
                description={`${t('Are you sure you want to suspend')} "${organization.name}"?`}
                warningMessage={t('Monitoring will continue but users will see a suspension warning. The organization can be reactivated later.')}
                loading={actionLoading}
                onConfirm={handleSuspend}
                actionLabel={t('Suspend')}
            />

            <ConfirmationDialog
                open={reactivateOpen}
                onOpenChange={setReactivateOpen}
                title={t('Reactivate Organization')}
                description={`${t('Are you sure you want to reactivate')} "${organization.name}"?`}
                warningMessage={t('The organization will return to active status and all users will regain full access.')}
                loading={actionLoading}
                onConfirm={handleReactivate}
                actionLabel={t('Reactivate')}
            />

            <ConfirmationDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title={t('Archive Organization')}
                description={`${t('Are you sure you want to archive')} "${organization.name}"?`}
                warningMessage={t('This is a permanent action. Data will be retained for 12 months then deleted. The organization cannot be reactivated.')}
                loading={actionLoading}
                onConfirm={handleArchive}
                actionLabel={t('Archive')}
            />
        </AppLayout>
    );
}

/* -- Edit Organization Form ------------------------------------------- */

const editSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
    segment: z.string().min(1, 'Segment is required'),
    plan: z.string().min(1, 'Plan is required'),
    default_timezone: z.string().optional(),
    default_opening_hour: z.string().optional(),
});

function EditOrganizationForm({ organization, timezones }: { organization: OrganizationDetail; timezones: string[] }) {
    const { t } = useLang();
    const form = useValidatedForm(editSchema, {
        name: organization.name,
        slug: organization.slug,
        segment: organization.segment ?? '',
        plan: organization.plan ?? '',
        default_timezone: organization.default_timezone ?? '',
        default_opening_hour: organization.default_opening_hour ?? '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.submit('put', `/settings/organizations/${organization.id}`, {
            preserveScroll: true,
        });
    }

    return (
        <FormSection title={t('Edit Organization')} icon={Pencil} description={t('Update organization details')} className="shadow-elevation-1">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>{t('Name')}</Label>
                    <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                    <InputError message={form.errors.name} />
                </div>

                <div className="space-y-2">
                    <Label>{t('Slug')}</Label>
                    <Input value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} />
                    <InputError message={form.errors.slug} />
                </div>

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

                <div className="space-y-2">
                    <Label>{t('Timezone')}</Label>
                    <Select value={form.data.default_timezone} onValueChange={(v) => form.setData('default_timezone', v)}>
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
                    <InputError message={form.errors.default_timezone} />
                </div>

                <div className="space-y-2">
                    <Label>{t('Opening Hour')}</Label>
                    <Input
                        type="time"
                        value={form.data.default_opening_hour}
                        onChange={(e) => form.setData('default_opening_hour', e.target.value)}
                        className="font-mono tabular-nums"
                    />
                    <InputError message={form.errors.default_opening_hour} />
                </div>

                <Button type="submit" className="w-full" disabled={form.processing}>
                    <Save className="mr-2 h-4 w-4" />
                    {form.processing ? t('Saving...') : t('Save Changes')}
                </Button>
            </form>
        </FormSection>
    );
}

/* -- Branding Section ------------------------------------------------- */

function BrandingSection({ organization }: { organization: OrganizationDetail }) {
    const { t } = useLang();
    const [primaryColor, setPrimaryColor] = useState(organization.branding?.primary_color ?? '');
    const [secondaryColor, setSecondaryColor] = useState(organization.branding?.secondary_color ?? '');
    const [accentColor, setAccentColor] = useState(organization.branding?.accent_color ?? '');
    const [logoUrl, setLogoUrl] = useState(organization.logo ?? '');
    const [saving, setSaving] = useState(false);

    function handleSave() {
        setSaving(true);
        router.put(`/settings/organizations/${organization.id}`, {
            name: organization.name,
            slug: organization.slug,
            segment: organization.segment ?? '',
            plan: organization.plan ?? '',
            logo: logoUrl,
            branding: {
                primary_color: primaryColor,
                secondary_color: secondaryColor,
                accent_color: accentColor,
            },
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    }

    return (
        <FormSection title={t('Branding')} icon={Palette} description={t('Visual identity settings')} className="shadow-elevation-1">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>{t('Logo URL')}</Label>
                    <Input
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://..."
                    />
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                        <Label className="text-xs">{t('Primary')}</Label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={primaryColor || '#000000'}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="h-8 w-8 cursor-pointer rounded border border-border"
                            />
                            <Input
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                placeholder="#000000"
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">{t('Secondary')}</Label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={secondaryColor || '#000000'}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                className="h-8 w-8 cursor-pointer rounded border border-border"
                            />
                            <Input
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                placeholder="#000000"
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">{t('Accent')}</Label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={accentColor || '#000000'}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="h-8 w-8 cursor-pointer rounded border border-border"
                            />
                            <Input
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                placeholder="#000000"
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>
                </div>

                <Button variant="outline" className="w-full" onClick={handleSave} disabled={saving}>
                    <Palette className="mr-2 h-4 w-4" />
                    {saving ? t('Saving...') : t('Save Branding')}
                </Button>
            </div>
        </FormSection>
    );
}
