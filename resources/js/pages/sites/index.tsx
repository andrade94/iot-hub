import { Can } from '@/components/Can';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { siteSchema } from '@/utils/schemas';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, ChevronRight, MapPin, Plus, Settings } from 'lucide-react';
import { useState } from 'react';

interface SiteRow {
    id: number;
    name: string;
    status: 'active' | 'inactive' | 'onboarding';
    device_count: number;
    online_count: number;
    active_alerts: number;
}

interface Props {
    sites: SiteRow[];
    timezones: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Sites', href: '/sites' },
];

const statusBadgeVariant: Record<string, 'outline-success' | 'outline-warning' | 'outline'> = {
    active: 'outline-success',
    onboarding: 'outline-warning',
    inactive: 'outline',
};

export default function SiteIndex({ sites, timezones }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Sites')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* -- Header ------------------------------------------------ */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Monitor')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Sites')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium text-foreground">{sites.length}</span>{' '}
                                    {t('sites accessible')}
                                </p>
                            </div>
                            <Can permission="manage sites">
                                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('Create Site')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle>{t('Create Site')}</DialogTitle>
                                        </DialogHeader>
                                        <CreateSiteForm
                                            timezones={timezones}
                                            onSuccess={() => setShowCreate(false)}
                                        />
                                    </DialogContent>
                                </Dialog>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* -- Sites Grid -------------------------------------------- */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sites.map((site, i) => {
                        const healthPct = site.device_count > 0
                            ? Math.round((site.online_count / site.device_count) * 100)
                            : 0;

                        return (
                            <FadeIn key={site.id} delay={i * 50} duration={400}>
                                <div
                                    className="group relative cursor-pointer rounded-xl border border-border/50 bg-card p-5 shadow-elevation-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2"
                                    onClick={() => router.get(`/sites/${site.id}`)}
                                >
                                    {/* Settings gear — admin only */}
                                    <Can permission="manage sites">
                                        <button
                                            type="button"
                                            className="absolute right-2.5 top-2.5 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.get('/settings/sites');
                                            }}
                                            title={t('Site settings')}
                                        >
                                            <Settings className="h-3.5 w-3.5" />
                                        </button>
                                    </Can>

                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold leading-tight">{site.name}</h3>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    <span className="font-mono tabular-nums">{site.device_count}</span> {t('device(s)')}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={statusBadgeVariant[site.status] ?? 'outline'}>
                                            {site.status}
                                        </Badge>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{t('online')}</span>
                                            <span className="font-mono font-semibold tabular-nums">
                                                {site.online_count}/{site.device_count}
                                                {site.device_count > 0 && (
                                                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                                        ({healthPct}%)
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        {site.device_count > 0 && (
                                            <Progress
                                                value={healthPct}
                                                size="sm"
                                                variant={healthPct > 80 ? 'success' : healthPct > 50 ? 'warning' : 'destructive'}
                                            />
                                        )}
                                    </div>

                                    {site.active_alerts > 0 && (
                                        <div className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
                                            <AlertTriangle className="h-3 w-3" />
                                            <span className="font-mono tabular-nums">{site.active_alerts}</span> {t('active alert(s)')}
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                        {t('View site')} <ChevronRight className="ml-0.5 h-3 w-3" />
                                    </div>
                                </div>
                            </FadeIn>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}

/* -- Create Site Form --------------------------------------------------- */

function CreateSiteForm({
    timezones,
    onSuccess,
}: {
    timezones: string[];
    onSuccess: () => void;
}) {
    const { t } = useLang();

    const form = useValidatedForm(siteSchema, {
        name: '',
        address: '',
        latitude: '' as string | number,
        longitude: '' as string | number,
        timezone: '',
        opening_hour: '',
        status: 'draft',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.validate()) return;
        form.post('/settings/sites', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onSuccess();
            },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>{t('Name')}</Label>
                <Input
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder={t('Site name')}
                    required
                />
                <InputError message={form.errors.name} />
            </div>

            <div className="grid gap-2">
                <Label>{t('Address')}</Label>
                <Input
                    value={form.data.address ?? ''}
                    onChange={(e) => form.setData('address', e.target.value)}
                    placeholder={t('Street address')}
                />
                <InputError message={form.errors.address} />
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
                    <Input
                        type="time"
                        value={form.data.opening_hour ?? ''}
                        onChange={(e) => form.setData('opening_hour', e.target.value)}
                        className="font-mono tabular-nums"
                    />
                    <InputError message={form.errors.opening_hour} />
                </div>
            </div>

            <DialogFooter>
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? t('Creating...') : t('Create Site')}
                </Button>
            </DialogFooter>
        </form>
    );
}

export function SiteIndexSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-8 w-24" />
                <Skeleton className="mt-2 h-4 w-32" />
            </div>
            {/* Sites Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-5 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                                <Skeleton className="h-8 w-8 rounded-lg" />
                                <div>
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="mt-1 h-3 w-16" />
                                </div>
                            </div>
                            <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-1.5 w-full rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
