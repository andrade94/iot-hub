import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { formatMXN } from '@/utils/formatters';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Bell, Building2, ShieldAlert } from 'lucide-react';

interface OrgSite {
    id: number;
    name: string;
    status: string;
    device_count: number;
    online_count: number;
    active_alerts: number;
}

interface Props {
    organization: { id: number; name: string; slug: string; segment: string; plan: string; created_at: string };
    sites: OrgSite[];
    recentAlerts: {
        id: number;
        severity: string;
        status: string;
        triggered_at: string;
        data: { device_name?: string; metric?: string; value?: number };
        site?: { name: string };
    }[];
    recentActivity: { id: number; description: string; created_at: string; causer?: { name: string } }[];
    mrr: number;
}

export default function CommandCenterShow({ organization, sites, recentAlerts, recentActivity, mrr }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Command Center', href: '/command-center' },
        { title: organization.name, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${organization.name} — ${t('Command Center')}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start gap-4 p-6 md:p-8">
                            <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => router.get('/command-center')}>
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
                                    <Badge variant="outline">{organization.segment}</Badge>
                                    <Badge variant="secondary">{organization.plan}</Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('MRR')}: <span className="font-mono tabular-nums">{formatMXN(mrr)}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* ── Sites Table ─────────────────────────────── */}
                    <div className="space-y-4">
                        <FadeIn delay={75} duration={400}>
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Sites')} (<span className="font-mono tabular-nums">{sites.length}</span>)
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                        </FadeIn>
                        <FadeIn delay={150} duration={400}>
                            <Card className="shadow-elevation-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Devices')}</TableHead>
                                            <TableHead>{t('Online')}</TableHead>
                                            <TableHead>{t('Alerts')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sites.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-12 text-center">
                                                    <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                        {t('No sites configured')}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            sites.map((site) => {
                                                const healthPct = site.device_count > 0
                                                    ? Math.round((site.online_count / site.device_count) * 100)
                                                    : 0;
                                                return (
                                                    <TableRow
                                                        key={site.id}
                                                        className="cursor-pointer"
                                                        onClick={() => router.get(`/sites/${site.id}`)}
                                                    >
                                                        <TableCell className="font-medium">{site.name}</TableCell>
                                                        <TableCell>
                                                            <SiteStatusBadge status={site.status} />
                                                        </TableCell>
                                                        <TableCell className="font-mono tabular-nums">{site.device_count}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono tabular-nums">{site.online_count}</span>
                                                                {site.device_count > 0 && (
                                                                    <Progress
                                                                        value={healthPct}
                                                                        size="sm"
                                                                        variant={healthPct > 80 ? 'success' : 'warning'}
                                                                        className="w-12"
                                                                    />
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {site.active_alerts > 0 ? (
                                                                <Badge variant="destructive" className="font-mono tabular-nums">{site.active_alerts}</Badge>
                                                            ) : (
                                                                <span className="font-mono text-xs tabular-nums text-muted-foreground">0</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </FadeIn>
                    </div>

                    {/* ── Right Sidebar ───────────────────────────── */}
                    <div className="space-y-6">
                        {/* Active Alerts */}
                        <FadeIn delay={225} duration={400}>
                            <div className="mb-3 flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Active Alerts')} (<span className="font-mono tabular-nums">{recentAlerts.length}</span>)
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <Card className="shadow-elevation-1">
                                <CardContent className="space-y-3 p-4">
                                    {recentAlerts.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">{t('No active alerts')}</p>
                                    ) : (
                                        recentAlerts.map((alert) => (
                                            <div key={alert.id} className="flex items-start gap-3 text-sm">
                                                <SeverityBadge severity={alert.severity} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium">
                                                        {alert.data?.device_name ?? `Alert #${alert.id}`}
                                                    </p>
                                                    {alert.site && (
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {alert.site.name}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                                                    {formatTimeAgo(alert.triggered_at)}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </FadeIn>

                        {/* Activity Timeline */}
                        <FadeIn delay={300} duration={400}>
                            <div className="mb-3 flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Recent Activity')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <Card className="shadow-elevation-1">
                                <CardContent className="space-y-3 p-4">
                                    {recentActivity.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">{t('No recent activity')}</p>
                                    ) : (
                                        recentActivity.map((activity) => (
                                            <div key={activity.id} className="text-sm">
                                                <p className="text-foreground">{activity.description}</p>
                                                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                                    {activity.causer && <span>{activity.causer.name}</span>}
                                                    <span className="font-mono tabular-nums">{formatTimeAgo(activity.created_at)}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </FadeIn>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function SiteStatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'warning' | 'outline'> = {
        active: 'success',
        onboarding: 'warning',
    };
    return <Badge variant={variants[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
    const config: Record<string, { variant: 'destructive' | 'warning' | 'outline'; icon: typeof ShieldAlert }> = {
        critical: { variant: 'destructive', icon: ShieldAlert },
        high: { variant: 'warning', icon: AlertTriangle },
        medium: { variant: 'outline', icon: Bell },
    };
    const { variant, icon: Icon } = config[severity] ?? config.medium;
    return (
        <Badge variant={variant} className="shrink-0 gap-1 text-xs">
            <Icon className="h-3 w-3" />
            {severity}
        </Badge>
    );
}
