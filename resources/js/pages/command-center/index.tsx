import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, CommandCenterKPIs, Organization, Site } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, Building2, Cpu, Globe, MapPin, Signal, Wrench } from 'lucide-react';

interface OrgSummary {
    id: number;
    name: string;
    slug: string;
    segment: string;
    plan: string;
    site_count: number;
    device_count: number;
    online_count: number;
    active_alerts: number;
}

interface Props {
    kpis: CommandCenterKPIs;
    organizations: OrgSummary[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Command Center', href: '/command-center' },
];

export default function CommandCenterIndex({ kpis, organizations }: Props) {
    const { t } = useLang();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Command Center')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Command Center')}</h1>
                    <p className="text-sm text-muted-foreground">{t('Global platform overview')}</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <KPICard icon={<Building2 className="h-4 w-4" />} label={t('Organizations')} value={kpis.total_organizations} />
                    <KPICard icon={<MapPin className="h-4 w-4" />} label={t('Sites')} value={kpis.total_sites} />
                    <KPICard icon={<Cpu className="h-4 w-4" />} label={t('Devices')} value={kpis.total_devices} />
                    <KPICard icon={<Signal className="h-4 w-4 text-emerald-500" />} label={t('Online')} value={kpis.online_devices} accent="emerald" />
                    <KPICard icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label={t('Active Alerts')} value={kpis.active_alerts} accent={kpis.active_alerts > 0 ? 'red' : undefined} />
                    <KPICard icon={<Wrench className="h-4 w-4 text-amber-500" />} label={t('Open WOs')} value={kpis.open_work_orders} accent={kpis.open_work_orders > 0 ? 'amber' : undefined} />
                </div>

                {/* Global health */}
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <div className="mb-1 flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('Platform Health')}</span>
                                <span className="font-bold tabular-nums">
                                    {kpis.total_devices > 0 ? Math.round((kpis.online_devices / kpis.total_devices) * 100) : 0}%
                                </span>
                            </div>
                            <Progress
                                value={kpis.total_devices > 0 ? (kpis.online_devices / kpis.total_devices) * 100 : 0}
                                size="md"
                                variant={kpis.online_devices / Math.max(kpis.total_devices, 1) > 0.8 ? 'success' : 'warning'}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Quick nav */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/command-center/alerts">{t('Alert Queue')}</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/command-center/work-orders">{t('Work Orders')}</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/command-center/devices">{t('Device Health')}</Link>
                    </Button>
                </div>

                {/* Organizations table */}
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="text-base">{t('Organizations')}</CardTitle>
                    </CardHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Organization')}</TableHead>
                                <TableHead>{t('Segment')}</TableHead>
                                <TableHead>{t('Plan')}</TableHead>
                                <TableHead>{t('Sites')}</TableHead>
                                <TableHead>{t('Devices')}</TableHead>
                                <TableHead>{t('Online')}</TableHead>
                                <TableHead>{t('Alerts')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {organizations.map((org) => {
                                const healthPct = org.device_count > 0 ? Math.round((org.online_count / org.device_count) * 100) : 0;
                                return (
                                    <TableRow key={org.id}>
                                        <TableCell className="font-medium">{org.name}</TableCell>
                                        <TableCell><Badge variant="outline">{org.segment}</Badge></TableCell>
                                        <TableCell><Badge variant="secondary">{org.plan}</Badge></TableCell>
                                        <TableCell className="tabular-nums">{org.site_count}</TableCell>
                                        <TableCell className="tabular-nums">{org.device_count}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="tabular-nums">{org.online_count}</span>
                                                <Progress value={healthPct} size="sm" variant={healthPct > 80 ? 'success' : 'warning'} className="w-12" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {org.active_alerts > 0 ? (
                                                <Badge variant="destructive">{org.active_alerts}</Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">0</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AppLayout>
    );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                {icon}
                <div>
                    <p className={`text-2xl font-bold tabular-nums ${accent ? `text-${accent}-600 dark:text-${accent}-400` : ''}`}>{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}
