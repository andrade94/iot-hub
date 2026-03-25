import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Activity, CheckCircle, Globe, MessageSquare, Radio, Send, XCircle } from 'lucide-react';

interface ServiceStatus {
    name: string;
    slug: string;
    status: 'operational' | 'degraded' | 'down';
    description: string;
}

interface Props {
    services: ServiceStatus[];
    checkedAt: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Platform Status', href: '/status' },
];

const SERVICE_ICONS: Record<string, React.ReactNode> = {
    web_app: <Globe className="h-5 w-5" />,
    mobile_api: <Radio className="h-5 w-5" />,
    mqtt_pipeline: <Activity className="h-5 w-5" />,
    whatsapp: <MessageSquare className="h-5 w-5" />,
    push_notifications: <Send className="h-5 w-5" />,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; badgeVariant: 'success' | 'warning' | 'destructive' }> = {
    operational: {
        label: 'Operational',
        color: 'text-emerald-600 dark:text-emerald-400',
        icon: <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
        badgeVariant: 'success',
    },
    degraded: {
        label: 'Degraded',
        color: 'text-amber-600 dark:text-amber-400',
        icon: <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
        badgeVariant: 'warning',
    },
    down: {
        label: 'Down',
        color: 'text-red-600 dark:text-red-400',
        icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
        badgeVariant: 'destructive',
    },
};

export default function StatusPage({ services, checkedAt }: Props) {
    const { t } = useLang();
    const allOperational = services.every((s) => s.status === 'operational');
    const hasDegraded = services.some((s) => s.status === 'degraded');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Platform Status')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div className="flex items-start gap-3">
                                {allOperational ? (
                                    <CheckCircle className="mt-1 h-6 w-6 text-emerald-600" />
                                ) : hasDegraded ? (
                                    <Activity className="mt-1 h-6 w-6 text-amber-600" />
                                ) : (
                                    <XCircle className="mt-1 h-6 w-6 text-red-600" />
                                )}
                                <div>
                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Platform Status')}
                                    </p>
                                    <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                        {allOperational
                                            ? t('All Systems Operational')
                                            : hasDegraded
                                              ? t('Some Systems Degraded')
                                              : t('Service Disruption Detected')}
                                    </h1>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {t('Last checked')}{' '}
                                        <span className="font-mono tabular-nums">
                                            {new Date(checkedAt).toLocaleString()}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <Badge variant={allOperational ? 'success' : hasDegraded ? 'warning' : 'destructive'}>
                                {allOperational ? t('All OK') : hasDegraded ? t('Degraded') : t('Issues')}
                            </Badge>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Service Cards ────────────────────────────────── */}
                <div className="mb-3 flex items-center gap-3">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        {t('Services')}
                    </p>
                    <div className="h-px flex-1 bg-border" />
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {services.filter((s) => s.status === 'operational').length}/{services.length} {t('operational')}
                    </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service, i) => {
                        const config = STATUS_CONFIG[service.status];
                        return (
                            <FadeIn key={service.slug} delay={100 + i * 60} duration={400}>
                                <Card className="shadow-elevation-1 transition-shadow hover:shadow-elevation-2">
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                                                    {SERVICE_ICONS[service.slug] ?? <Activity className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{service.name}</p>
                                                    <p className="text-xs text-muted-foreground">{service.description}</p>
                                                </div>
                                            </div>
                                            {config.icon}
                                        </div>
                                        <div className="mt-4 flex items-center gap-2">
                                            <div
                                                className={`h-2 w-2 rounded-full ${
                                                    service.status === 'operational'
                                                        ? 'bg-emerald-500'
                                                        : service.status === 'degraded'
                                                          ? 'bg-amber-500'
                                                          : 'bg-red-500'
                                                }`}
                                            />
                                            <span className={`text-sm font-medium ${config.color}`}>
                                                {t(config.label)}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </FadeIn>
                        );
                    })}
                </div>

                {/* ── Uptime note ─────────────────────────────────── */}
                <FadeIn delay={500} duration={400}>
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                            {t('Status checks run automatically. For real-time incident updates, contact')}{' '}
                            <span className="font-medium text-foreground">support@astrea.mx</span>
                        </p>
                    </div>
                </FadeIn>
            </div>
        </AppLayout>
    );
}
