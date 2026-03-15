import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BillingProfile, BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Building2, Plus, Save } from 'lucide-react';
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

    const form = useForm({
        name: '',
        rfc: '',
        razon_social: '',
        regimen_fiscal: '',
        uso_cfdi: '',
        email_facturacion: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/settings/billing/profiles', {
            preserveScroll: true,
            onSuccess: () => { form.reset(); setShowForm(false); },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Billing Profiles')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Billing Profiles')}</h1>
                        <p className="text-sm text-muted-foreground">{profiles.length} {t('profile(s)')}</p>
                    </div>
                    <Button onClick={() => setShowForm(!showForm)}>
                        <Plus className="mr-2 h-4 w-4" />{t('New Profile')}
                    </Button>
                </div>

                {/* Create form */}
                {showForm && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('New Billing Profile')}</CardTitle>
                            <CardDescription>{t('Add fiscal data for invoicing')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>{t('Profile Name')}</Label>
                                    <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder={t('e.g. Main Office')} />
                                    {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('RFC')}</Label>
                                    <Input value={form.data.rfc} onChange={(e) => form.setData('rfc', e.target.value.toUpperCase())} placeholder="XAXX010101000" className="font-mono" />
                                    {form.errors.rfc && <p className="text-sm text-destructive">{form.errors.rfc}</p>}
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label>{t('Razón Social')}</Label>
                                    <Input value={form.data.razon_social} onChange={(e) => form.setData('razon_social', e.target.value)} placeholder={t('Legal company name')} />
                                    {form.errors.razon_social && <p className="text-sm text-destructive">{form.errors.razon_social}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Régimen Fiscal')}</Label>
                                    <Input value={form.data.regimen_fiscal} onChange={(e) => form.setData('regimen_fiscal', e.target.value)} placeholder="601" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Uso CFDI')}</Label>
                                    <Input value={form.data.uso_cfdi} onChange={(e) => form.setData('uso_cfdi', e.target.value)} placeholder="G03" />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label>{t('Email Facturación')}</Label>
                                    <Input type="email" value={form.data.email_facturacion} onChange={(e) => form.setData('email_facturacion', e.target.value)} placeholder="facturacion@empresa.com" />
                                </div>
                                <div className="flex gap-2 sm:col-span-2">
                                    <Button type="submit" disabled={form.processing}>
                                        <Save className="mr-2 h-4 w-4" />{t('Save Profile')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('Cancel')}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Profiles list */}
                <div className="grid gap-3 sm:grid-cols-2">
                    {profiles.map((profile) => (
                        <Card key={profile.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <Building2 className="h-4 w-4" />
                                        {profile.name}
                                    </CardTitle>
                                    {profile.is_default && <Badge variant="success" className="text-xs">{t('Default')}</Badge>}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('RFC')}</span>
                                    <span className="font-mono font-medium">{profile.rfc}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('Razón Social')}</span>
                                    <span className="text-right font-medium">{profile.razon_social}</span>
                                </div>
                                {profile.regimen_fiscal && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('Régimen')}</span>
                                        <span>{profile.regimen_fiscal}</span>
                                    </div>
                                )}
                                {profile.email_facturacion && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('Email')}</span>
                                        <span className="text-xs">{profile.email_facturacion}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
