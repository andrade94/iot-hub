import HeadingSmall from '@/components/ui/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/ui/fade-in';
import { FormSection } from '@/components/ui/form-section';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem, Organization } from '@/types';
import { Transition } from '@headlessui/react';
import { useValidatedForm } from '@/hooks/use-validated-form';
import { organizationSettingsSchema } from '@/utils/schemas';
import { Head } from '@inertiajs/react';
import { Building2, Palette } from 'lucide-react';

interface Props {
    organization: Organization;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Organization', href: '#' },
];

export default function OrganizationSettings({ organization }: Props) {
    const { t } = useLang();

    const brandingData = organization.branding as Record<string, string> | null;

    const form = useValidatedForm(organizationSettingsSchema, {
        name: organization.name,
        default_timezone: organization.default_timezone ?? '',
        default_opening_hour: organization.default_opening_hour ?? '',
        logo: organization.logo ?? '',
        branding: {
            primary_color: brandingData?.primary_color ?? '',
            secondary_color: brandingData?.secondary_color ?? '',
            accent_color: brandingData?.accent_color ?? '',
            font_family: brandingData?.font_family ?? '',
        },
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.validate()) return;
        form.patch('/settings/organization', {
            preserveScroll: true,
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Organization Settings')} />

            <SettingsLayout>
                <FadeIn duration={400}>
                    <div className="space-y-6">
                        <HeadingSmall
                            title={t('Organization settings')}
                            description={t('Manage your organization\'s profile and defaults')}
                        />

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* ── Profile Section ─────────────────── */}
                            <FormSection icon={Building2} title={t('Profile')} description={t('Basic organization information')}>
                                <div className="space-y-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">{t('Organization Name')}</Label>
                                        <Input
                                            id="name"
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            required
                                        />
                                        <InputError message={form.errors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="default_timezone">{t('Default Timezone')}</Label>
                                        <Input
                                            id="default_timezone"
                                            value={form.data.default_timezone}
                                            onChange={(e) => form.setData('default_timezone', e.target.value)}
                                            placeholder="America/Mexico_City"
                                        />
                                        <InputError message={form.errors.default_timezone} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="default_opening_hour">{t('Default Opening Hour')}</Label>
                                        <Input
                                            id="default_opening_hour"
                                            type="time"
                                            value={form.data.default_opening_hour}
                                            onChange={(e) => form.setData('default_opening_hour', e.target.value)}
                                            className="font-mono tabular-nums"
                                        />
                                        <InputError message={form.errors.default_opening_hour} />
                                    </div>
                                </div>
                            </FormSection>

                            {/* ── Branding Section ────────────────── */}
                            <FormSection icon={Palette} title={t('Branding')} description={t('Customize your organization appearance')}>
                                <div className="space-y-6">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="primary_color">{t('Primary Color')}</Label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    id="primary_color_picker"
                                                    value={form.data.branding.primary_color || '#3B82F6'}
                                                    onChange={(e) => form.setData('branding', { ...form.data.branding, primary_color: e.target.value })}
                                                    className="h-10 w-10 shrink-0 cursor-pointer rounded border p-0.5"
                                                />
                                                <Input
                                                    id="primary_color"
                                                    value={form.data.branding.primary_color}
                                                    onChange={(e) => form.setData('branding', { ...form.data.branding, primary_color: e.target.value })}
                                                    placeholder="#3B82F6"
                                                    className="font-mono tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="secondary_color">{t('Secondary Color')}</Label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    id="secondary_color_picker"
                                                    value={form.data.branding.secondary_color || '#6366F1'}
                                                    onChange={(e) => form.setData('branding', { ...form.data.branding, secondary_color: e.target.value })}
                                                    className="h-10 w-10 shrink-0 cursor-pointer rounded border p-0.5"
                                                />
                                                <Input
                                                    id="secondary_color"
                                                    value={form.data.branding.secondary_color}
                                                    onChange={(e) => form.setData('branding', { ...form.data.branding, secondary_color: e.target.value })}
                                                    placeholder="#6366F1"
                                                    className="font-mono tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="accent_color">{t('Accent Color')}</Label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    id="accent_color_picker"
                                                    value={form.data.branding.accent_color || '#10B981'}
                                                    onChange={(e) => form.setData('branding', { ...form.data.branding, accent_color: e.target.value })}
                                                    className="h-10 w-10 shrink-0 cursor-pointer rounded border p-0.5"
                                                />
                                                <Input
                                                    id="accent_color"
                                                    value={form.data.branding.accent_color}
                                                    onChange={(e) => form.setData('branding', { ...form.data.branding, accent_color: e.target.value })}
                                                    placeholder="#10B981"
                                                    className="font-mono tabular-nums"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="font_family">{t('Font Family')}</Label>
                                            <Input
                                                id="font_family"
                                                value={form.data.branding.font_family}
                                                onChange={(e) => form.setData('branding', { ...form.data.branding, font_family: e.target.value })}
                                                placeholder="Inter, sans-serif"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="logo">{t('Logo URL')}</Label>
                                        <Input
                                            id="logo"
                                            value={form.data.logo}
                                            onChange={(e) => form.setData('logo', e.target.value)}
                                            placeholder="https://example.com/logo.png"
                                        />
                                        <p className="text-muted-foreground text-xs">{t('Enter a URL to your organization logo image')}</p>
                                        {form.data.logo && (
                                            <div className="mt-2">
                                                <img
                                                    src={form.data.logo}
                                                    alt={t('Organization logo preview')}
                                                    className="h-12 w-auto rounded border object-contain"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </FormSection>

                            <div className="flex items-center gap-4">
                                <Button type="submit" disabled={form.processing}>
                                    {t('Save')}
                                </Button>

                                <Transition
                                    show={form.recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-sm text-neutral-600">{t('Saved')}</p>
                                </Transition>
                            </div>
                        </form>
                    </div>
                </FadeIn>
            </SettingsLayout>
        </AppLayout>
    );
}
