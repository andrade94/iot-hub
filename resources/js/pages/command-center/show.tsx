import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
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
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.get('/command-center')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            <h1 className="text-2xl font-bold tracking-tight">{organization.name}</h1>
                            <Badge variant="outline">{organization.segment}</Badge>
                            <Badge variant="secondary">{organization.plan}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('MRR')}: {formatMXN(mrr)}
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Sites table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('Sites')} ({sites.length})
                            </CardTitle>
                        </CardHeader>
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
                                                <TableCell className="tabular-nums">{site.device_count}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="tabular-nums">{site.online_count}</span>
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
                                                        <Badge variant="destructive">{site.active_alerts}</Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">0</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Right sidebar */}
                    <div className="space-y-6">
                        {/* Active Alerts */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {t('Active Alerts')} ({recentAlerts.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {recentAlerts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{t('No active alerts')}</p>
                                ) : (
                                    recentAlerts.map((alert) => (
                                        <div key={alert.id} className="flex items-start gap-3 text-sm">
                                            <SeverityBadge severity={alert.severity} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">
                                                    {alert.data?.device_name ?? `Alert #${alert.id}`}
                                                </p>
                                                {alert.site && (
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {alert.site.name}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {timeAgo(alert.triggered_at)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Activity Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Recent Activity')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {recentActivity.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{t('No recent activity')}</p>
                                ) : (
                                    recentActivity.map((activity) => (
                                        <div key={activity.id} className="text-sm">
                                            <p className="text-foreground">{activity.description}</p>
                                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                                {activity.causer && <span>{activity.causer.name}</span>}
                                                <span>{timeAgo(activity.created_at)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
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

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatMXN(n: number): string {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MXN';
}
