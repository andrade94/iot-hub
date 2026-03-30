import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import InputError from '@/components/input-error';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Archive, Building2, Pause, Plus } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

interface PartnerOrganization {
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    branding: Record<string, unknown> | null;
    segment: string | null;
    plan: string | null;
    sites_count: number;
    status: 'active' | 'onboarding' | 'suspended' | 'archived';
}

interface Props {
    organizations: PartnerOrganization[];
    segments: string[];
}

const PLANS = ['starter', 'standard', 'enterprise'] as const;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Partner Portal', href: '/partner' },
];

export default function PartnerIndex({ organizations, segments }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [suspendOrg, setSuspendOrg] = useState<PartnerOrganization | null>(null);
    const [archiveOrg, setArchiveOrg] = useState<PartnerOrganization | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    function handleSuspend() {
        if (!suspendOrg) return;
        setActionLoading(true);
        router.post(`/partner/${suspendOrg.id}/suspend`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setActionLoading(false);
                setSuspendOrg(null);
            },
        });
    }

    function handleArchive() {
        if (!archiveOrg) return;
        setActionLoading(true);
        router.post(`/partner/${archiveOrg.id}/archive`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setActionLoading(false);
                setArchiveOrg(null);
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Partner Portal')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Partner Portal')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Organizations')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums">{organizations.length}</span> {t('organization(s)')}
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
                                    <CreateOrganizationForm segments={segments} onSuccess={() => setShowCreate(false)} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Organizations Table ─────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div className="mb-2 flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Organizations')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>
                <FadeIn delay={150} duration={400}>
                    <Card className="flex-1 shadow-elevation-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Organization')}</TableHead>
                                    <TableHead>{t('Slug')}</TableHead>
                                    <TableHead>{t('Segment')}</TableHead>
                                    <TableHead>{t('Plan')}</TableHead>
                                    <TableHead>{t('Sites')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead>{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organizations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                                            {t('No organizations')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    organizations.map((org) => (
                                        <TableRow key={org.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.get(`/command-center/${org.id}`)}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        {org.logo ? (
                                                            <AvatarImage src={org.logo} alt={org.name} />
                                                        ) : null}
                                                        <AvatarFallback>
                                                            <Building2 className="h-4 w-4" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{org.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{org.slug}</TableCell>
                                            <TableCell>
                                                {org.segment ? (
                                                    <SegmentBadge segment={org.segment} />
                                                ) : (
                                                    <span className="text-muted-foreground">--</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {org.plan ? (
                                                    <PlanBadge plan={org.plan} />
                                                ) : (
                                                    <span className="text-muted-foreground">--</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono tabular-nums">{org.sites_count}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={org.status} />
                                            </TableCell>
                                            <TableCell>
                                                {/* Feature 3: Suspend/Archive actions (BLD-10) */}
                                                {['active', 'onboarding'].includes(org.status) && (
                                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-amber-600 hover:text-amber-700"
                                                            onClick={() => setSuspendOrg(org)}
                                                        >
                                                            <Pause className="mr-1 h-3.5 w-3.5" />
                                                            {t('Suspend')}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => setArchiveOrg(org)}
                                                        >
                                                            <Archive className="mr-1 h-3.5 w-3.5" />
                                                            {t('Archive')}
                                                        </Button>
                                                    </div>
                                                )}
                                                {org.status === 'suspended' && (
                                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => setArchiveOrg(org)}
                                                        >
                                                            <Archive className="mr-1 h-3.5 w-3.5" />
                                                            {t('Archive')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </FadeIn>
            </div>

            {/* ── Suspend Confirmation ─────────────────────────── */}
            <ConfirmationDialog
                open={!!suspendOrg}
                onOpenChange={(open) => !open && setSuspendOrg(null)}
                title={t('Suspend Organization')}
                description={
                    suspendOrg
                        ? `${t('Are you sure you want to suspend')} "${suspendOrg.name}"?`
                        : ''
                }
                warningMessage={t('Monitoring will continue but users will see a suspension warning. The organization can be reactivated later.')}
                loading={actionLoading}
                onConfirm={handleSuspend}
                actionLabel={t('Suspend')}
            />

            {/* ── Archive Confirmation ─────────────────────────── */}
            <ConfirmationDialog
                open={!!archiveOrg}
                onOpenChange={(open) => !open && setArchiveOrg(null)}
                title={t('Archive Organization')}
                description={
                    archiveOrg
                        ? `${t('Are you sure you want to archive')} "${archiveOrg.name}"?`
                        : ''
                }
                warningMessage={t('This is a permanent action. Data will be retained for 12 months then deleted. The organization cannot be reactivated.')}
                loading={actionLoading}
                onConfirm={handleArchive}
                actionLabel={t('Archive')}
            />
        </AppLayout>
    );
}

const organizationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    segment: z.string().min(1, 'Segment is required'),
    plan: z.string().min(1, 'Plan is required'),
    default_timezone: z.string().min(1, 'Timezone is required'),
});

function CreateOrganizationForm({ segments, onSuccess }: { segments: string[]; onSuccess: () => void }) {
    const { t } = useLang();
    const form = useValidatedForm(organizationSchema, {
        name: '',
        slug: '',
        segment: '',
        plan: '',
        default_timezone: 'America/Mexico_City',
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
        form.setData((prev) => ({
            ...prev,
            name: value,
            slug: generateSlug(value),
        }));
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
                            {segments.map((seg) => (
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

            </div>

            <Button type="submit" className="w-full" disabled={form.processing}>
                {form.processing ? t('Creating...') : t('Create Organization')}
            </Button>
        </form>
    );
}

function SegmentBadge({ segment }: { segment: string }) {
    const variants: Record<string, 'info' | 'secondary' | 'outline' | 'warning' | 'success'> = {
        retail: 'info',
        cold_chain: 'secondary',
        industrial: 'warning',
        commercial: 'outline',
        foodservice: 'success',
    };
    return (
        <Badge variant={variants[segment] ?? 'outline'} className="text-xs capitalize">
            {segment.replace('_', ' ')}
        </Badge>
    );
}

function PlanBadge({ plan }: { plan: string }) {
    const variants: Record<string, 'outline' | 'secondary' | 'default'> = {
        starter: 'outline',
        standard: 'secondary',
        enterprise: 'default',
    };
    return (
        <Badge variant={variants[plan] ?? 'outline'} className="text-xs capitalize">
            {plan}
        </Badge>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
        active: 'success',
        onboarding: 'warning',
        suspended: 'destructive',
        archived: 'secondary',
    };
    return (
        <Badge variant={variants[status] ?? 'outline'} className="text-xs capitalize">
            {status}
        </Badge>
    );
}
