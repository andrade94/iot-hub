import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import InputError from '@/components/input-error';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';

interface PartnerOrganization {
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    branding: Record<string, unknown> | null;
    segment: string | null;
    plan: string | null;
    sites_count: number;
    status: 'active' | 'onboarding' | 'suspended';
}

interface Props {
    organizations: PartnerOrganization[];
}

const SEGMENTS = ['retail', 'cold_chain', 'industrial', 'commercial', 'foodservice'] as const;
const PLANS = ['starter', 'standard', 'enterprise'] as const;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Partner Portal', href: '/partner' },
];

export default function PartnerIndex({ organizations }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Partner Portal')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Partner Portal')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {organizations.length} {t('organization(s)')}
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

                <Card className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Organization')}</TableHead>
                                <TableHead>{t('Slug')}</TableHead>
                                <TableHead>{t('Segment')}</TableHead>
                                <TableHead>{t('Plan')}</TableHead>
                                <TableHead>{t('Sites')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {organizations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                                        {t('No organizations')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                organizations.map((org) => (
                                    <TableRow key={org.id}>
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
                                        <TableCell className="tabular-nums">{org.sites_count}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={org.status} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AppLayout>
    );
}

function CreateOrganizationForm({ onSuccess }: { onSuccess: () => void }) {
    const { t } = useLang();
    const form = useForm({
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
        form.setData((prev) => ({
            ...prev,
            name: value,
            slug: generateSlug(value),
        }));
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        form.post('/partner', {
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
    const variants: Record<string, 'success' | 'warning' | 'destructive'> = {
        active: 'success',
        onboarding: 'warning',
        suspended: 'destructive',
    };
    return (
        <Badge variant={variants[status] ?? 'outline'} className="text-xs capitalize">
            {status}
        </Badge>
    );
}
