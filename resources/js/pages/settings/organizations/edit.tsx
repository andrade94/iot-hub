import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimezoneSelect } from '@/components/ui/timezone-select';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

const PLANS = ['starter', 'standard', 'professional', 'enterprise'] as const;

interface OrganizationEdit {
    id: number;
    name: string;
    slug: string;
    segment: string | null;
    plan: string | null;
    status: string;
    logo: string | null;
    branding: Record<string, string> | null;
    default_timezone: string | null;
}

interface Props {
    organization: OrganizationEdit;
    segments: string[];
    timezones: string[];
}

function formatSegment(slug: string): string {
    return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrganizationEditPage({ organization, segments, timezones }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Settings', href: '/settings/profile' },
        { title: 'Organizations', href: '/settings/organizations' },
        { title: organization.name, href: `/settings/organizations/${organization.id}` },
        { title: 'Edit', href: '#' },
    ];

    const form = useForm({
        name: organization.name,
        slug: organization.slug,
        segment: organization.segment ?? '',
        plan: organization.plan ?? '',
        default_timezone: organization.default_timezone ?? 'America/Mexico_City',
        logo: organization.logo ?? '',
        branding: {
            primary_color: organization.branding?.primary_color ?? '',
            secondary_color: organization.branding?.secondary_color ?? '',
            accent_color: organization.branding?.accent_color ?? '',
        },
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.put(`/settings/organizations/${organization.id}`, {
            onSuccess: () => router.get(`/settings/organizations/${organization.id}`),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Edit')} — ${organization.name}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">

                {/* Header */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <button onClick={() => router.get(`/settings/organizations/${organization.id}`)} className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                <ArrowLeft className="h-3 w-3" />{organization.name}
                            </button>
                            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[28px]">
                                {t('Edit Organization')}
                            </h1>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                {t('Update organization profile, settings, and branding.')}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                <form onSubmit={handleSubmit} className="mt-6 max-w-2xl">

                    {/* ── PROFILE ── */}
                    <FadeIn delay={50} duration={400}>
                        <SectionDivider label={t('Profile')} />
                        <Card className="border-border shadow-none">
                            <CardContent className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('Organization Name')}</Label>
                                        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                                        <InputError message={form.errors.name} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Slug')}</Label>
                                        <Input value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} className="font-mono" />
                                        <InputError message={form.errors.slug} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('Segment')}</Label>
                                        <Select value={form.data.segment} onValueChange={(v) => form.setData('segment', v)}>
                                            <SelectTrigger><SelectValue placeholder={t('Select')} /></SelectTrigger>
                                            <SelectContent>
                                                {segments.map((seg) => (
                                                    <SelectItem key={seg} value={seg} className="capitalize">{formatSegment(seg)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={form.errors.segment} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Plan')}</Label>
                                        <Select value={form.data.plan} onValueChange={(v) => form.setData('plan', v)}>
                                            <SelectTrigger><SelectValue placeholder={t('Select')} /></SelectTrigger>
                                            <SelectContent>
                                                {PLANS.map((p) => (
                                                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={form.errors.plan} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Timezone')}</Label>
                                    <TimezoneSelect timezones={timezones} value={form.data.default_timezone} onValueChange={(v) => form.setData('default_timezone', v)} />
                                    <InputError message={form.errors.default_timezone} />
                                </div>
                            </CardContent>
                        </Card>
                    </FadeIn>

                    {/* ── BRANDING ── */}
                    <FadeIn delay={100} duration={400}>
                        <SectionDivider label={t('Branding')} />
                        <Card className="border-border shadow-none">
                            <CardContent className="space-y-5">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('Primary Color')}</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={form.data.branding.primary_color || '#3B82F6'}
                                                onChange={(e) => form.setData('branding', { ...form.data.branding, primary_color: e.target.value })}
                                                className="h-9 w-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                                            />
                                            <Input
                                                value={form.data.branding.primary_color}
                                                onChange={(e) => form.setData('branding', { ...form.data.branding, primary_color: e.target.value })}
                                                placeholder="#3B82F6"
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Secondary Color')}</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={form.data.branding.secondary_color || '#6366F1'}
                                                onChange={(e) => form.setData('branding', { ...form.data.branding, secondary_color: e.target.value })}
                                                className="h-9 w-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                                            />
                                            <Input
                                                value={form.data.branding.secondary_color}
                                                onChange={(e) => form.setData('branding', { ...form.data.branding, secondary_color: e.target.value })}
                                                placeholder="#6366F1"
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Accent Color')}</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={form.data.branding.accent_color || '#10B981'}
                                                onChange={(e) => form.setData('branding', { ...form.data.branding, accent_color: e.target.value })}
                                                className="h-9 w-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                                            />
                                            <Input
                                                value={form.data.branding.accent_color}
                                                onChange={(e) => form.setData('branding', { ...form.data.branding, accent_color: e.target.value })}
                                                placeholder="#10B981"
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('Logo URL')}</Label>
                                    <Input
                                        value={form.data.logo}
                                        onChange={(e) => form.setData('logo', e.target.value)}
                                        placeholder="https://example.com/logo.png"
                                        className="font-mono text-xs"
                                    />
                                    <p className="text-[10px] text-muted-foreground/50">{t('Enter a URL to your organization logo image.')}</p>
                                    <InputError message={form.errors.logo} />
                                </div>
                                {/* Preview */}
                                {(form.data.branding.primary_color || form.data.branding.secondary_color || form.data.branding.accent_color || form.data.logo) && (
                                    <div className="rounded-lg border border-border/50 bg-accent/20 p-4">
                                        <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">{t('Preview')}</p>
                                        <div className="flex items-center gap-4">
                                            {form.data.logo && (
                                                <img src={form.data.logo} alt="" className="h-10 w-10 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            )}
                                            <div className="flex gap-2">
                                                {form.data.branding.primary_color && <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: form.data.branding.primary_color }} title={t('Primary')} />}
                                                {form.data.branding.secondary_color && <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: form.data.branding.secondary_color }} title={t('Secondary')} />}
                                                {form.data.branding.accent_color && <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: form.data.branding.accent_color }} title={t('Accent')} />}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </FadeIn>

                    {/* Actions */}
                    <FadeIn delay={150} duration={400}>
                        <div className="mt-6 flex items-center gap-3">
                            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.processing}>
                                {form.processing ? t('Saving...') : t('Save Changes')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.get(`/settings/organizations/${organization.id}`)}>
                                {t('Cancel')}
                            </Button>
                            {form.isDirty && (
                                <span className="text-[11px] text-muted-foreground">{t('You have unsaved changes.')}</span>
                            )}
                        </div>
                    </FadeIn>
                </form>
            </div>
        </AppLayout>
    );
}

/* -- Section Divider -------------------------------------------------- */

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border/50" />
            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/30">{label.toUpperCase()}</span>
            <div className="h-px flex-1 bg-border/50" />
        </div>
    );
}
