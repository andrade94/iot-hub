import * as React from 'react';
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
import { ArrowLeft, Upload } from 'lucide-react';

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
            <div className="obsidian flex h-full flex-1 flex-col bg-background">

                {/* Centered container */}
                <div className="mx-auto w-full max-w-3xl px-5 py-8 md:px-8">

                    {/* Header */}
                    <FadeIn direction="down" duration={400}>
                        <button onClick={() => router.get(`/settings/organizations/${organization.id}`)} className="mb-3 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                            <ArrowLeft className="h-3 w-3" />{organization.name}
                        </button>
                        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                            {t('Edit Organization')}
                        </h1>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                            {t('Update organization profile, settings, and branding.')}
                        </p>
                    </FadeIn>

                    <form onSubmit={handleSubmit}>

                        {/* ── PROFILE ─────────────────────────────────── */}
                        <FadeIn delay={50} duration={400}>
                            <SectionDivider label={t('Profile')} />
                            <Card className="border-border shadow-none">
                                <CardContent className="space-y-6">
                                    {/* Name + Slug */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <FieldGroup label={t('Organization Name')} error={form.errors.name}>
                                            <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                                        </FieldGroup>
                                        <FieldGroup label={t('Slug')} error={form.errors.slug} hint={t('URL-safe identifier')}>
                                            <Input value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} className="font-mono text-[13px]" />
                                        </FieldGroup>
                                    </div>

                                    {/* Segment + Plan */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <FieldGroup label={t('Segment')} error={form.errors.segment}>
                                            <Select value={form.data.segment} onValueChange={(v) => form.setData('segment', v)}>
                                                <SelectTrigger><SelectValue placeholder={t('Select segment')} /></SelectTrigger>
                                                <SelectContent>
                                                    {segments.map((seg) => (
                                                        <SelectItem key={seg} value={seg} className="capitalize">{formatSegment(seg)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FieldGroup>
                                        <FieldGroup label={t('Plan')} error={form.errors.plan}>
                                            <Select value={form.data.plan} onValueChange={(v) => form.setData('plan', v)}>
                                                <SelectTrigger><SelectValue placeholder={t('Select plan')} /></SelectTrigger>
                                                <SelectContent>
                                                    {PLANS.map((p) => (
                                                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FieldGroup>
                                    </div>

                                    {/* Timezone */}
                                    <FieldGroup label={t('Default Timezone')} error={form.errors.default_timezone}>
                                        <TimezoneSelect timezones={timezones} value={form.data.default_timezone} onValueChange={(v) => form.setData('default_timezone', v)} />
                                    </FieldGroup>
                                </CardContent>
                            </Card>
                        </FadeIn>

                        {/* ── BRANDING ────────────────────────────────── */}
                        <FadeIn delay={100} duration={400}>
                            <SectionDivider label={t('Branding')} />
                            <Card className="border-border shadow-none">
                                <CardContent className="space-y-6">
                                    {/* Colors */}
                                    <div className="grid gap-6 md:grid-cols-3">
                                        <ColorField
                                            label={t('Primary Color')}
                                            value={form.data.branding.primary_color}
                                            onChange={(v) => form.setData('branding', { ...form.data.branding, primary_color: v })}
                                        />
                                        <ColorField
                                            label={t('Secondary Color')}
                                            value={form.data.branding.secondary_color}
                                            onChange={(v) => form.setData('branding', { ...form.data.branding, secondary_color: v })}
                                        />
                                        <ColorField
                                            label={t('Accent Color')}
                                            value={form.data.branding.accent_color}
                                            onChange={(v) => form.setData('branding', { ...form.data.branding, accent_color: v })}
                                        />
                                    </div>

                                    {/* Logo */}
                                    <div className="space-y-2">
                                        <Label className="text-[13px]">{t('Logo')}</Label>
                                        <LogoUpload
                                            currentLogo={form.data.logo}
                                            organizationId={organization.id}
                                            onRemove={() => {
                                                router.delete(`/settings/organizations/${organization.id}/logo`, { preserveScroll: true });
                                                form.setData('logo', '');
                                            }}
                                        />
                                        {form.errors.logo && <InputError message={form.errors.logo} />}
                                    </div>

                                    {/* Live Preview */}
                                    {(form.data.branding.primary_color || form.data.branding.secondary_color || form.data.branding.accent_color || form.data.logo) && (
                                        <div className="rounded-lg border border-border/50 bg-accent/30 p-5">
                                            <p className="mb-3 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/40">{t('Preview')}</p>
                                            <div className="flex items-center gap-5">
                                                {form.data.logo && (
                                                    <img src={form.data.logo} alt="" className="h-12 w-12 rounded-xl object-contain border border-border/50" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                )}
                                                <div className="flex gap-3">
                                                    {form.data.branding.primary_color && (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="h-10 w-10 rounded-lg border border-border/30" style={{ backgroundColor: form.data.branding.primary_color }} />
                                                            <span className="font-mono text-[8px] text-muted-foreground/40">{t('Primary')}</span>
                                                        </div>
                                                    )}
                                                    {form.data.branding.secondary_color && (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="h-10 w-10 rounded-lg border border-border/30" style={{ backgroundColor: form.data.branding.secondary_color }} />
                                                            <span className="font-mono text-[8px] text-muted-foreground/40">{t('Secondary')}</span>
                                                        </div>
                                                    )}
                                                    {form.data.branding.accent_color && (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="h-10 w-10 rounded-lg border border-border/30" style={{ backgroundColor: form.data.branding.accent_color }} />
                                                            <span className="font-mono text-[8px] text-muted-foreground/40">{t('Accent')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </FadeIn>

                        {/* ── ACTIONS ─────────────────────────────────── */}
                        <FadeIn delay={150} duration={400}>
                            <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-6">
                                <div className="flex items-center gap-3">
                                    <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.processing}>
                                        {form.processing ? t('Saving...') : t('Save Changes')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => router.get(`/settings/organizations/${organization.id}`)}>
                                        {t('Cancel')}
                                    </Button>
                                </div>
                                {form.isDirty && (
                                    <span className="text-[11px] text-amber-600 dark:text-amber-400">{t('Unsaved changes')}</span>
                                )}
                            </div>
                        </FadeIn>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}

/* -- Helpers ---------------------------------------------------------- */

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-border/50" />
            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/30">{label.toUpperCase()}</span>
            <div className="h-px flex-1 bg-border/50" />
        </div>
    );
}

function FieldGroup({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <Label className="text-[13px]">{label}</Label>
            {children}
            {hint && !error && <p className="text-[10px] text-muted-foreground/40">{hint}</p>}
            {error && <InputError message={error} />}
        </div>
    );
}

function LogoUpload({ currentLogo, organizationId, onRemove }: { currentLogo: string; organizationId: number; onRemove: () => void }) {
    const { t } = useLang();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = React.useState(false);
    const [dragOver, setDragOver] = React.useState(false);

    function handleUpload(file: File) {
        if (!file.type.startsWith('image/')) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('logo', file);

        router.post(`/settings/organizations/${organizationId}/logo`, formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setUploading(false),
        });
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
        e.target.value = '';
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleUpload(file);
    }

    return (
        <div className="flex items-start gap-5">
            {/* Drop zone / preview */}
            <div
                className={`flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-border bg-accent/30 hover:border-border/80'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-1 text-primary">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-[8px]">{t('Uploading')}</span>
                    </div>
                ) : currentLogo ? (
                    <img src={currentLogo} alt="" className="h-full w-full object-contain p-2" />
                ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground/30">
                        <Upload className="h-5 w-5" />
                        <span className="text-[8px] uppercase tracking-wider">{t('Logo')}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex-1 space-y-2 pt-1">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <Button type="button" variant="outline" size="sm" className="text-[11px]" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-1 h-3.5 w-3.5" />{currentLogo ? t('Change Logo') : t('Upload Logo')}
                </Button>
                {currentLogo && (
                    <button type="button" onClick={onRemove} className="ml-2 text-[11px] text-rose-600 dark:text-rose-400 transition-colors hover:text-rose-500">
                        {t('Remove')}
                    </button>
                )}
                <p className="text-[10px] text-muted-foreground/40">{t('PNG, JPG, SVG or WebP. Max 2MB.')}</p>
            </div>
        </div>
    );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="space-y-2">
            <Label className="text-[13px]">{label}</Label>
            <div className="flex items-center gap-2.5">
                <div className="relative">
                    <input
                        type="color"
                        value={value || '#3B82F6'}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-10 w-10 cursor-pointer appearance-none rounded-lg border border-border bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
                    />
                </div>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1 font-mono text-[13px]"
                />
            </div>
        </div>
    );
}
