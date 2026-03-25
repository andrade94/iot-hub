import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import InputError from '@/components/input-error';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, CommandCenterKPIs, SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, Building2, Cpu, Globe, Mail, MapPin, MessageSquare, Signal, Smartphone, Wrench } from 'lucide-react';
import { useState } from 'react';

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

interface DeliveryChannel {
    sent: number;
    delivered: number;
    failed: number;
}

interface Props {
    kpis: CommandCenterKPIs;
    organizations: OrgSummary[];
    deliveryHealth?: { whatsapp: DeliveryChannel; push: DeliveryChannel; email: DeliveryChannel };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Command Center', href: '/command-center' },
];

export default function CommandCenterIndex({ kpis, organizations, deliveryHealth }: Props) {
    const { t } = useLang();
    const { active_outage } = usePage<SharedData>().props;
    const [showOutageDialog, setShowOutageDialog] = useState(false);
    const outageForm = useForm({ reason: '', affected_services: [] as string[] });

    const handleDeclareOutage = (e: React.FormEvent) => {
        e.preventDefault();
        outageForm.post('/command-center/outage', {
            preserveScroll: true,
            onSuccess: () => { outageForm.reset(); setShowOutageDialog(false); },
        });
    };

    const handleToggleService = (service: string) => {
        const current = outageForm.data.affected_services;
        outageForm.setData('affected_services',
            current.includes(service) ? current.filter(s => s !== service) : [...current, service]
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Command Center')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Outage Banner */}
                {active_outage && (
                    <FadeIn direction="down" duration={300}>
                        <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                <div>
                                    <p className="font-medium text-red-800 dark:text-red-200">{t('Platform outage declared')}</p>
                                    <p className="text-sm text-red-700 dark:text-red-300">{active_outage.reason}</p>
                                </div>
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => router.delete('/command-center/outage', { preserveScroll: true })}>
                                {t('End Outage')}
                            </Button>
                        </div>
                    </FadeIn>
                )}

                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Command Center')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Platform Overview')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Global platform overview')}
                                </p>
                            </div>
                            {!active_outage && (
                                <Button variant="destructive" size="sm" onClick={() => setShowOutageDialog(true)}>
                                    {t('Declare Outage')}
                                </Button>
                            )}
                        </div>
                    </div>
                </FadeIn>

                {/* ── KPI Cards ───────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <FadeIn delay={75} duration={400}>
                        <KPICard icon={<Building2 className="h-4 w-4" />} label={t('Organizations')} value={kpis.total_organizations} />
                    </FadeIn>
                    <FadeIn delay={150} duration={400}>
                        <KPICard icon={<MapPin className="h-4 w-4" />} label={t('Sites')} value={kpis.total_sites} />
                    </FadeIn>
                    <FadeIn delay={225} duration={400}>
                        <KPICard icon={<Cpu className="h-4 w-4" />} label={t('Devices')} value={kpis.total_devices} />
                    </FadeIn>
                    <FadeIn delay={300} duration={400}>
                        <KPICard icon={<Signal className="h-4 w-4 text-emerald-500" />} label={t('Online')} value={kpis.online_devices} accent="emerald" />
                    </FadeIn>
                    <FadeIn delay={375} duration={400}>
                        <KPICard icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label={t('Active Alerts')} value={kpis.active_alerts} accent={kpis.active_alerts > 0 ? 'red' : undefined} />
                    </FadeIn>
                    <FadeIn delay={450} duration={400}>
                        <KPICard icon={<Wrench className="h-4 w-4 text-amber-500" />} label={t('Open WOs')} value={kpis.open_work_orders} accent={kpis.open_work_orders > 0 ? 'amber' : undefined} />
                    </FadeIn>
                </div>

                {/* ── Global Health ───────────────────────────────── */}
                <FadeIn delay={525} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="flex items-center gap-4 p-4">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t('Platform Health')}</span>
                                    <span className="font-mono font-bold tabular-nums">
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
                </FadeIn>

                {/* ── Quick Nav ───────────────────────────────────── */}
                <FadeIn delay={600} duration={400}>
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
                </FadeIn>

                {/* ── Organizations ───────────────────────────────── */}
                <FadeIn delay={675} duration={400}>
                    <div className="mb-2 flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Organizations')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>
                <FadeIn delay={750} duration={400}>
                    <Card className="flex-1 shadow-elevation-1">
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
                                {organizations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-0">
                                            <EmptyState
                                                size="sm"
                                                variant="muted"
                                                className="border-0"
                                                icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
                                                title={t('No organizations')}
                                                description={t('Create your first organization from the Partner Portal')}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                                {organizations.map((org) => {
                                    const healthPct = org.device_count > 0 ? Math.round((org.online_count / org.device_count) * 100) : 0;
                                    return (
                                        <TableRow key={org.id}>
                                            <TableCell className="font-medium">{org.name}</TableCell>
                                            <TableCell><Badge variant="outline">{org.segment}</Badge></TableCell>
                                            <TableCell><Badge variant="secondary">{org.plan}</Badge></TableCell>
                                            <TableCell className="font-mono tabular-nums">{org.site_count}</TableCell>
                                            <TableCell className="font-mono tabular-nums">{org.device_count}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono tabular-nums">{org.online_count}</span>
                                                    <Progress value={healthPct} size="sm" variant={healthPct > 80 ? 'success' : 'warning'} className="w-12" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {org.active_alerts > 0 ? (
                                                    <Badge variant="destructive" className="font-mono tabular-nums">{org.active_alerts}</Badge>
                                                ) : (
                                                    <span className="font-mono text-xs tabular-nums text-muted-foreground">0</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                </FadeIn>

                {/* ── Delivery Health (Phase 10) ──────────────────── */}
                {deliveryHealth && (
                    <FadeIn delay={825} duration={400}>
                        <div className="mb-2 flex items-center gap-3">
                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Delivery Health')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <DeliveryCard icon={<MessageSquare className="h-4 w-4 text-emerald-500" />} label="WhatsApp" data={deliveryHealth.whatsapp} />
                            <DeliveryCard icon={<Smartphone className="h-4 w-4 text-blue-500" />} label="Push" data={deliveryHealth.push} />
                            <DeliveryCard icon={<Mail className="h-4 w-4 text-amber-500" />} label="Email" data={deliveryHealth.email} />
                        </div>
                    </FadeIn>
                )}

                {/* Outage Declaration Dialog */}
                <Dialog open={showOutageDialog} onOpenChange={setShowOutageDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('Declare Platform Outage')}</DialogTitle>
                            <DialogDescription>{t('This will suppress ALL offline alerts platform-wide.')}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleDeclareOutage} className="space-y-4">
                            <div className="grid gap-2">
                                <Label>{t('Reason')}</Label>
                                <Textarea
                                    value={outageForm.data.reason}
                                    onChange={e => outageForm.setData('reason', e.target.value)}
                                    placeholder={t('Describe the outage...')}
                                    rows={3}
                                />
                                <InputError message={outageForm.errors.reason} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Affected Services')}</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['chirpstack', 'twilio', 'mqtt', 'redis', 'database', 'other'].map(svc => (
                                        <Button
                                            key={svc}
                                            type="button"
                                            size="sm"
                                            variant={outageForm.data.affected_services.includes(svc) ? 'default' : 'outline'}
                                            onClick={() => handleToggleService(svc)}
                                        >
                                            {svc}
                                        </Button>
                                    ))}
                                </div>
                                <InputError message={outageForm.errors.affected_services} />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setShowOutageDialog(false)}>{t('Cancel')}</Button>
                                <Button type="submit" variant="destructive" disabled={outageForm.processing}>{t('Declare Outage')}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

function DeliveryCard({ icon, label, data }: { icon: React.ReactNode; label: string; data: { sent: number; delivered: number; failed: number } }) {
    return (
        <Card className="shadow-elevation-1">
            <CardContent className="flex items-center gap-3 p-4">
                {icon}
                <div className="flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                        <span><span className="font-mono tabular-nums">{data.sent}</span> sent</span>
                        <span className="text-emerald-600"><span className="font-mono tabular-nums">{data.delivered}</span> delivered</span>
                        {data.failed > 0 && <span className="text-red-600"><span className="font-mono tabular-nums">{data.failed}</span> failed</span>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
    return (
        <Card className="shadow-elevation-1">
            <CardContent className="flex items-center gap-3 p-4">
                {icon}
                <div>
                    <p className={`font-mono text-2xl font-bold tabular-nums ${accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : accent === 'red' ? 'text-red-600 dark:text-red-400' : accent === 'amber' ? 'text-amber-600 dark:text-amber-400' : ''}`}>{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export function CommandCenterSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                <div className="p-6 md:p-8">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="mt-2 h-9 w-56" />
                    <Skeleton className="mt-2 h-4 w-40" />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="shadow-elevation-1">
                        <CardContent className="flex items-center gap-3 p-4">
                            <Skeleton className="h-4 w-4 rounded" />
                            <div className="space-y-1">
                                <Skeleton className="h-7 w-12" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Health bar */}
            <Card className="shadow-elevation-1">
                <CardContent className="flex items-center gap-4 p-4">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-10" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                    </div>
                </CardContent>
            </Card>

            {/* Quick nav */}
            <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-28" />
            </div>

            {/* Section divider */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <div className="h-px flex-1 bg-border" />
            </div>

            {/* Organizations table */}
            <Card className="flex-1 shadow-elevation-1">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-3 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-16" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-12" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-10" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-12" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-8" />
                                        <Skeleton className="h-1.5 w-12" />
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
