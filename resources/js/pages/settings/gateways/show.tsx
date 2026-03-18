import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device, Gateway, Site } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Cpu, Router, Signal, WifiOff } from 'lucide-react';

interface Props {
    site: Site;
    gateway: Gateway;
}

export default function GatewayShow({ site, gateway }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Gateways', href: `/sites/${site.id}/gateways` },
        { title: gateway.model, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${gateway.model} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.get(`/sites/${site.id}/gateways`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <Router className="h-5 w-5 text-muted-foreground" />
                            <h1 className="text-2xl font-bold tracking-tight">{gateway.model}</h1>
                            <GatewayStatusBadge status={gateway.status} />
                            {gateway.is_addon && <Badge variant="secondary">{t('Add-on')}</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{gateway.serial}</p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Devices table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('Connected Devices')} ({gateway.devices?.length ?? 0})
                            </CardTitle>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Device')}</TableHead>
                                    <TableHead>{t('Model')}</TableHead>
                                    <TableHead>{t('Zone')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead>{t('Last Seen')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!gateway.devices || gateway.devices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-12 text-center">
                                            <Cpu className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {t('No devices connected to this gateway')}
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    gateway.devices.map((device) => (
                                        <TableRow
                                            key={device.id}
                                            className="cursor-pointer"
                                            onClick={() => router.get(`/sites/${site.id}/devices/${device.id}`)}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <OnlineIndicator online={isOnline(device)} />
                                                    <span className="font-medium">{device.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs">{device.model}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{device.zone || '—'}</TableCell>
                                            <TableCell>
                                                <DeviceStatusBadge status={device.status} />
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {device.last_reading_at ? formatTimeAgo(device.last_reading_at) : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Gateway details sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Details')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <DetailRow label={t('Model')} value={gateway.model} />
                                <DetailRow label={t('Serial')} value={gateway.serial} />
                                <DetailRow label={t('Status')} value={gateway.status} />
                                <DetailRow label={t('Type')} value={gateway.is_addon ? t('Add-on') : t('Primary')} />
                                {gateway.chirpstack_id && (
                                    <DetailRow label={t('ChirpStack ID')} value={gateway.chirpstack_id} />
                                )}
                                <DetailRow
                                    label={t('Last Seen')}
                                    value={gateway.last_seen_at ? new Date(gateway.last_seen_at).toLocaleString() : '—'}
                                />
                                <DetailRow
                                    label={t('Registered')}
                                    value={new Date(gateway.created_at).toLocaleDateString()}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function GatewayStatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'destructive' | 'outline'> = {
        online: 'success',
        offline: 'destructive',
        registered: 'outline',
    };
    return <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>;
}

function OnlineIndicator({ online }: { online: boolean }) {
    return (
        <span
            className={`h-2 w-2 shrink-0 rounded-full ${
                online ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
        />
    );
}

function DeviceStatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
        active: 'success',
        provisioned: 'info',
        pending: 'warning',
        offline: 'destructive',
        maintenance: 'outline',
    };
    return <Badge variant={variants[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}

function isOnline(device: Device): boolean {
    if (!device.last_reading_at) return false;
    return Date.now() - new Date(device.last_reading_at).getTime() < 15 * 60 * 1000;
}

function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
