import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { FormSection } from '@/components/ui/form-section';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BillingProfile, BreadcrumbItem } from '@/types';
import { billingProfileSchema } from '@/utils/schemas';
import { Head, router } from '@inertiajs/react';
import { Building2, Pencil, Plus, Receipt, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    profiles: BillingProfile[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Billing', href: '/settings/billing' },
    { title: 'Profiles', href: '#' },
];

export default function BillingProfiles({ profiles }: Props) {
    const { t } = useLang();
    const [showForm, setShowForm] = useState(false);
    const [editingProfile, setEditingProfile] = useState<BillingProfile | null>(null);
    const [deletingProfile, setDeletingProfile] = useState<BillingProfile | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const form = useValidatedForm(billingProfileSchema, {
        name: '',
        rfc: '',
        razon_social: '',
        regimen_fiscal: '',
        uso_cfdi: '',
        email_facturacion: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.validate()) return;
        form.post('/settings/billing/profiles', {
            preserveScroll: true,
            onSuccess: () => { form.reset(); setShowForm(false); },
        });
    }

    function handleDelete() {
        if (!deletingProfile) return;
        setDeleteLoading(true);
        router.delete(`/settings/billing/profiles/${deletingProfile.id}`, {
            preserveScroll: true,
            onSuccess: () => { setDeletingProfile(null); setDeleteLoading(false); },
            onError: () => setDeleteLoading(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Billing Profiles')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header ------------------------------------------------ */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Billing Profiles')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Billing Profiles')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                        {profiles.length}
                                    </span>{' '}
                                    {t('profile(s)')}
                                </p>
                            </div>
                            <Button onClick={() => setShowForm(!showForm)}>
                                <Plus className="mr-2 h-4 w-4" />{t('New Profile')}
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* -- Create form ------------------------------------------- */}
                {showForm && (
                    <FadeIn delay={80} duration={400}>
                        <FormSection icon={Receipt} title={t('New Billing Profile')} description={t('Add fiscal data for invoicing')} className="shadow-elevation-1">
                            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>{t('Profile Name')}</Label>
                                    <Input
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        placeholder={t('e.g. Main Office')}
                                    />
                                    {form.errors.name && (
                                        <p className="text-sm text-destructive">{form.errors.name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('RFC')}</Label>
                                    <Input
                                        value={form.data.rfc}
                                        onChange={(e) => form.setData('rfc', e.target.value.toUpperCase())}
                                        placeholder="XAXX010101000"
                                        className="font-mono tabular-nums"
                                    />
                                    {form.errors.rfc && (
                                        <p className="text-sm text-destructive">{form.errors.rfc}</p>
                                    )}
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label>{t('Razon Social')}</Label>
                                    <Input
                                        value={form.data.razon_social}
                                        onChange={(e) => form.setData('razon_social', e.target.value)}
                                        placeholder={t('Legal company name')}
                                    />
                                    {form.errors.razon_social && (
                                        <p className="text-sm text-destructive">{form.errors.razon_social}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Regimen Fiscal')}</Label>
                                    <Input
                                        value={form.data.regimen_fiscal}
                                        onChange={(e) => form.setData('regimen_fiscal', e.target.value)}
                                        placeholder="601"
                                        className="font-mono tabular-nums"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Uso CFDI')}</Label>
                                    <Input
                                        value={form.data.uso_cfdi}
                                        onChange={(e) => form.setData('uso_cfdi', e.target.value)}
                                        placeholder="G03"
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label>{t('Email Facturacion')}</Label>
                                    <Input
                                        type="email"
                                        value={form.data.email_facturacion}
                                        onChange={(e) => form.setData('email_facturacion', e.target.value)}
                                        placeholder="facturacion@empresa.com"
                                    />
                                </div>
                                <div className="flex gap-2 sm:col-span-2">
                                    <Button type="submit" disabled={form.processing}>
                                        <Save className="mr-2 h-4 w-4" />{t('Save Profile')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                        {t('Cancel')}
                                    </Button>
                                </div>
                            </form>
                        </FormSection>
                    </FadeIn>
                )}

                {/* -- Profiles list ----------------------------------------- */}
                <FadeIn delay={150} duration={500}>
                    <div>
                        <div className="mb-3 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Profiles')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {profiles.map((profile, idx) => (
                                <FadeIn key={profile.id} delay={200 + idx * 80} duration={500}>
                                    <Card className="shadow-elevation-1">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center gap-2 text-sm">
                                                    <Building2 className="h-4 w-4" />
                                                    {profile.name}
                                                </CardTitle>
                                                <div className="flex items-center gap-1">
                                                    {profile.is_default && (
                                                        <Badge variant="success" className="mr-1 text-xs">
                                                            {t('Default')}
                                                        </Badge>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => setEditingProfile(profile)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                                        onClick={() => setDeletingProfile(profile)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('RFC')}</span>
                                                <span className="font-mono font-medium tabular-nums">
                                                    {profile.rfc}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">{t('Razon Social')}</span>
                                                <span className="text-right font-medium">
                                                    {profile.razon_social}
                                                </span>
                                            </div>
                                            {profile.regimen_fiscal && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">{t('Regimen')}</span>
                                                    <span className="font-mono tabular-nums">
                                                        {profile.regimen_fiscal}
                                                    </span>
                                                </div>
                                            )}
                                            {profile.email_facturacion && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">{t('Email')}</span>
                                                    <span className="text-xs">
                                                        {profile.email_facturacion}
                                                    </span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </FadeIn>

                {/* -- Edit Dialog ------------------------------------------- */}
                {editingProfile && (
                    <EditProfileDialog
                        profile={editingProfile}
                        open={!!editingProfile}
                        onOpenChange={(open) => !open && setEditingProfile(null)}
                    />
                )}

                {/* -- Delete Confirmation ----------------------------------- */}
                <ConfirmationDialog
                    open={!!deletingProfile}
                    onOpenChange={(open) => !open && setDeletingProfile(null)}
                    title={t('Delete Billing Profile')}
                    description={t('Are you sure you want to delete the billing profile ":name"?', { name: deletingProfile?.name ?? '' })}
                    warningMessage={t('This action cannot be undone. Any linked invoices will lose their profile reference.')}
                    loading={deleteLoading}
                    onConfirm={handleDelete}
                    actionLabel={t('Delete Profile')}
                />
            </div>
        </AppLayout>
    );
}

/* -- Edit Profile Dialog ---------------------------------------------------- */

function EditProfileDialog({
    profile,
    open,
    onOpenChange,
}: {
    profile: BillingProfile;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { t } = useLang();

    const editForm = useValidatedForm(billingProfileSchema, {
        name: profile.name,
        rfc: profile.rfc,
        razon_social: profile.razon_social,
        regimen_fiscal: profile.regimen_fiscal ?? '',
        uso_cfdi: profile.uso_cfdi ?? '',
        email_facturacion: profile.email_facturacion ?? '',
    });

    function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editForm.validate()) return;
        editForm.put(`/settings/billing/profiles/${profile.id}`, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('Edit Billing Profile')}</DialogTitle>
                    <DialogDescription>{t('Update fiscal data for invoicing')}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>{t('Profile Name')}</Label>
                        <Input
                            value={editForm.data.name}
                            onChange={(e) => editForm.setData('name', e.target.value)}
                            placeholder={t('e.g. Main Office')}
                        />
                        {editForm.errors.name && (
                            <p className="text-sm text-destructive">{editForm.errors.name}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>{t('RFC')}</Label>
                        <Input
                            value={editForm.data.rfc}
                            onChange={(e) => editForm.setData('rfc', e.target.value.toUpperCase())}
                            placeholder="XAXX010101000"
                            className="font-mono tabular-nums"
                        />
                        {editForm.errors.rfc && (
                            <p className="text-sm text-destructive">{editForm.errors.rfc}</p>
                        )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label>{t('Razon Social')}</Label>
                        <Input
                            value={editForm.data.razon_social}
                            onChange={(e) => editForm.setData('razon_social', e.target.value)}
                            placeholder={t('Legal company name')}
                        />
                        {editForm.errors.razon_social && (
                            <p className="text-sm text-destructive">{editForm.errors.razon_social}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Regimen Fiscal')}</Label>
                        <Input
                            value={editForm.data.regimen_fiscal}
                            onChange={(e) => editForm.setData('regimen_fiscal', e.target.value)}
                            placeholder="601"
                            className="font-mono tabular-nums"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Uso CFDI')}</Label>
                        <Input
                            value={editForm.data.uso_cfdi}
                            onChange={(e) => editForm.setData('uso_cfdi', e.target.value)}
                            placeholder="G03"
                            className="font-mono"
                        />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label>{t('Email Facturacion')}</Label>
                        <Input
                            type="email"
                            value={editForm.data.email_facturacion}
                            onChange={(e) => editForm.setData('email_facturacion', e.target.value)}
                            placeholder="facturacion@empresa.com"
                        />
                    </div>
                    <div className="flex gap-2 sm:col-span-2">
                        <Button type="submit" disabled={editForm.processing}>
                            <Save className="mr-2 h-4 w-4" />{t('Update Profile')}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('Cancel')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
